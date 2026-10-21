const { endpoint, fail } = require('../services/store');
const { integer, text, dateTime, requireRow, classesWithDetails, validateClassConflicts, enrollmentsWithDetails, isPeriodOpen } = require('../services/academic');
const { lockFacilities, resolveRooms } = require('../services/facilities');

async function unique(store, table, key, value, id) {
    if ((await store.list(table)).some(r => r.id !== id && String(r[key]).toLowerCase() === value.toLowerCase())) fail('Mã đã được sử dụng.', 409);
}
const updateProgram = endpoint(async (req, store) => {
    const old = await requireRow(store, 'programs', req.params.id);
    const b = { ...old, ...req.body };
    const program_code = text(b.program_code, 'mã chương trình');
    await unique(store, 'programs', 'program_code', program_code, old.id);
    const duration = Number(b.duration_years);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 10) fail('Thời gian đào tạo không hợp lệ.');
    const total_credits = integer(b.total_credits, 'Tổng tín chỉ', 1, 500);
    const subjects = await store.list('program_subjects', { program_id: old.id });
    const catalog = await store.list('subjects');
    if (subjects.reduce((n, r) => n + Number(catalog.find(s => s.id === r.subject_id)?.credits || 0), 0) > total_credits) fail('Tổng tín chỉ không được nhỏ hơn các môn trong chương trình.');
    if (subjects.some(s => s.recommended_semester > Math.ceil(duration * 2))) fail('Thời gian đào tạo ngắn hơn phân bổ môn học.');
    await store.update('programs', old.id, { program_code, program_name: text(b.program_name, 'tên chương trình'), department_id: (await requireRow(store, 'departments', b.department_id)).id, total_credits, duration_years: duration });
    return { message: 'Đã cập nhật chương trình.' };
}, true);
const deleteProgram = endpoint(async (req, store) => {
    const program = await requireRow(store, 'programs', req.params.id);
    if ((await store.list('students', { program_id: program.id })).length) fail('Chương trình đang có sinh viên; không thể xóa.', 409);
    await store.remove('program_subjects', { program_id: program.id });
    await store.remove('programs', { id: program.id });
    return { message: 'Đã xóa chương trình.' };
}, true);
const getCurriculum = endpoint(async (req, store) => {
    const program = await requireRow(store, 'programs', req.params.id);
    const subjects = await store.list('subjects');
    return { data: (await store.list('program_subjects', { program_id: program.id })).map(r => ({ ...r, ...Object.fromEntries(['subject_code', 'subject_name', 'credits'].map(k => [k, subjects.find(s => s.id === r.subject_id)?.[k]])) })) };
});
const saveCurriculum = endpoint(async (req, store) => {
    const program = await requireRow(store, 'programs', req.params.id);
    if (!Array.isArray(req.body.subjects)) fail('Danh sách môn học không hợp lệ.');
    const seen = new Set(); let credits = 0;
    const rows = [];
    for (const row of req.body.subjects) {
        const subject = await requireRow(store, 'subjects', row.subject_id, 'Môn học');
        if (seen.has(subject.id)) fail('Môn học bị lặp trong chương trình.');
        seen.add(subject.id); credits += Number(subject.credits);
        if (![0, 1].includes(row.is_required)) fail('Loại môn học không hợp lệ.');
        rows.push({ program_id: program.id, subject_id: subject.id, recommended_semester: integer(row.recommended_semester, 'Học kỳ gợi ý', 1, Math.ceil(program.duration_years * 2)), is_required: row.is_required });
    }
    if (credits > program.total_credits) fail('Tín chỉ các môn vượt tổng tín chỉ chương trình.');
    await store.remove('program_subjects', { program_id: program.id });
    for (const row of rows) await store.insert('program_subjects', row);
    return { message: 'Đã lưu các môn và phân bổ học kỳ.' };
}, true);
const updateSemester = endpoint(async (req, store) => {
    const old = await requireRow(store, 'semesters', req.params.id);
    const b = { ...old, ...req.body };
    const semester_code = text(b.semester_code, 'mã học kỳ');
    await unique(store, 'semesters', 'semester_code', semester_code, old.id);
    if (!(dateTime(b.start_date) < dateTime(b.end_date))) fail('Ngày bắt đầu phải trước ngày kết thúc.');
    await store.update('semesters', old.id, { semester_code, semester_name: text(b.semester_name, 'tên học kỳ'), academic_year: text(b.academic_year, 'năm học'), start_date: b.start_date, end_date: b.end_date });
    return { message: 'Đã cập nhật học kỳ và năm học.' };
}, true);
const deleteSemester = endpoint(async (req, store) => {
    const s = await requireRow(store, 'semesters', req.params.id);
    if (s.is_active || (await store.list('course_classes', { semester_id: s.id })).length || (await store.list('registration_periods', { semester_id: s.id })).length) fail('Không thể xóa học kỳ hiện hành hoặc đã có lớp/đợt đăng ký.', 409);
    await store.remove('registration_submissions', { semester_id: s.id });
    await store.remove('semesters', { id: s.id });
    return { message: 'Đã xóa học kỳ.' };
}, true);
const updatePeriod = endpoint(async (req, store) => {
    const old = await requireRow(store, 'registration_periods', req.params.id);
    const b = { ...old, ...req.body };
    if (Number(b.semester_id) !== old.semester_id) fail('Không thể chuyển đợt đăng ký sang học kỳ khác.');
    const min_credits = integer(b.min_credits, 'Tín chỉ tối thiểu', 0, 100), max_credits = integer(b.max_credits, 'Tín chỉ tối đa', 1, 100);
    if (min_credits > max_credits || !(dateTime(b.start_time) < dateTime(b.end_time))) fail('Thời gian hoặc giới hạn tín chỉ không hợp lệ.');
    const periods = await store.list('registration_periods', { semester_id: old.semester_id });
    if (old.is_active && periods.some(p => p.id !== old.id && p.is_active && dateTime(b.start_time) <= dateTime(p.end_time) && dateTime(p.start_time) <= dateTime(b.end_time))) fail('Đợt đăng ký trùng thời gian.');
    const submitted = await store.list('registration_submissions', { period_id: old.id });
    if (submitted.some(s => s.total_credits < min_credits || s.total_credits > max_credits)) fail('Giới hạn mới không phù hợp đăng ký đã chốt.');
    await store.update('registration_periods', old.id, { name: text(b.name, 'tên đợt'), start_time: String(b.start_time).replace('T', ' '), end_time: String(b.end_time).replace('T', ' '), min_credits, max_credits });
    return { message: 'Đã cập nhật đợt đăng ký.' };
}, true);
const deletePeriod = endpoint(async (req, store) => {
    const p = await requireRow(store, 'registration_periods', req.params.id);
    if (p.is_active) fail('Tắt đợt đăng ký trước khi xóa.', 409);
    if ((await store.list('registration_submissions', { period_id: p.id })).length) fail('Đợt đã có đăng ký chốt; không thể xóa.', 409);
    await store.remove('registration_periods', { id: p.id });
    return { message: 'Đã xóa đợt đăng ký.' };
}, true);
const updateClass = endpoint(async (req, store) => {
    await lockFacilities(store);
    const cls = await requireRow(store, 'course_classes', req.params.id, 'Lớp');
    if (cls.status === 'CANCELLED' || cls.grades_locked) fail('Lớp đã hủy hoặc khóa điểm không thể chỉnh sửa.');
    const class_code = text(req.body.class_code ?? cls.class_code, 'mã lớp');
    await unique(store, 'course_classes', 'class_code', class_code, cls.id);
    const max_students = integer(req.body.max_students ?? cls.max_students, 'Sĩ số', 1, 1000);
    if (max_students < cls.current_students) fail('Sĩ số mới nhỏ hơn số sinh viên đã đăng ký.');
    const lecturer_id = req.body.lecturer_id === undefined ? cls.lecturer_id : req.body.lecturer_id ? (await requireRow(store, 'lecturers', req.body.lecturer_id)).id : null;
    const classes = await classesWithDetails(store);
    const schedules = await resolveRooms(store, classes.find(c => c.id === cls.id).schedules, max_students);
    validateClassConflicts({ ...cls, lecturer_id, schedules }, classes);
    await store.update('course_classes', cls.id, { class_code, max_students, lecturer_id });
    return { message: 'Đã cập nhật thông tin lớp.' };
}, true);
const getSubmission = endpoint(async (req, store) => ({ data: await store.one('registration_submissions', { student_id: req.user.student_id, semester_id: integer(req.query.semester_id, 'Học kỳ') }) }));
const submitRegistration = endpoint(async (req, store) => {
    const student = await requireRow(store, 'students', req.user.student_id);
    const semester_id = (await requireRow(store, 'semesters', req.body.semester_id)).id;
    const period = (await store.list('registration_periods', { semester_id })).find(p => isPeriodOpen(p));
    if (!period) fail('Không có đợt đăng ký đang mở.');
    const current = (await enrollmentsWithDetails(store, student.id)).filter(e => e.semester_id === semester_id);
    const total_credits = current.reduce((sum, c) => sum + Number(c.credits), 0);
    if (total_credits < period.min_credits || total_credits > period.max_credits) fail(`Cần đăng ký từ ${period.min_credits} đến ${period.max_credits} tín chỉ; hiện có ${total_credits}.`);
    const data = { student_id: student.id, semester_id, period_id: period.id, total_credits, submitted_at: new Date() };
    const old = await store.one('registration_submissions', { student_id: student.id, semester_id });
    if (old) await store.update('registration_submissions', old.id, data); else await store.insert('registration_submissions', data);
    return { message: 'Đã chốt đăng ký học phần.', data };
}, true);
const createAdmin = endpoint(async (req, store) => {
    const username = text(req.body.username, 'tên đăng nhập').toLowerCase();
    const email = text(req.body.email, 'email');
    if (!/^[a-z0-9_.-]{3,50}$/.test(username)) fail('Tên đăng nhập cần 3–50 ký tự chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Email không hợp lệ.');
    const password = text(req.body.password, 'mật khẩu');
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) fail('Mật khẩu cần 8–72 ký tự.');
    await unique(store, 'users', 'username', username);
    await unique(store, 'users', 'email', email);
    await store.insert('users', { username, email, password: await require('bcryptjs').hash(password, 10), role: 'ADMIN', status: 1 });
    return { message: 'Đã tạo tài khoản quản trị viên.' };
}, true);
const updateUserRole = endpoint(async (req, store) => {
    const users = await store.list('users', {}, { lock: true });
    const user = users.find(u => u.id === integer(req.params.id, 'Tài khoản'));
    if (!user) fail('Tài khoản không tồn tại.', 404);
    const role = req.body.role;
    if (!['ADMIN', 'LECTURER', 'STUDENT'].includes(role)) fail('Vai trò không hợp lệ.');
    if (user.id === req.user.id && user.role !== role) fail('Không thể tự thay đổi quyền của mình.');
    if (user.role === 'ADMIN' && role !== 'ADMIN' && users.filter(u => u.role === 'ADMIN' && Number(u.status) === 1).length <= 1) fail('Phải giữ ít nhất một quản trị viên đang hoạt động.');
    if (role !== 'ADMIN' && !await store.one(role === 'STUDENT' ? 'students' : 'lecturers', { user_id: user.id })) fail('Chỉ có thể chọn vai trò đã có hồ sơ. Tạo tài khoản sinh viên/giảng viên tại mục quản lý hồ sơ tương ứng.');
    await store.update('users', user.id, { role });
    return { message: 'Đã cập nhật vai trò. Phiên đăng nhập cũ sẽ hết hiệu lực.' };
}, true);
const getRegistrationPlans = endpoint(async (req, store) => require('../services/registrationPlans').registrationPlans(store, req.params.id));
module.exports = { getRegistrationPlans, updateUserRole, createAdmin, updateProgram, deleteProgram, getCurriculum, saveCurriculum, updateSemester, deleteSemester, updatePeriod, deletePeriod, updateClass, getSubmission, submitRegistration };
