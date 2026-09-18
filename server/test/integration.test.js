const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { mockDb } = require('../src/config/db');
const bcrypt = require('bcryptjs');
let server, base;
const tokens = {};
async function call(path, role = 'admin', body, method) {
    const response = await fetch(base + path, {
        method: method || (body ? 'POST' : 'GET'),
        headers: { 'Content-Type': 'application/json', ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.arrayBuffer();
    return { status: response.status, data };
}
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
    for (const username of ['admin', 'gv_thuan', 'gv_nam', '74dctt25001']) {
        const result = await call('/auth/login', '', { username, password: '123456' });
        assert.equal(result.status, 200);
        tokens[username] = result.data.token;
    }
    mockDb.registration_periods[0].start_time = '2000-01-01';
    mockDb.registration_periods[0].end_time = '2099-01-01';
});
after(() => new Promise(resolve => server.close(resolve)));

test('profile reload uses data envelope and role routes reject students', async () => {
    assert.equal((await call('/auth/me')).data.data.role, 'ADMIN');
    assert.equal((await call('/admin/stats', '74dctt25001')).status, 403);
});
test('all list screens return their expected envelopes', async () => {
    for (const path of ['/admin/users', '/admin/students', '/admin/lecturers', '/admin/subjects', '/admin/programs', '/admin/semesters', '/admin/registration-periods', '/admin/departments', '/admin/classes']) {
        const result = await call(path);
        assert.equal(result.status, 200, path);
        assert.ok(Array.isArray(result.data.data), path);
    }
    assert.ok((await call('/admin/stats')).data.stats.total_students);
    assert.ok((await call('/reports/academic-stats')).data.data.gradeDistribution);
    const enrollment = (await call('/registration/my-enrollments', '74dctt25001')).data.data[0];
    assert.ok(Array.isArray(enrollment.schedules));
    assert.equal(enrollment.grade.total_score_10, 8.3);
});
test('admin sees closed classes while registration only returns open classes', async () => {
    await call('/admin/classes/4/status', 'admin', { status: 'CLOSED' }, 'PUT');
    assert.ok(!(await call('/registration/open-classes', '74dctt25001')).data.data.some(c => c.id === 4));
    assert.ok((await call('/admin/classes')).data.data.some(c => c.id === 4));
    await call('/admin/classes/4/status', 'admin', { status: 'OPEN' }, 'PUT');
});
test('enroll, duplicate rejection, cancel and re-enroll preserve identity and capacity', async () => {
    const student = '74dctt25001';
    assert.equal((await call('/registration/enroll', student, { course_class_id: 4 })).status, 200);
    assert.equal((await call('/registration/enroll', student, { course_class_id: 4 })).status, 400);
    const enrollment = mockDb.enrollments.find(e => e.student_id === 1 && e.course_class_id === 4);
    assert.equal((await call('/registration/cancel', student, { enrollment_id: enrollment.id })).status, 200);
    assert.equal((await call('/registration/enroll', student, { course_class_id: 4 })).status, 200);
    assert.equal(mockDb.course_classes.find(c => c.id === 4).current_students, 1);
    assert.equal(mockDb.enrollments.filter(e => e.student_id === 1 && e.course_class_id === 4).length, 1);
});
test('registration rejects schedule conflicts, unmet prerequisites and expired periods', async () => {
    assert.equal((await call('/registration/enroll', '74dctt25001', { course_class_id: 3 })).status, 400);
    mockDb.course_classes.push({ ...mockDb.course_classes[0], id: 99, subject_id: 2, current_students: 0 });
    assert.equal((await call('/registration/enroll', '74dctt25001', { course_class_id: 99 })).status, 400);
    mockDb.registration_periods[0].end_time = '2000-01-02';
    assert.equal((await call('/registration/enroll', '74dctt25001', { course_class_id: 99 })).status, 400);
    mockDb.registration_periods[0].end_time = '2099-01-01';
    mockDb.course_classes.pop();
});
test('lecturer cannot write, lock or export another lecturer class', async () => {
    assert.equal((await call('/lecturer/update-grades', 'gv_nam', { enrollment_id: 1, attendance_score: 10 })).status, 403);
    assert.equal((await call('/lecturer/lock-grades/1', 'gv_nam', { is_locked: 1 }, 'PUT')).status, 403);
    assert.equal((await call('/reports/export-class-excel/1', 'gv_nam')).status, 403);
    assert.equal((await call('/reports/export-class-excel/1', 'gv_thuan')).status, 200);
});
test('partial grades stay null; invalid grades rejected; locking covers ungraded enrollments', async () => {
    const path = '/lecturer/update-grades';
    assert.equal((await call(path, 'gv_thuan', { enrollment_id: 3, attendance_score: 11 })).status, 400);
    const result = await call(path, 'gv_thuan', { enrollment_id: 3, attendance_score: 8, midterm_score: null, final_score: null });
    assert.equal(result.data.data.total_score_10, null);
    assert.equal(result.data.data.letter_grade, null);
    await call('/lecturer/lock-grades/1', 'gv_thuan', { is_locked: 1 }, 'PUT');
    assert.equal((await call(path, 'gv_thuan', { enrollment_id: 4, attendance_score: 8 })).status, 400);
    await call('/lecturer/lock-grades/1', 'gv_thuan', { is_locked: 0 }, 'PUT');
});
test('changed password cannot be bypassed with 123456 and locked users lose access', async () => {
    mockDb.users[2].password = await bcrypt.hash('different-password', 4);
    assert.equal((await call('/auth/login', '', { username: 'gv_nam', password: '123456' })).status, 400);
    assert.equal((await call('/auth/login', '', { username: 'gv_nam', password: 'different-password' })).status, 200);
    mockDb.users[2].status = 0;
    assert.equal((await call('/auth/me', 'gv_nam')).status, 401);
    const invalid = await fetch(base + '/auth/me', { headers: { Authorization: 'Bearer invalid' } });
    assert.equal(invalid.status, 401);
});
