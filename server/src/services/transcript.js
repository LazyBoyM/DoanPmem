const { enrollmentsWithDetails, gradeSummary, requireRow } = require('./academic');

const resitPolicy = 'Quy tắc đồ án: tổng kết dưới 4,0 và đủ ba điểm thành phần được đăng ký thi lại một lần cho mỗi lượt học. Giữ điểm cuối kỳ cao hơn để tính lại tổng kết; dưới 4,0 sau thi lại thì cần học lại.';
async function transcript(store, studentId, semesterId) {
    const student = await requireRow(store, 'students', studentId, 'Sinh viên');
    const program = await requireRow(store, 'programs', student.program_id, 'Chương trình');
    const all = await enrollmentsWithDetails(store, student.id);
    const semesters = await store.related('semesters', 'id', all.map(e => e.semester_id));
    const semesterById = new Map(semesters.map(s => [s.id, s]));
    const attempts = await store.related('resit_attempts', 'enrollment_id', all.map(e => e.enrollment_id));
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
module.exports = { transcript, resitPolicy };
