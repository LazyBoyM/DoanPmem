const { endpoint, fail } = require('../services/store');
const { integer, requireRow, classesWithDetails, enrollmentsWithDetails, isPeriodOpen, hasGrade, gradeSummary } = require('../services/academic');
const { checkScheduleConflicts } = require('../services/scheduleConflictService');
const semesterFilter = (req, rows) => req.query?.semester_id ? rows.filter(c => c.semester_id === integer(req.query.semester_id, 'Học kỳ')) : rows;
const getContext = endpoint(async (req, store) => {
    const semesters = (await store.list('semesters')).sort((a,b) => b.id-a.id);
    const periods = await store.list('registration_periods');
    const student = req.user.student_id ? await store.one('students', { id: req.user.student_id }) : null;
    const program = student ? await store.one('programs', { id: student.program_id }) : null;
    return { data: { semesters, periods: periods.map(p => ({ ...p, is_open: isPeriodOpen(p) })), activeSemester: semesters.find(s => s.is_active === 1) || null, program } };
});
const getAllClasses = endpoint(async (req, store) => ({ data: semesterFilter(req, await classesWithDetails(store)) }));
const getOpenClasses = endpoint(async (req, store) => ({ data: semesterFilter(req, await classesWithDetails(store)).filter(c => c.status === 'OPEN') }));
const getMyEnrollments = endpoint(async (req, store) => {
    if (!req.user.student_id) fail('Tài khoản chưa có hồ sơ sinh viên.');
    return { data: semesterFilter(req, await enrollmentsWithDetails(store, req.user.student_id)) };
});
const getGrades = endpoint(async (req, store) => {
    const student = await requireRow(store, 'students', req.user.student_id, 'Sinh viên');
    const program = await requireRow(store, 'programs', student.program_id, 'Chương trình');
    const all = await enrollmentsWithDetails(store, student.id);
    const selected = semesterFilter(req, all);
    return { data: selected, summary: gradeSummary(selected), cumulative: gradeSummary(all), required_credits: Number(program.total_credits), policy: 'Điểm cao nhất mỗi môn; tín chỉ tích lũy tính một lần khi đạt từ 4.0.' };
});
const registerClass = endpoint(async (req, store) => {
    const student = await requireRow(store, 'students', req.user.student_id, 'Sinh viên');
    const cls = await requireRow(store, 'course_classes', req.body.course_class_id, 'Lớp');
    if (cls.status !== 'OPEN' || cls.grades_locked) fail('Lớp đã đóng đăng ký hoặc khóa điểm.');
    if (cls.current_students >= cls.max_students) fail('Lớp đã hết chỗ.');
    const period = (await store.list('registration_periods', { semester_id: cls.semester_id })).find(p => isPeriodOpen(p));
    if (!period) fail('Học kỳ này không có đợt đăng ký đang mở.');
    const all = await enrollmentsWithDetails(store, student.id);
    const current = all.filter(c => c.semester_id === cls.semester_id);
    if (current.some(c => c.subject_id === cls.subject_id)) fail('Bạn đã đăng ký môn học này trong học kỳ.');
    for (const p of await store.list('prerequisites', { subject_id: cls.subject_id })) {
        if (!all.some(c => c.subject_id === p.prerequisite_subject_id && c.grade?.total_score_10 != null && c.grade.total_score_10 >= p.min_grade_required)) fail('Chưa đạt môn tiên quyết.');
    }
    const subject = await requireRow(store, 'subjects', cls.subject_id, 'Môn');
    const credits = current.reduce((sum,c) => sum + c.credits, 0) + Number(subject.credits);
    if (credits > period.max_credits) fail(`Vượt giới hạn ${period.max_credits} tín chỉ của đợt đăng ký.`);
    const schedules = await store.list('class_schedules', { course_class_id: cls.id });
    const conflict = checkScheduleConflicts(schedules, current);
    if (conflict.hasConflict) fail(conflict.detail);
    const existing = await store.one('enrollments', { student_id: student.id, course_class_id: cls.id });
    if (existing) await store.update('enrollments', existing.id, { status: 'ENROLLED', enrollment_time: new Date() });
    else await store.insert('enrollments', { student_id: student.id, course_class_id: cls.id, status: 'ENROLLED', enrollment_time: new Date() });
    await store.update('course_classes', cls.id, { current_students: cls.current_students + 1 });
    return { message: 'Đăng ký học phần thành công.' };
}, true);
const cancelEnrollment = endpoint(async (req, store) => {
    await requireRow(store, 'students', req.user.student_id, 'Sinh viên');
    const enrollment = await requireRow(store, 'enrollments', req.body.enrollment_id, 'Đăng ký');
    if (enrollment.student_id !== req.user.student_id) fail('Không có quyền hủy đăng ký này.', 403);
    if (enrollment.status !== 'ENROLLED') fail('Đăng ký đã được hủy.');
    const cls = await requireRow(store, 'course_classes', enrollment.course_class_id, 'Lớp');
    const grade = await store.one('grades', { enrollment_id: enrollment.id });
    if (cls.grades_locked || hasGrade(grade)) fail('Không thể hủy học phần đã có điểm hoặc khóa điểm.');
    if (!(await store.list('registration_periods', { semester_id: cls.semester_id })).some(p => isPeriodOpen(p))) fail('Đã hết thời hạn hủy đăng ký.');
    await store.update('enrollments', enrollment.id, { status: 'CANCELLED' });
    await store.update('course_classes', cls.id, { current_students: Math.max(0, cls.current_students - 1) });
    await store.remove('grades', { enrollment_id: enrollment.id });
    return { message: 'Đã hủy đăng ký.' };
}, true);
module.exports = { getContext, getGrades, getAllClasses, getOpenClasses, getMyEnrollments, registerClass, cancelEnrollment };
