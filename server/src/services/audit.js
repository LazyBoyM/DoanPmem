async function recordAudit(store, user, action, table, recordId, detail) {
    await store.insert('audit_logs', {
        user_id: user.id,
        user_name: `${user.username || user.id} (${user.role})`.slice(0, 100),
        action,
        target_table: table,
        record_id: String(recordId),
        detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
        created_at: new Date()
    });
}

function gradeValues(grade) {
    return Object.fromEntries(['attendance_score', 'midterm_score', 'final_score', 'total_score_10', 'total_score_4', 'letter_grade'].map(key => [key, grade?.[key] ?? null]));
}

async function gradeContext(store, enrollment, cls) {
    const [student, subject, semester] = await Promise.all([
        store.one('students', { id: enrollment.student_id }),
        store.one('subjects', { id: cls.subject_id }),
        store.one('semesters', { id: cls.semester_id })
    ]);
    return { student_id: enrollment.student_id, student_code: student?.student_code, student_name: student?.full_name,
        subject_name: subject?.subject_name, subject_code: subject?.subject_code, semester_name: semester?.semester_name };
}

module.exports = { recordAudit, gradeValues, gradeContext };
