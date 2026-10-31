const { enrollmentsWithDetails, classesWithDetails, gradeSummary, requireRow } = require('./academic');
const { fail } = require('./store');

const resitPolicy = 'Quy tắc đồ án: tổng kết dưới 4,0 và đủ ba điểm thành phần được đăng ký thi lại một lần cho mỗi lượt học. Giữ điểm cuối kỳ cao hơn để tính lại tổng kết; dưới 4,0 sau thi lại thì cần học lại.';
async function transcript(store, studentId, semesterId) {
    const student = await requireRow(store, 'students', studentId, 'Sinh viên');
    const program = await requireRow(store, 'programs', student.program_id, 'Chương trình');
    const all = await enrollmentsWithDetails(store, student.id);
    const semesters = await store.related('semesters', 'id', all.map(e => e.semester_id));
    const attempts = await store.related('resit_attempts', 'enrollment_id', all.map(e => e.enrollment_id));
    return buildTranscript(student, program, all, semesters, attempts, semesterId);
}

async function transcriptsForStudents(store, students, semesterId) {
    if (!students.length) return [];
    const [programs, enrollmentRows] = await Promise.all([
        store.related('programs', 'id', students.map(s => s.program_id)),
        store.related('enrollments', 'student_id', students.map(s => s.id))
    ]);
    const enrollments = enrollmentRows.filter(e => e.status === 'ENROLLED');
    const [classes, grades, attempts] = await Promise.all([
        classesWithDetails(store, enrollments.map(e => e.course_class_id)),
        store.related('grades', 'enrollment_id', enrollments.map(e => e.id)),
        store.related('resit_attempts', 'enrollment_id', enrollments.map(e => e.id))
    ]);
    const semesters = await store.related('semesters', 'id', classes.map(c => c.semester_id));
    const programById = new Map(programs.map(p => [p.id, p]));
    const classById = new Map(classes.filter(c => c.status !== 'CANCELLED').map(c => [c.id, c]));
    const gradeByEnrollment = new Map(grades.map(g => [g.enrollment_id, g]));
    const rowsByStudent = new Map();
    for (const e of enrollments) {
        const cls = classById.get(e.course_class_id);
        if (!cls) continue;
        if (!rowsByStudent.has(e.student_id)) rowsByStudent.set(e.student_id, []);
        rowsByStudent.get(e.student_id).push({ ...cls, enrollment_id: e.id, enrollment_time: e.enrollment_time, grade: gradeByEnrollment.get(e.id) || null });
    }
    return students.map(student => {
        const program = programById.get(student.program_id);
        if (!program) fail('Chương trình không tồn tại.', 404);
        return buildTranscript(student, program, rowsByStudent.get(student.id) || [], semesters, attempts, semesterId);
    });
}

function buildTranscript(student, program, all, semesters, attempts, semesterId) {
    const semesterById = new Map(semesters.map(s => [s.id, s]));
    const resitByEnrollment = new Map(attempts.map(attempt => [attempt.enrollment_id, attempt]));
    const groups = new Map();
    for (const row of all) {
        if (!groups.has(row.subject_id)) groups.set(row.subject_id, []);
        groups.get(row.subject_id).push(row);
    }
    let failedSubjects = 0;
    for (const rows of groups.values()) {
        rows.sort((a, b) => String(semesterById.get(a.semester_id)?.start_date || '').localeCompare(String(semesterById.get(b.semester_id)?.start_date || '')) || a.enrollment_id - b.enrollment_id);
        const passed = rows.some(e => e.grade?.total_score_10 != null && Number(e.grade.total_score_10) >= 4);
        if (!passed && rows.some(e => e.grade?.total_score_10 != null && Number(e.grade.total_score_10) < 4)) failedSubjects++;
        rows.forEach((e, i) => {
            const resit = resitByEnrollment.get(e.enrollment_id) || null;
            const g = e.grade;
            const complete = g && ['attendance_score', 'midterm_score', 'final_score', 'total_score_10'].every(k => g[k] != null);
            const failed = complete && Number(g.total_score_10) < 4;
            const hasLaterAttempt = i < rows.length - 1;
            e.attempt_number = i + 1;
            e.semester_name = semesterById.get(e.semester_id)?.semester_name || '';
            e.resit = resit;
            e.can_request_resit = Boolean(failed && !resit && !passed && !hasLaterAttempt);
            e.result_status = !complete ? 'PENDING' : failed ? 'FAILED' : 'PASSED';
            e.next_action = !failed ? null : passed ? 'PASSED_LATER' : hasLaterAttempt ? 'RETAKING' : resit?.status === 'REQUESTED' ? 'RESIT_PENDING' : resit?.status === 'COMPLETED' ? 'RETAKE_REQUIRED' : 'RESIT_AVAILABLE';
        });
    }
    const selected = semesterId ? all.filter(e => e.semester_id === semesterId) : all;
    return { data: selected, student: { id: student.id, full_name: student.full_name, student_code: student.student_code, class_name: student.class_name, program_name: program.program_name }, summary: gradeSummary(selected), cumulative: gradeSummary(all), failed_subjects: failedSubjects, required_credits: Number(program.total_credits), policy: 'GPA dùng điểm cao nhất mỗi môn. Tín chỉ tích lũy tính một lần cho môn đạt từ 4,0.', resit_policy: resitPolicy };
}
module.exports = { transcript, transcriptsForStudents, resitPolicy };
