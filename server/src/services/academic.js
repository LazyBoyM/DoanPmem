const { fail } = require('./store');
const { isScheduleOverlap } = require('./scheduleConflictService');
function integer(value, label, min = 1, max = Number.MAX_SAFE_INTEGER) {
    const n = Number(value);
    if (value === '' || value == null || !Number.isInteger(n) || n < min || n > max) fail(`${label} không hợp lệ.`);
    return n;
}
function text(value, label) {
    if (typeof value !== 'string' || !value.trim()) fail(`Vui lòng nhập ${label}.`);
    return value.trim();
}
function dateTime(value) {
    if (value instanceof Date) return value;
    // Academic dates are stored as Vietnam local wall-clock time in MySQL.
    const raw = String(value || '').replace(' ', 'T');
    return new Date(/Z$|[+-]\d\d:\d\d$/.test(raw) ? raw : raw.length === 10 ? `${raw}T00:00:00+07:00` : `${raw}+07:00`);
}
function isPeriodOpen(period, now = new Date()) {
    return Number(period.is_active) === 1 && dateTime(period.start_time) <= now && dateTime(period.end_time) >= now;
}
function hasGrade(grade) {
    return grade && (Number(grade.is_locked) === 1 || ['attendance_score','midterm_score','final_score','total_score_10'].some(key => grade[key] != null));
}
async function requireRow(store, table, id, label = 'Dữ liệu') {
    const row = await store.one(table, { id: integer(id, 'ID') });
    if (!row) fail(`${label} không tồn tại.`, 404);
    return row;
}
async function classesWithDetails(store, ids) {
    const classes = ids ? await store.related('course_classes', 'id', ids) : await store.list('course_classes');
    const subjects = await store.related('subjects', 'id', classes.map(c => c.subject_id));
    const lecturers = await store.related('lecturers', 'id', classes.map(c => c.lecturer_id).filter(Boolean));
    const schedules = await store.related('class_schedules', 'course_class_id', classes.map(c => c.id));
    return classes.map(c => {
        const subject = subjects.find(s => s.id === c.subject_id);
        return { ...c, subject_code: subject?.subject_code || '', subject_name: subject?.subject_name || '',
            credits: Number(subject?.credits || 0), lecturer_name: lecturers.find(l => l.id === c.lecturer_id)?.full_name || null,
            schedules: schedules.filter(s => s.course_class_id === c.id) };
    });
}
async function enrollmentsWithDetails(store, studentId) {
    const enrollments = await store.list('enrollments', { student_id: studentId, status: 'ENROLLED' });
    const classes = await classesWithDetails(store, enrollments.map(e => e.course_class_id));
    const grades = await store.related('grades', 'enrollment_id', enrollments.map(e => e.id));
    return enrollments.flatMap(e => {
        const cls = classes.find(c => c.id === e.course_class_id && c.status !== 'CANCELLED');
        return cls ? [{ ...cls, enrollment_id: e.id, enrollment_time: e.enrollment_time, grade: grades.find(g => g.enrollment_id === e.id) || null }] : [];
    });
}
function checkClassAccess(user, cls) {
    if (user.role !== 'ADMIN' && cls.lecturer_id !== user.lecturer_id) fail('Bạn không phụ trách lớp học phần này.', 403);
    if (cls.status === 'CANCELLED') fail('Lớp học phần đã hủy.');
}
function validateSchedules(schedules) {
    if (!Array.isArray(schedules) || !schedules.length) fail('Cần ít nhất một buổi học.');
    return schedules.map(s => {
        const row = { day_of_week: integer(s.day_of_week, 'Thứ', 2, 8), start_period: integer(s.start_period, 'Tiết bắt đầu', 1, 12),
            total_periods: integer(s.total_periods, 'Số tiết', 1, 12), room: text(s.room, 'phòng học'),
            week_from: integer(s.week_from ?? 1, 'Tuần đầu', 1, 53), week_to: integer(s.week_to ?? 16, 'Tuần cuối', 1, 53) };
        if (row.start_period + row.total_periods > 13 || row.week_to < row.week_from) fail('Khoảng tiết hoặc tuần học không hợp lệ.');
        return row;
    });
}
function validateClassConflicts(candidate, classes) {
    for (let i = 0; i < candidate.schedules.length; i++) {
        const s = candidate.schedules[i];
        if (candidate.schedules.slice(i + 1).some(other => isScheduleOverlap(s, other))) fail('Các buổi học của lớp bị trùng nhau.');
        for (const cls of classes) {
            if (cls.id === candidate.id || cls.semester_id !== candidate.semester_id || cls.status === 'CANCELLED') continue;
            for (const other of cls.schedules) {
                if (isScheduleOverlap(s, other) && (s.room.toLowerCase() === other.room.toLowerCase() || (candidate.lecturer_id && candidate.lecturer_id === cls.lecturer_id))) {
                    fail(`Trùng phòng hoặc lịch giảng viên với lớp ${cls.class_code}.`);
                }
            }
        }
    }
}
function gradeSummary(enrollments) {
    const best = new Map();
    for (const e of enrollments) {
        if (e.grade?.total_score_10 == null) continue;
        if (!best.has(e.subject_id) || Number(e.grade.total_score_10) > Number(best.get(e.subject_id).grade.total_score_10)) best.set(e.subject_id, e);
    }
    let credits = 0, passedCredits = 0, sum10 = 0, sum4 = 0;
    for (const e of best.values()) {
        const n = Number(e.credits);
        credits += n; sum10 += n * Number(e.grade.total_score_10); sum4 += n * Number(e.grade.total_score_4);
        if (Number(e.grade.total_score_10) >= 4) passedCredits += n;
    }
    return { gpa10: credits ? (sum10 / credits).toFixed(2) : '0.00', gpa4: credits ? (sum4 / credits).toFixed(2) : '0.00', totalCredits: credits, passedCredits };
}
module.exports = { integer, text, dateTime, isPeriodOpen, hasGrade, requireRow, classesWithDetails, enrollmentsWithDetails, checkClassAccess, validateSchedules, validateClassConflicts, gradeSummary };
