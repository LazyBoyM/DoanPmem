const bcrypt = require('bcryptjs');
const { endpoint, fail } = require('../services/store');
const { integer, text, dateTime, requireRow, hasGrade, classesWithDetails, validateSchedules, validateClassConflicts } = require('../services/academic');
const ok = message => ({ message });
async function unique(store, table, key, value, except) {
    if ((await store.list(table)).some(row => row.id !== except && String(row[key]).toLowerCase() === String(value).toLowerCase())) fail(`${key} đã được sử dụng.`, 409);
}
function email(value) {
    const result = text(value, 'email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('Email không hợp lệ.');
    return result;
}
async function profileFields(store, body, student, current = {}) {
    const merged = { ...current, ...body };
    const data = { full_name: text(merged.full_name, 'họ tên'), phone: String(merged.phone ?? '') };
    if (student) {
        data.program_id = (await requireRow(store, 'programs', merged.program_id, 'Chương trình')).id;
        data.class_name = text(merged.class_name, 'lớp sinh hoạt');
        data.academic_year = text(merged.academic_year ?? 'K74', 'khóa học');
        data.gender = merged.gender ?? 'Nam';
        if (!['Nam', 'Nữ'].includes(data.gender)) fail('Giới tính không hợp lệ.');
        data.birth_date = merged.birth_date || null;
        if (data.birth_date && !Number.isFinite(dateTime(data.birth_date).getTime())) fail('Ngày sinh không hợp lệ.');
        data.address = String(merged.address ?? '');
    } else {
        data.department_id = (await requireRow(store, 'departments', merged.department_id, 'Khoa')).id;
        data.degree = text(merged.degree ?? 'Thạc sĩ', 'học vị');
    }
    return data;
}
function createProfile(student) {
    return endpoint(async (req, store) => {
        const table = student ? 'students' : 'lecturers';
        const codeKey = student ? 'student_code' : 'lecturer_code';
        const code = text(req.body[codeKey], 'mã hồ sơ').toUpperCase();
        const username = code.toLowerCase();
        const address = email(req.body.email || `${username}@${student ? 'sinhvien.' : ''}edu.vn`);
        await unique(store, table, codeKey, code);
        const existingUser = (await store.list('users')).find(u => u.username.toLowerCase() === username);
        if (existingUser && (existingUser.role !== (student ? 'STUDENT' : 'LECTURER') || (await store.one(table, { user_id: existingUser.id })))) fail('Tên đăng nhập đã được sử dụng.', 409);
        await unique(store, 'users', 'email', address, existingUser?.id);
        const fields = await profileFields(store, req.body, student);
        const password = await bcrypt.hash(req.body.password || '123456', 10);
        const account = { username, password, email: address, role: student ? 'STUDENT' : 'LECTURER', status: 1 };
        const user = existingUser || await store.insert('users', account);
        if (existingUser) await store.update('users', user.id, account);
        const data = await store.insert(table, { ...fields, [codeKey]: code, user_id: user.id });
        return { data, message: 'Đã tạo hồ sơ và tài khoản.' };
    }, true);
}
function updateProfile(student) {
    return endpoint(async (req, store) => {
        const table = student ? 'students' : 'lecturers';
        const current = await requireRow(store, table, req.params.id, 'Hồ sơ');
        const fields = await profileFields(store, req.body, student, current);
        if (req.body.email !== undefined) {
            const address = email(req.body.email);
            await unique(store, 'users', 'email', address, current.user_id);
            await store.update('users', current.user_id, { email: address });
        }
        await store.update(table, current.id, fields);
        return { data: { ...current, ...fields }, message: 'Đã cập nhật đầy đủ hồ sơ.' };
    }, true);
}
function deleteProfile(student) {
    return endpoint(async (req, store) => {
        const table = student ? 'students' : 'lecturers';
        const row = await requireRow(store, table, req.params.id, 'Hồ sơ');
        if (student) {
            for (const e of await store.list('enrollments', { student_id: row.id })) {
                const cls = await requireRow(store, 'course_classes', e.course_class_id);
                if (e.status === 'ENROLLED') await store.update('course_classes', cls.id, { current_students: Math.max(0, cls.current_students - 1) });
                await store.remove('grades', { enrollment_id: e.id });
                await store.remove('enrollments', { id: e.id });
            }
        } else {
            for (const cls of await store.list('course_classes', { lecturer_id: row.id })) await store.update('course_classes', cls.id, { lecturer_id: null });
        }
        await store.remove(table, { id: row.id });
        await store.remove('users', { id: row.user_id });
        return ok('Đã xóa hồ sơ và cập nhật dữ liệu liên quan.');
    }, true);
}
const getAllStudents = endpoint(async (_req, store) => {
    const users = await store.list('users'), programs = await store.list('programs');
    return { data: (await store.list('students')).map(s => {
        const user = users.find(u => u.id === s.user_id);
        return { ...s, username: user?.username, email: user?.email, status: user?.status, program_name: programs.find(p => p.id === s.program_id)?.program_name };
    }) };
});
const getAllLecturers = endpoint(async (_req, store) => {
    const users = await store.list('users'), departments = await store.list('departments');
    return { data: (await store.list('lecturers')).map(l => {
        const user = users.find(u => u.id === l.user_id);
        return { ...l, username: user?.username, email: user?.email, status: user?.status, department_name: departments.find(d => d.id === l.department_id)?.department_name };
    }) };
});
const getAllUsers = endpoint(async (_req, store) => ({ data: (await store.list('users')).filter(u => u.role !== 'ADMIN').map(({ password, ...u }) => u) }));
// A profile is required: standalone accounts are intentionally not created.
const createUser = endpoint(async () => { fail('Hãy tạo tài khoản cùng hồ sơ tại Quản lý sinh viên hoặc Quản lý giảng viên.'); });
const toggleUserStatus = endpoint(async (req, store) => {
    const user = await requireRow(store, 'users', req.params.id, 'Tài khoản');
    if (user.id === req.user.id || user.role === 'ADMIN') fail('Không thể khóa tài khoản quản trị viên.');
    const requested = req.body?.status;
    const status = requested === undefined ? (user.status === 1 ? 0 : 1) : ({ ACTIVE: 1, LOCKED: 0, 0: 0, 1: 1 })[requested];
    if (status === undefined) fail('Trạng thái không hợp lệ.');
    await store.update('users', user.id, { status });
    return { status, message: status ? 'Đã mở tài khoản.' : 'Đã khóa tài khoản.' };
}, true);
const resetUserPassword = endpoint(async (req, store) => {
    const user = await requireRow(store, 'users', req.params.id, 'Tài khoản');
    await store.update('users', user.id, { password: await bcrypt.hash(req.body?.password || '123456', 10) });
    return ok('Đã đặt lại mật khẩu.');
}, true);
const getDashboardStats = endpoint(async (_req, store) => {
    const stats = {};
    for (const [key, table] of Object.entries({ total_users: 'users', total_students: 'students', total_lecturers: 'lecturers', total_subjects: 'subjects', total_classes: 'course_classes' })) stats[key] = (await store.list(table)).length;
    stats.total_enrollments = (await store.list('enrollments', { status: 'ENROLLED' })).length;
    return { stats };
});
const getAllDepartments = endpoint(async (_req, store) => ({ data: await store.list('departments') }));
const getAllSubjects = endpoint(async (_req, store) => {
    const subjects = await store.list('subjects'), departments = await store.list('departments'), prerequisites = await store.list('prerequisites');
    return { data: subjects.map(s => ({ ...s, department_name: departments.find(d => d.id === s.department_id)?.department_name,
        prerequisites: prerequisites.filter(p => p.subject_id === s.id).map(p => subjects.find(other => other.id === p.prerequisite_subject_id)?.subject_name).filter(Boolean) })) };
});
async function subjectFields(store, body) {
    return { subject_name: text(body.subject_name, 'tên môn'), credits: integer(body.credits ?? 3, 'Tín chỉ', 1, 24),
        theory_periods: integer(body.theory_periods ?? 30, 'Tiết lý thuyết', 0, 500), practice_periods: integer(body.practice_periods ?? 15, 'Tiết thực hành', 0, 500),
        department_id: (await requireRow(store, 'departments', body.department_id, 'Khoa')).id };
}
const createSubject = endpoint(async (req, store) => {
    const subject_code = text(req.body.subject_code, 'mã môn').toUpperCase();
    await unique(store, 'subjects', 'subject_code', subject_code);
    const fields = await subjectFields(store, req.body);
    if (req.body.prerequisite_id) await requireRow(store, 'subjects', req.body.prerequisite_id, 'Môn tiên quyết');
    const data = await store.insert('subjects', { subject_code, ...fields });
    if (req.body.prerequisite_id) await store.insert('prerequisites', { subject_id: data.id, prerequisite_subject_id: Number(req.body.prerequisite_id), min_grade_required: 4 });
    return { data, message: 'Đã tạo môn học.' };
}, true);
const updateSubject = endpoint(async (req, store) => {
    const current = await requireRow(store, 'subjects', req.params.id, 'Môn học');
    await store.update('subjects', current.id, await subjectFields(store, { ...current, ...req.body }));
    return ok('Đã cập nhật môn học.');
}, true);
const deleteSubject = endpoint(async (req, store) => {
    const subject = await requireRow(store, 'subjects', req.params.id, 'Môn học');
    if ((await store.list('course_classes', { subject_id: subject.id })).length) fail('Môn học đã được sử dụng trong lớp học phần.', 409);
    await store.remove('prerequisites', { subject_id: subject.id });
    await store.remove('prerequisites', { prerequisite_subject_id: subject.id });
    await store.remove('subjects', { id: subject.id });
    return ok('Đã xóa môn học.');
}, true);
const getPrograms = endpoint(async (_req, store) => {
    const departments = await store.list('departments'), students = await store.list('students');
    return { data: (await store.list('programs')).map(p => ({ ...p, department_name: departments.find(d => d.id === p.department_id)?.department_name,
        total_students: students.filter(s => s.program_id === p.id).length })) };
});
const createProgram = endpoint(async (req, store) => {
    const b = req.body, program_code = text(b.program_code, 'mã chương trình');
    await unique(store, 'programs', 'program_code', program_code);
    const duration = Number(b.duration_years ?? 4);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 10) fail('Thời gian đào tạo không hợp lệ.');
    const data = await store.insert('programs', { program_code, program_name: text(b.program_name, 'tên chương trình'),
        department_id: (await requireRow(store, 'departments', b.department_id, 'Khoa')).id,
        total_credits: integer(b.total_credits ?? 135, 'Tổng tín chỉ', 1, 500), duration_years: duration });
    return { data, message: 'Đã tạo chương trình.' };
}, true);
const getSemesters = endpoint(async (_req, store) => ({ data: (await store.list('semesters')).sort((a,b) => b.id-a.id) }));
const createSemester = endpoint(async (req, store) => {
    const b = req.body, semester_code = text(b.semester_code, 'mã học kỳ');
    await unique(store, 'semesters', 'semester_code', semester_code);
    if (!(dateTime(b.start_date) < dateTime(b.end_date))) fail('Ngày bắt đầu phải trước ngày kết thúc.');
    const data = await store.insert('semesters', { semester_code, semester_name: text(b.semester_name, 'tên học kỳ'), academic_year: text(b.academic_year, 'năm học'),
        start_date: b.start_date, end_date: b.end_date, is_active: 0 });
    return { data, message: 'Đã tạo học kỳ. Chọn Kích hoạt để sử dụng.' };
}, true);
const setActiveSemester = endpoint(async (req, store) => {
    // Activating a semester changes the whole active set; serialize this rare operation.
    const semesters = await store.list('semesters', {}, { lock: true });
    const id = integer(req.params.id, 'Học kỳ');
    if (!semesters.some(s => s.id === id)) fail('Học kỳ không tồn tại.', 404);
    for (const s of semesters) await store.update('semesters', s.id, { is_active: s.id === id ? 1 : 0 });
    return ok('Đã kích hoạt học kỳ.');
}, true);
const getRegistrationPeriods = endpoint(async (_req, store) => {
    const semesters = await store.list('semesters');
    return { data: (await store.list('registration_periods')).map(p => ({ ...p, semester_name: semesters.find(s => s.id === p.semester_id)?.semester_name })) };
});
async function validatePeriod(store, period) {
    await requireRow(store, 'semesters', period.semester_id, 'Học kỳ');
    if (!(dateTime(period.start_time) < dateTime(period.end_time))) fail('Thời gian bắt đầu phải trước kết thúc.');
    if (period.min_credits > period.max_credits) fail('Tín chỉ tối thiểu không được lớn hơn tối đa.');
    const periods = await store.list('registration_periods', { semester_id: period.semester_id });
    if (period.is_active && periods.some(p => p.id !== period.id && p.is_active && dateTime(period.start_time) <= dateTime(p.end_time) && dateTime(p.start_time) <= dateTime(period.end_time))) fail('Đợt đăng ký trùng thời gian với một đợt đang bật.');
}
const createRegistrationPeriod = endpoint(async (req, store) => {
    const b = req.body;
    const period = { semester_id: integer(b.semester_id, 'Học kỳ'), name: text(b.name, 'tên đợt'), start_time: String(b.start_time || '').replace('T',' '), end_time: String(b.end_time || '').replace('T',' '),
        min_credits: integer(b.min_credits ?? 12, 'Tín chỉ tối thiểu', 0, 100), max_credits: integer(b.max_credits ?? 24, 'Tín chỉ tối đa', 1, 100), is_active: 1 };
    await validatePeriod(store, period);
    return { data: await store.insert('registration_periods', period), message: 'Đã tạo đợt đăng ký.' };
}, true);
const toggleRegistrationPeriod = endpoint(async (req, store) => {
    const period = await requireRow(store, 'registration_periods', req.params.id, 'Đợt đăng ký');
    const is_active = period.is_active ? 0 : 1;
    await validatePeriod(store, { ...period, is_active });
    await store.update('registration_periods', period.id, { is_active });
    return { is_active, message: is_active ? 'Đã bật đợt đăng ký.' : 'Đã tắt đợt đăng ký.' };
}, true);
const createCourseClass = endpoint(async (req, store) => {
    const b = req.body;
    const semester_id = (await requireRow(store, 'semesters', b.semester_id, 'Học kỳ')).id;
    const candidate = { class_code: text(b.class_code, 'mã lớp'), subject_id: (await requireRow(store, 'subjects', b.subject_id, 'Môn học')).id, semester_id,
        lecturer_id: b.lecturer_id ? (await requireRow(store, 'lecturers', b.lecturer_id, 'Giảng viên')).id : null,
        max_students: integer(b.max_students ?? 50, 'Sĩ số', 1, 1000), current_students: 0, status: 'OPEN', schedules: validateSchedules(b.schedules) };
    await unique(store, 'course_classes', 'class_code', candidate.class_code);
    validateClassConflicts(candidate, await classesWithDetails(store));
    const { schedules, ...fields } = candidate;
    const data = await store.insert('course_classes', fields);
    for (const schedule of schedules) await store.insert('class_schedules', { ...schedule, course_class_id: data.id });
    return { data, message: 'Đã mở lớp học phần.' };
}, true);
const updateClassStatus = endpoint(async (req, store) => {
    const cls = await requireRow(store, 'course_classes', req.params.id, 'Lớp');
    const status = req.body.status;
    if (!['OPEN','CLOSED','CANCELLED'].includes(status)) fail('Trạng thái lớp không hợp lệ.');
    if (cls.status === 'CANCELLED' && status !== 'CANCELLED') fail('Lớp đã hủy không thể mở lại; hãy tạo lớp mới.');
    if (status === 'CANCELLED') {
        if (cls.grades_locked) fail('Lớp đã khóa điểm không thể hủy.');
        const enrollments = await store.list('enrollments', { course_class_id: cls.id });
        const grades = await store.list('grades');
        if (enrollments.some(e => hasGrade(grades.find(g => g.enrollment_id === e.id)))) fail('Lớp đã có điểm hoặc khóa điểm không thể hủy.');
        for (const e of enrollments) {
            await store.update('enrollments', e.id, { status: 'CANCELLED' });
            await store.remove('grades', { enrollment_id: e.id });
        }
        await store.remove('class_schedules', { course_class_id: cls.id });
        await store.update('course_classes', cls.id, { status, current_students: 0 });
    } else await store.update('course_classes', cls.id, { status });
    return ok('Đã cập nhật trạng thái lớp.');
}, true);
const getClassEnrolledStudents = endpoint(async (req, store) => {
    const cls = await requireRow(store, 'course_classes', req.params.id, 'Lớp');
    const students = await store.list('students'), grades = await store.list('grades');
    return { course_class: cls, data: (await store.list('enrollments', { course_class_id: cls.id, status: 'ENROLLED' })).map(e => {
        const s = students.find(s => s.id === e.student_id), g = grades.find(g => g.enrollment_id === e.id);
        return { ...s, ...g, student_id: s?.id, enrollment_id: e.id, enrollment_time: e.enrollment_time };
    }) };
});
module.exports = { getDashboardStats, getAllUsers, createUser, toggleUserStatus, resetUserPassword, getAllStudents, createStudent: createProfile(true), updateStudent: updateProfile(true), deleteStudent: deleteProfile(true),
    getAllLecturers, createLecturer: createProfile(false), updateLecturer: updateProfile(false), deleteLecturer: deleteProfile(false), getAllSubjects, createSubject, updateSubject, deleteSubject,
    getPrograms, createProgram, getSemesters, createSemester, setActiveSemester, getRegistrationPeriods, createRegistrationPeriod, toggleRegistrationPeriod, createCourseClass, updateClassStatus, getClassEnrolledStudents, getAllDepartments };
