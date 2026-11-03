const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { mockDb } = require('../src/config/db');
const { convertGrade } = require('../src/services/scheduleConflictService');
const snapshot = structuredClone(mockDb);
let server, base;
const tokens = {};
async function call(path, role = 'admin', body, method) {
    const r = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json() };
}
function failingGrade() {
    const g = mockDb.grades.find(g => g.enrollment_id === 1);
    Object.assign(g, { attendance_score: 5, midterm_score: 5, final_score: 1, total_score_10: 2.6, total_score_4: 0, letter_grade: 'F', is_locked: 0 });
}
before(async () => {
    server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}/api`;
    for (const name of ['admin', 'gv_thuan', 'gv_nam', '74dctt25001', '74dctt25002']) tokens[name] = (await call('/auth/login', '', { username: name, password: '123456' })).data.token;
});
beforeEach(() => Object.assign(mockDb, structuredClone(snapshot)));
after(() => new Promise(r => server.close(r)));
test('staff transcript scoped to taught students; students cannot browse staff directory', async () => {
    mockDb.students.push({ ...mockDb.students[0], id: 99, student_code: 'OTHER' });
    const list = await call('/academic/students', 'gv_thuan');
    assert.ok(list.data.data.length); assert.ok(!list.data.data.some(s => s.id === 99));
    assert.equal((await call('/academic/students/99/transcript', 'gv_thuan')).status, 403);
    assert.equal((await call('/academic/students/99/transcript')).status, 200);
    assert.equal((await call('/academic/students', '74dctt25001')).status, 403);
    const staff = await call('/academic/students/1/transcript');
    const own = await call('/registration/grades', '74dctt25001');
    assert.deepEqual(staff.data.cumulative, own.data.cumulative);
});
test('ungraded and passed courses cannot request resit; malformed ownership rejected', async () => {
    assert.equal((await call('/academic/resits', '74dctt25001', { enrollment_id: 1 })).status, 400);
    failingGrade();
    assert.equal((await call('/academic/resits', '74dctt25002', { enrollment_id: 1 })).status, 403);
    assert.equal((await call('/academic/resits', '74dctt25001', { enrollment_id: 'bad' })).status, 400);
    mockDb.grades[0].final_score = null;
    assert.equal((await call('/academic/resits', '74dctt25001', { enrollment_id: 1 })).status, 400);
});
test('resit request is single-use, scoped, audited and recalculates GPA and credits', async () => {
    failingGrade();
    assert.equal((await call('/academic/resits', '74dctt25001', { enrollment_id: 1 })).status, 200);
    assert.equal((await call('/academic/resits', '74dctt25001', { enrollment_id: 1 })).status, 400);
    assert.equal((await call('/academic/resits', 'gv_nam', { enrollment_id: 1, score: 8 }, 'PUT')).status, 403);
    for (const score of ['', null, -1, 11, 'no', true]) assert.equal((await call('/academic/resits', 'gv_thuan', { enrollment_id: 1, score }, 'PUT')).status, 400);
    assert.equal(mockDb.resit_attempts[0].status, 'REQUESTED');
    const cls = mockDb.course_classes.find(c => c.id === 1); cls.grades_locked = 1;
    assert.equal((await call('/academic/resits', 'gv_thuan', { enrollment_id: 1, score: 8 }, 'PUT')).status, 400);
    cls.grades_locked = 0;
    assert.equal((await call('/academic/resits', 'gv_thuan', { enrollment_id: 1, score: 8 }, 'PUT')).status, 200);
    assert.equal((await call('/academic/resits', 'gv_thuan', { enrollment_id: 1, score: 9 }, 'PUT')).status, 400);
    assert.equal(mockDb.resit_attempts[0].original_final_score, 1);
    assert.equal(mockDb.resit_attempts[0].original_total_score, 2.6);
    assert.equal(mockDb.resit_attempts[0].recorded_by, 2);
    const audit = mockDb.audit_logs.at(-1);
    assert.equal(audit.action, 'RESIT');
    assert.equal(audit.user_id, 2);
    assert.equal(JSON.parse(audit.detail).resit_score, 8);
    const report = (await call('/registration/grades', '74dctt25001')).data;
    assert.equal(report.failed_subjects, 0); assert.equal(report.cumulative.passedCredits, 3);
    assert.equal(report.data.find(e => e.enrollment_id === 1).grade.total_score_10, 6.8);
    assert.equal((await call('/lecturer/update-grades', 'gv_thuan', { enrollment_id: 1, attendance_score: 5, midterm_score: 5, final_score: 0 })).status, 200);
    assert.equal(mockDb.grades.find(g => g.enrollment_id === 1).final_score, 8);
    assert.equal((await call('/lecturer/update-grades', 'gv_thuan', { enrollment_id: 1, attendance_score: null, midterm_score: 5, final_score: 8 })).status, 400);
});
test('lower resit score does not reduce final; failed resit directs to retake', async () => {
    failingGrade();
    await call('/academic/resits', '74dctt25001', { enrollment_id: 1 });
    await call('/academic/resits', 'admin', { enrollment_id: 1, score: 0 }, 'PUT');
    const report = (await call('/registration/grades', '74dctt25001')).data;
    const row = report.data.find(e => e.enrollment_id === 1);
    assert.equal(row.grade.final_score, 1); assert.equal(row.next_action, 'RETAKE_REQUIRED'); assert.equal(row.can_request_resit, false);
});
test('later pass resolves old failure, best result counts credits once, semester filter retains cumulative', async () => {
    failingGrade();
    mockDb.semesters.push({ ...mockDb.semesters[0], id: 2, start_date: '2027-02-01' });
    mockDb.course_classes.push({ ...mockDb.course_classes[0], id: 99, semester_id: 2 });
    mockDb.enrollments.push({ id: 99, student_id: 1, course_class_id: 99, status: 'ENROLLED' });
    mockDb.grades.push({ id: 99, enrollment_id: 99, attendance_score: 8, midterm_score: 8, final_score: 8, total_score_10: 8, total_score_4: 3.5, letter_grade: 'B+' });
    const report = (await call('/registration/grades?semester_id=1', '74dctt25001')).data;
    assert.equal(report.failed_subjects, 0); assert.equal(report.cumulative.passedCredits, 3);
    assert.equal(report.data.find(e => e.enrollment_id === 1).next_action, 'PASSED_LATER');
    assert.equal((await call('/academic/resits', '74dctt25001', { enrollment_id: 1 })).status, 400);
    const newer = (await call('/registration/grades?semester_id=2', '74dctt25001')).data.data[0]; assert.equal(newer.attempt_number, 2);
});
test('improvement requires confirmation before enrollment and cancellation of confirmation leaves no changes', async () => {
    mockDb.prerequisites = [];
    Object.assign(mockDb.grades.find(g => g.enrollment_id === 1), { attendance_score: 7, midterm_score: 7, final_score: 7, total_score_10: 7, total_score_4: 3, letter_grade: 'B' });
    mockDb.semesters.push({ ...mockDb.semesters[0], id: 2, start_date: '2027-02-01' });
    mockDb.registration_periods.push({ id: 99, semester_id: 2, is_active: 1, start_time: '2000-01-01', end_time: '2099-01-01', min_credits: 0, max_credits: 24 });
    mockDb.course_classes.push({ ...mockDb.course_classes[0], id: 99, semester_id: 2, current_students: 0, grades_locked: 0 });
    const count = mockDb.enrollments.length;
    const warning = await call('/registration/enroll', '74dctt25001', { course_class_id: 99 });
    assert.equal(warning.status, 200);
    assert.equal(warning.data.requires_confirmation, true);
    assert.match(warning.data.message, /7 điểm/);
    assert.equal(mockDb.enrollments.length, count);
    assert.equal(mockDb.course_classes.find(c => c.id === 99).current_students, 0);
    const confirmed = await call('/registration/enroll', '74dctt25001', { course_class_id: 99, confirm_improvement: true });
    assert.equal(confirmed.data.is_improvement, true);
    assert.equal(mockDb.enrollments.length, count + 1);
    assert.equal(mockDb.course_classes.find(c => c.id === 99).current_students, 1);
});

test('failed improvement retains previous pass and distinguishes attempt from cumulative results', async () => {
    Object.assign(mockDb.grades.find(g => g.enrollment_id === 1), { attendance_score: 7, midterm_score: 7, final_score: 7, total_score_10: 7, total_score_4: 3, letter_grade: 'B' });
    mockDb.semesters.push({ ...mockDb.semesters[0], id: 2, start_date: '2027-02-01' });
    mockDb.course_classes.push({ ...mockDb.course_classes[0], id: 99, semester_id: 2 });
    mockDb.enrollments.push({ id: 99, student_id: 1, course_class_id: 99, status: 'ENROLLED' });
    mockDb.grades.push({ id: 99, enrollment_id: 99, attendance_score: 3, midterm_score: 3, final_score: 3, total_score_10: 3, total_score_4: 0, letter_grade: 'F' });
    const report = (await call('/registration/grades?semester_id=2', '74dctt25001')).data;
    assert.equal(report.summary.gpa10, '3.00');
    assert.equal(report.cumulative.gpa10, '7.00');
    assert.equal(report.cumulative.passedCredits, 3);
    assert.equal(report.failed_subjects, 0);
    assert.equal(report.data[0].is_improvement, true);
    assert.equal(report.data[0].best_score_10, 7);
    assert.equal(report.data[0].result_status, 'FAILED');
    assert.equal(report.data[0].can_request_resit, false);
    assert.equal((await call('/academic/resits', '74dctt25001', { enrollment_id: 99 })).status, 400);
});

test('rounding at grade threshold follows decimal half-up policy', () => {
    assert.deepEqual(convertGrade(8.45, 8.45, 8.45), { total10: 8.5, total4: 4, letter: 'A' });
    assert.equal(convertGrade(9.95, 9.95, 9.95).total10, 10);
    assert.equal(convertGrade(8.44, 8.44, 8.44).total10, 8.4);
});
test('deleting a mock student cleans the new resit records too', async () => {
    failingGrade(); await call('/academic/resits', '74dctt25001', { enrollment_id: 1 });
    assert.equal((await call('/admin/students/1', 'admin', undefined, 'DELETE')).status, 200);
    assert.equal(mockDb.resit_attempts.length, 0);
});
