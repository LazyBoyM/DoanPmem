const { endpoint, fail } = require('../services/store');
const { requireRow, classesWithDetails, checkClassAccess, integer } = require('../services/academic');
const { convertGrade } = require('../services/scheduleConflictService');
const emptyGrade = { attendance_score: null, midterm_score: null, final_score: null, total_score_10: null, total_score_4: null, letter_grade: null, is_locked: 0 };
async function visibleClasses(req, store) {
    return (await classesWithDetails(store)).filter(c => c.status !== 'CANCELLED' && (req.user.role === 'ADMIN' || c.lecturer_id === req.user.lecturer_id) &&
        (!req.query.semester_id || c.semester_id === integer(req.query.semester_id, 'Học kỳ')));
}
const getMyClasses = endpoint(async (req, store) => ({ data: await visibleClasses(req, store) }));
const getLecturerTimetable = endpoint(async (req, store) => {
    const week = req.query.week ? integer(req.query.week, 'Tuần', 1, 53) : null;
    return { data: (await visibleClasses(req, store)).flatMap(c => c.schedules.filter(s => !week || (s.week_from <= week && s.week_to >= week)).map(s => ({ ...c, ...s, course_class_id: c.id }))) };
});
const getClassStudents = endpoint(async (req, store) => {
    const cls = await requireRow(store, 'course_classes', req.params.classId, 'Lớp');
    checkClassAccess(req.user, cls);
    const students = await store.list('students'), grades = await store.list('grades');
    return { course_class: cls, data: (await store.list('enrollments', { course_class_id: cls.id, status: 'ENROLLED' })).map(e => {
        const student = students.find(s => s.id === e.student_id);
        return { ...emptyGrade, ...grades.find(g => g.enrollment_id === e.id), enrollment_id: e.id, student_id: student.id,
            student_code: student.student_code, full_name: student.full_name, class_name: student.class_name, is_locked: Number(cls.grades_locked || grades.find(g => g.enrollment_id === e.id)?.is_locked || 0) };
    }) };
});
const updateGrades = endpoint(async (req, store) => {
    const enrollment = await requireRow(store, 'enrollments', req.body.enrollment_id, 'Đăng ký');
    const cls = await requireRow(store, 'course_classes', enrollment.course_class_id, 'Lớp');
    checkClassAccess(req.user, cls);
    if (enrollment.status !== 'ENROLLED') fail('Đăng ký đã hủy.');
    const existing = await store.one('grades', { enrollment_id: enrollment.id });
    if (cls.grades_locked || existing?.is_locked) fail('Bảng điểm đã khóa.');
    const scores = ['attendance_score','midterm_score','final_score'].map(key => {
        const value = req.body[key];
        if (value == null || value === '') return null;
        if (!['number','string'].includes(typeof value) || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 10) fail('Điểm phải trong khoảng 0–10.');
        return Number(value);
    });
    const { total10, total4, letter } = convertGrade(...scores);
    const data = { enrollment_id: enrollment.id, attendance_score: scores[0], midterm_score: scores[1], final_score: scores[2], total_score_10: total10, total_score_4: total4, letter_grade: letter, is_locked: 0 };
    if (existing) await store.update('grades', existing.id, data); else await store.insert('grades', data);
    return { data, message: 'Đã lưu điểm.' };
}, true);
const lockGrades = endpoint(async (req, store) => {
    const cls = await requireRow(store, 'course_classes', req.params.classId, 'Lớp');
    checkClassAccess(req.user, cls);
    const is_locked = req.body.is_locked;
    if (![0,1].includes(is_locked)) fail('Trạng thái khóa phải là 0 hoặc 1.');
    await store.update('course_classes', cls.id, { grades_locked: is_locked });
    for (const enrollment of await store.list('enrollments', { course_class_id: cls.id, status: 'ENROLLED' })) {
        const grade = await store.one('grades', { enrollment_id: enrollment.id });
        if (grade) await store.update('grades', grade.id, { is_locked });
        else await store.insert('grades', { ...emptyGrade, enrollment_id: enrollment.id, is_locked });
    }
    return { message: is_locked ? 'Đã khóa bảng điểm.' : 'Đã mở khóa bảng điểm.' };
}, true);
module.exports = { getMyClasses, getLecturerTimetable, getClassStudents, updateGrades, lockGrades };
