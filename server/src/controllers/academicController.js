const { endpoint, fail } = require('../services/store');
const { integer, requireRow, checkClassAccess } = require('../services/academic');
const { transcript } = require('../services/transcript');
const { convertGrade } = require('../services/scheduleConflictService');

async function visibleStudentIds(req, store) {
    if (req.user.role === 'ADMIN') return null;
    const classes = await store.list('course_classes', { lecturer_id: req.user.lecturer_id });
    const active = new Set(classes.filter(c => c.status !== 'CANCELLED').map(c => c.id));
    return new Set((await store.related('enrollments', 'course_class_id', [...active])).filter(e => e.status === 'ENROLLED').map(e => e.student_id));
}
const getStudents = endpoint(async (req, store) => {
    const visible = await visibleStudentIds(req, store);
    const students = visible ? await store.related('students', 'id', [...visible]) : await store.list('students');
    return { data: students.map(s => ({ id: s.id, student_code: s.student_code, full_name: s.full_name, class_name: s.class_name })) };
});
const getTranscript = endpoint(async (req, store) => {
    const id = integer(req.params.studentId, 'Sinh viên');
    const visible = await visibleStudentIds(req, store);
    if (visible && !visible.has(id)) fail('Chỉ được xem sinh viên thuộc lớp đang phụ trách.', 403);
    const report = await transcript(store, id, req.query.semester_id ? integer(req.query.semester_id, 'Học kỳ') : null);
    report.data.forEach(row => { row.can_record_resit = req.user.role === 'ADMIN' || row.lecturer_id === req.user.lecturer_id; });
    return report;
});
const requestResit = endpoint(async (req, store) => {
    const enrollment = await requireRow(store, 'enrollments', req.body.enrollment_id, 'Đăng ký');
    if (enrollment.student_id !== req.user.student_id) fail('Không có quyền đăng ký thi lại cho sinh viên khác.', 403);
    const report = await transcript(store, req.user.student_id);
    if (!report.data.find(e => e.enrollment_id === enrollment.id)?.can_request_resit) fail('Học phần không đủ điều kiện thi lại hoặc đã có yêu cầu.');
    const g = await store.one('grades', { enrollment_id: enrollment.id });
    await store.insert('resit_attempts', { enrollment_id: enrollment.id, status: 'REQUESTED', original_final_score: g.final_score, original_total_score: g.total_score_10, score: null, requested_at: new Date(), recorded_by: null, recorded_at: null });
    return { message: 'Đã đăng ký thi lại. Chờ giảng viên nhập kết quả sau kỳ thi.' };
}, true);
const recordResit = endpoint(async (req, store) => {
    const enrollment = await requireRow(store, 'enrollments', req.body.enrollment_id, 'Đăng ký');
    const cls = await requireRow(store, 'course_classes', enrollment.course_class_id, 'Lớp');
    checkClassAccess(req.user, cls);
    const g = await store.one('grades', { enrollment_id: enrollment.id });
    if (enrollment.status !== 'ENROLLED' || !g) fail('Đăng ký không còn hiệu lực.');
    if (cls.grades_locked || g.is_locked) fail('Mở khóa bảng điểm trước khi nhập điểm thi lại.');
    const attempt = await store.one('resit_attempts', { enrollment_id: enrollment.id });
    if (!attempt || attempt.status !== 'REQUESTED') fail('Không có yêu cầu thi lại đang chờ.');
    const raw = req.body.score, score = Number(raw);
    if (!['number', 'string'].includes(typeof raw) || String(raw).trim() === '' || !Number.isFinite(score) || score < 0 || score > 10) fail('Điểm thi lại phải từ 0 đến 10.');
    if ([g.attendance_score, g.midterm_score, g.final_score].some(s => s == null)) fail('Cần đủ điểm thành phần trước khi nhập thi lại.');
    const final = Math.max(Number(attempt.original_final_score), Number(g.final_score), score);
    const converted = convertGrade(Number(g.attendance_score), Number(g.midterm_score), final);
    await store.update('grades', g.id, { final_score: final, total_score_10: converted.total10, total_score_4: converted.total4, letter_grade: converted.letter });
    await store.update('resit_attempts', attempt.id, { status: 'COMPLETED', score, recorded_by: req.user.id, recorded_at: new Date() });
    return { message: 'Đã lưu điểm thi lại và cập nhật kết quả học phần.' };
}, true);
module.exports = { getStudents, getTranscript, requestResit, recordResit };
