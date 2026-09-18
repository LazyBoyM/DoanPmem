const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { mockDb } = require('../src/config/db');
const snapshot = structuredClone(mockDb);
let server, base;
const tokens = {};
async function request(path, body, method, role = 'admin') {
    const r = await fetch(base+path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[role] || ''}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, body: await r.json() };
}
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
    for (const user of ['admin','gv_thuan','74dctt25001']) tokens[user] = (await request('/auth/login', { username: user, password: '123456' })).body.token;
});
beforeEach(() => {
    Object.assign(mockDb, structuredClone(snapshot));
    mockDb.registration_periods[0].start_time = '2000-01-01';
    mockDb.registration_periods[0].end_time = '2099-01-01';
});
after(async () => { Object.assign(mockDb, snapshot); await new Promise(resolve => server.close(resolve)); });
const studentBody = { student_code: 'NEW001', full_name: 'Test Student', class_name: 'TEST', program_id: 1, academic_year: 'K75', email: 'new@example.com', phone: '123', address: 'A' };
const classBody = { class_code: 'NEWCLASS', subject_id: 6, semester_id: 1, lecturer_id: 1, max_students: 30, schedules: [{ day_of_week: 8, start_period: 10, total_periods: 3, week_from: 1, week_to: 8, room: 'TEST' }] };

test('profile edits persist program/year/email and clearing optional fields', async () => {
    const created = await request('/admin/students', studentBody);
    assert.equal(created.status, 200, created.body.message);
    const id = created.body.data.id;
    mockDb.programs.push({ id: 99, program_name: 'Other', total_credits: 140, department_id: 1 });
    assert.equal((await request(`/admin/students/${id}`, { full_name: 'Changed', program_id: 99, academic_year: 'K76', email: 'changed@example.com', phone: '', address: '' }, 'PUT')).status, 200);
    const row = (await request('/admin/students')).body.data.find(s => s.id === id);
    assert.deepEqual([row.program_id,row.academic_year,row.email,row.phone,row.address], [99,'K76','changed@example.com','','']);
    const login = await request('/auth/login', { username: 'new001', password: '123456' });
    assert.equal(login.status, 200);
});
test('invalid profile edit leaves both profile and user unchanged', async () => {
    const before = structuredClone(mockDb.students[0]);
    assert.equal((await request('/admin/students/1', { email: 'admin@edu.vn', full_name: 'Should roll back' }, 'PUT')).status, 409);
    assert.deepEqual(mockDb.students[0], before);
    assert.equal((await request('/admin/students/1', { program_id: 999 }, 'PUT')).status, 404);
});
test('lecturer email and phone edits persist', async () => {
    assert.equal((await request('/admin/lecturers/1', { email: 'lecturer@example.com', phone: '' }, 'PUT')).status, 200);
    const row = (await request('/admin/lecturers')).body.data.find(l => l.id === 1);
    assert.equal(row.email, 'lecturer@example.com'); assert.equal(row.phone, '');
});
test('standalone account creation blocked; legacy orphan account can be linked through profile creation', async () => {
    assert.equal((await request('/admin/users', { username: 'orphan', role: 'STUDENT', email: 'orphan@example.com' })).status, 400);
    mockDb.users.push({ id: 99, username: 'new001', email: 'orphan@example.com', role: 'STUDENT', status: 1, password: 'unused' });
    const created = await request('/admin/students', studentBody);
    assert.equal(created.status, 200, created.body.message);
    assert.equal(created.body.data.user_id, 99);
    assert.equal(mockDb.users.filter(u => u.username === 'new001').length, 1);
});
test('deleting student cleans enrollments, grades and capacity; IDs do not collide', async () => {
    const beforeCount = mockDb.course_classes[0].current_students;
    assert.equal((await request('/admin/students/1', undefined, 'DELETE')).status, 200);
    assert.equal(mockDb.enrollments.some(e => e.student_id === 1), false);
    assert.equal(mockDb.grades.some(g => g.enrollment_id === 1), false);
    assert.equal(mockDb.course_classes[0].current_students, beforeCount-1);
    assert.equal((await request('/admin/students', studentBody)).status, 200);
    assert.equal(new Set(mockDb.students.map(s=>s.id)).size, mockDb.students.length);
    assert.equal(new Set(mockDb.users.map(s=>s.id)).size, mockDb.users.length);
});
test('lecturer deletion clears assignments and subject deletion respects referenced classes', async () => {
    assert.equal((await request('/admin/lecturers/1', undefined, 'DELETE')).status, 200);
    assert.equal(mockDb.course_classes.some(c=>c.lecturer_id===1), false);
    assert.equal((await request('/admin/subjects/4', undefined, 'DELETE')).status, 409);
});
test('zero teaching periods survive CRUD and class details use current catalog', async () => {
    assert.equal((await request('/admin/subjects/4', { subject_name: 'Updated subject', theory_periods: 0, practice_periods: 0, credits: 4 }, 'PUT')).status, 200);
    const subject = (await request('/admin/subjects')).body.data.find(s=>s.id===4);
    assert.equal(subject.theory_periods, 0); assert.equal(subject.practice_periods, 0); assert.equal(subject.prerequisites.length, 2);
    const cls = (await request('/admin/classes')).body.data.find(c=>c.id===1);
    assert.equal(cls.subject_name, 'Updated subject'); assert.equal(cls.credits, 4);
    const created = await request('/admin/subjects', { subject_code: 'ZERO', subject_name: 'Zero practice', department_id: 1, practice_periods: 0, theory_periods: 0 });
    assert.equal(created.body.data.practice_periods, 0);
});
test('only one semester active; invalid activation preserves previous active semester', async () => {
    const created = await request('/admin/semesters', { semester_code: 'S2', semester_name: 'S2', academic_year: '2027', start_date: '2027-01-01', end_date: '2027-05-01' });
    assert.equal(created.body.data.is_active, 0);
    assert.equal((await request('/admin/semesters/999/active', {}, 'PUT')).status, 404);
    assert.equal(mockDb.semesters.find(s=>s.id===1).is_active, 1);
    await request(`/admin/semesters/${created.body.data.id}/active`, {}, 'PUT');
    assert.equal(mockDb.semesters.filter(s=>s.is_active).length, 1);
    assert.equal(mockDb.semesters.find(s=>s.id===created.body.data.id).is_active, 1);
});
test('period validation rejects invalid ranges, limits, overlaps and reactivation conflicts', async () => {
    const b = { semester_id: 1, name: 'Period', start_time: '2026-09-01 00:00:00', end_time: '2026-10-01 00:00:00', min_credits: 0, max_credits: 20 };
    assert.equal((await request('/admin/registration-periods', b)).status, 400);
    assert.equal((await request('/admin/registration-periods', { ...b, end_time: '2026-08-01' })).status, 400);
    assert.equal((await request('/admin/registration-periods', { ...b, min_credits: 30 })).status, 400);
    await request('/admin/registration-periods/1/toggle', {}, 'PUT');
    const created = await request('/admin/registration-periods', b);
    assert.equal(created.status, 200); assert.equal(created.body.data.min_credits, 0);
    assert.equal((await request('/admin/registration-periods/1/toggle', {}, 'PUT')).status, 400);
});
test('class creation validates schedule, room and lecturer collisions and rolls back fully', async () => {
    const count = mockDb.course_classes.length;
    assert.equal((await request('/admin/create-class', { ...classBody, schedules: [{ ...classBody.schedules[0], start_period: 11 }] })).status, 400);
    assert.equal(mockDb.course_classes.length, count);
    const created = await request('/admin/create-class', classBody);
    assert.equal(created.status, 200, created.body.message);
    assert.equal((await request('/admin/create-class', { ...classBody, class_code: 'COLLISION', lecturer_id: 2 })).status, 400);
    assert.equal((await request('/admin/create-class', { ...classBody, class_code: 'COLLISION', schedules: [{ ...classBody.schedules[0], room: 'OTHER' }] })).status, 400);
    assert.equal((await request('/admin/create-class', { ...classBody, class_code: 'LATER', schedules: [{ ...classBody.schedules[0], week_from: 9, week_to: 16 }] })).status, 200);
});
test('class cancellation cleans schedule and enrollments but refuses classes with grades', async () => {
    assert.equal((await request('/admin/classes/1/status', { status: 'CANCELLED' }, 'PUT')).status, 400);
    assert.equal((await request('/admin/classes/2/status', { status: 'CANCELLED' }, 'PUT')).status, 200);
    assert.equal(mockDb.enrollments.some(e=>e.course_class_id===2 && e.status==='ENROLLED'), false);
    assert.equal(mockDb.class_schedules.some(s=>s.course_class_id===2), false);
    assert.equal(mockDb.course_classes.find(c=>c.id===2).current_students, 0);
    assert.equal((await request('/admin/classes/2/status', { status: 'OPEN' }, 'PUT')).status, 400);
});
test('double cancellation decrements capacity once; grades and deadline prevent cancellation', async () => {
    assert.equal((await request('/registration/cancel', { enrollment_id: 1 }, 'POST', '74dctt25001')).status, 400);
    const beforeCount = mockDb.course_classes.find(c=>c.id===2).current_students;
    const results = await Promise.all([request('/registration/cancel', { enrollment_id: 5 }, 'POST', '74dctt25001'), request('/registration/cancel', { enrollment_id: 5 }, 'POST', '74dctt25001')]);
    assert.deepEqual(results.map(r=>r.status).sort(), [200,400]);
    assert.equal(mockDb.course_classes.find(c=>c.id===2).current_students, beforeCount-1);
    mockDb.registration_periods[0].end_time = '2000-01-02';
    mockDb.enrollments.find(e=>e.id===5).status = 'ENROLLED';
    assert.equal((await request('/registration/cancel', { enrollment_id: 5 }, 'POST', '74dctt25001')).status, 400);
    assert.equal((await request('/registration/cancel', { enrollment_id: 6 }, 'POST', '74dctt25001')).status, 403);
});
test('empty class lock blocks new enrollments; admin can view lecturer routes', async () => {
    await request('/lecturer/lock-grades/4', { is_locked: 1 }, 'PUT');
    assert.equal(mockDb.course_classes.find(c=>c.id===4).grades_locked, 1);
    assert.equal((await request('/registration/enroll', { course_class_id: 4 }, 'POST', '74dctt25001')).status, 400);
    assert.equal((await request('/lecturer/my-classes')).status, 200);
    assert.equal((await request('/lecturer/timetable')).status, 200);
});
test('academic context, semester and week filters are consistent', async () => {
    const context = (await request('/academic/context', undefined, 'GET', '74dctt25001')).body.data;
    assert.equal(context.program.total_credits, 135); assert.equal(context.periods[0].is_open, true);
    assert.equal((await request('/registration/my-enrollments?semester_id=999', undefined, 'GET', '74dctt25001')).body.data.length, 0);
    assert.equal((await request('/lecturer/timetable?semester_id=1&week=20')).body.data.length, 0);
});
test('retakes count highest grade once; semester GPA separated from cumulative and program requirements', async () => {
    mockDb.course_classes.push({ ...mockDb.course_classes[0], id: 99, semester_id: 2 });
    mockDb.enrollments.push({ id: 99, course_class_id: 99, student_id: 1, status: 'ENROLLED' });
    mockDb.grades.push({ id: 99, enrollment_id: 99, total_score_10: 9, total_score_4: 4, letter_grade: 'A' });
    const report = (await request('/registration/grades?semester_id=1', undefined, 'GET', '74dctt25001')).body;
    assert.equal(report.summary.gpa10, '8.30'); assert.equal(report.cumulative.gpa10, '9.00');
    assert.equal(report.cumulative.passedCredits, 3); assert.equal(report.required_credits, 135);
});
test('lecturer reports only include owned active classes and enrolled students', async () => {
    mockDb.grades.push({ id: 99, enrollment_id: 5, total_score_10: 0, letter_grade: 'F' });
    const lecturer = (await request('/reports/academic-stats', undefined, 'GET', 'gv_thuan')).body.data;
    assert.equal(lecturer.failedCount, 0);
    assert.ok(lecturer.classOccupancy.every(c=>c.lecturer_id===1));
    mockDb.enrollments.find(e=>e.id===5).status = 'CANCELLED';
    assert.equal((await request('/reports/academic-stats')).body.data.failedCount, 0);
});
