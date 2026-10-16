const { requireRow, classesWithDetails } = require('./academic');

async function registrationPlans(store, semesterId) {
    const semester = await requireRow(store, 'semesters', semesterId, 'Học kỳ');
    const [students, classes, submissions, periods] = await Promise.all([
        store.list('students'), classesWithDetails(store, undefined, { semester_id: semester.id }),
        store.list('registration_submissions', { semester_id: semester.id }), store.list('registration_periods', { semester_id: semester.id }),
    ]);
    const active = classes.filter(c => c.status !== 'CANCELLED');
    const byId = new Map(active.map(c => [c.id, c]));
    const enrollments = (await store.related('enrollments', 'course_class_id', active.map(c => c.id))).filter(e => e.status === 'ENROLLED');
    const totals = new Map();
    for (const e of enrollments) totals.set(e.student_id, (totals.get(e.student_id) || 0) + Number(byId.get(e.course_class_id).credits));
    const planByStudent = new Map(submissions.map(p => [p.student_id, p]));
    const periodById = new Map(periods.map(p => [p.id, p]));
    const currentPeriod = [...periods].sort((a, b) => b.id - a.id).find(p => p.is_active) || periods.at(-1);
    return { semester, data: students.map(s => {
        const total_credits = totals.get(s.id) || 0, plan = planByStudent.get(s.id);
        const policy = (plan && periodById.get(plan.period_id)) || currentPeriod;
        const valid = !policy || (total_credits >= policy.min_credits && total_credits <= policy.max_credits);
        const status = plan && plan.total_credits === total_credits && valid ? 'SUBMITTED' : total_credits === 0 ? 'EMPTY' : policy && total_credits < policy.min_credits ? 'BELOW_MINIMUM' : !valid ? 'OVER_MAXIMUM' : 'PENDING';
        return { student_id: s.id, student_code: s.student_code, full_name: s.full_name, class_name: s.class_name, total_credits,
            min_credits: policy?.min_credits ?? null, max_credits: policy?.max_credits ?? null, status,
            status_label: { SUBMITTED: 'Đã chốt', EMPTY: 'Chưa đăng ký', BELOW_MINIMUM: 'Chưa đủ tín chỉ', OVER_MAXIMUM: 'Vượt giới hạn', PENDING: 'Chưa chốt' }[status], submitted_at: status === 'SUBMITTED' ? plan.submitted_at : null };
    }) };
}
module.exports = { registrationPlans };
