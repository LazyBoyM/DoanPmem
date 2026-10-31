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

module.exports = { recordAudit, gradeValues };
