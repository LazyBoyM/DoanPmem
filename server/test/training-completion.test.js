const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { mockDb } = require('../src/config/db');
let server, base, snapshot;
const tokens = {};
async function call(path, body, method = body ? 'POST' : 'GET', user = 'admin') {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[user]}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, body: await res.json() };
}
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
    for (const username of ['admin', 'gv_thuan', '74dctt25001']) {
        const response = await call('/auth/login', { username, password: '123456' });
        assert.equal(response.status, 200); tokens[username] = response.body.token;
    }
    snapshot = structuredClone(mockDb);
});
beforeEach(() => {
    Object.assign(mockDb, structuredClone(snapshot));
    mockDb.registration_periods[0].start_time = '2000-01-01';
    mockDb.registration_periods[0].end_time = '2099-01-01';
});
after(() => new Promise(resolve => server.close(resolve)));

test('program update and delete protect student references and validate curriculum atomically', async () => {
    assert.equal((await call('/admin/programs/1', { program_name: 'Tên mới' }, 'PUT')).status, 200);
    assert.equal((await call('/admin/programs/1', undefined, 'DELETE')).status, 409);
    assert.equal((await call('/admin/programs/1/curriculum', { subjects: [{ subject_id: 1, recommended_semester: 1, is_required: 1 }, { subject_id: 2, recommended_semester: 2, is_required: 0 }] }, 'PUT')).status, 200);
    const rows = (await call('/admin/programs/1/curriculum')).body.data;
    assert.equal(rows.length, 2); assert.ok(rows[0].subject_name);
    for (const subjects of [
        [{ subject_id: 999, recommended_semester: 1, is_required: 1 }],
        [{ subject_id: 1, recommended_semester: 9, is_required: 1 }],
        [{ subject_id: 1, recommended_semester: 1, is_required: 1 }, { subject_id: 1, recommended_semester: 2, is_required: 1 }]
    ]) assert.ok((await call('/admin/programs/1/curriculum', { subjects }, 'PUT')).status >= 400);
    assert.deepEqual((await call('/admin/programs/1/curriculum')).body.data, rows);
    assert.equal((await call('/admin/programs/1', { total_credits: 1 }, 'PUT')).status, 400);
    const created = await call('/admin/programs', { program_code: 'NEW', program_name: 'New', department_id: 1 });
    assert.equal((await call(`/admin/programs/${created.body.data.id}`, undefined, 'DELETE')).status, 200);
});
test('subject edit saves multiple prerequisites and rejects cycles with full rollback', async () => {
    assert.equal((await call('/admin/subjects/4', { prerequisite_ids: [1, 3] }, 'PUT')).status, 200);
    assert.deepEqual((await call('/admin/subjects')).body.data.find(s => s.id === 4).prerequisite_ids, [1, 3]);
    assert.equal((await call('/admin/subjects/1', { subject_name: 'Invalid', prerequisite_ids: [4] }, 'PUT')).status, 400);
    assert.equal(mockDb.subjects.find(s => s.id === 1).subject_name, snapshot.subjects.find(s => s.id === 1).subject_name);
    assert.equal((await call('/admin/subjects/4', { prerequisite_ids: [] }, 'PUT')).status, 200);
    assert.equal(mockDb.prerequisites.filter(p => p.subject_id === 4).length, 0);
});
test('semester and period edits preserve active semester and refuse unsafe deletes', async () => {
    assert.equal((await call('/admin/semesters/1', { academic_year: '2026–2027', semester_name: 'HK mới' }, 'PUT')).status, 200);
    assert.equal(mockDb.semesters[0].is_active, 1);
    assert.equal((await call('/admin/semesters/1', { start_date: '2028-01-01' }, 'PUT')).status, 400);
    assert.equal((await call('/admin/semesters/1', undefined, 'DELETE')).status, 409);
    assert.equal((await call('/admin/registration-periods/1', { min_credits: 3, max_credits: 20 }, 'PUT')).status, 200);
    assert.equal((await call('/admin/registration-periods/1', { min_credits: 30 }, 'PUT')).status, 400);
    assert.equal((await call('/admin/registration-periods/1', undefined, 'DELETE')).status, 409);
    const created = await call('/admin/semesters', { semester_code: 'NEW', semester_name: 'New', academic_year: '2027-2028', start_date: '2027-09-01', end_date: '2028-01-01' });
    assert.equal((await call(`/admin/semesters/${created.body.data.id}`, undefined, 'DELETE')).status, 200);
});
test('class editing rejects lecturer conflicts, undersized rooms and capacity below enrollment', async () => {
    assert.equal((await call('/admin/classes/3', { lecturer_id: 2, max_students: 50 }, 'PUT')).status, 200);
    assert.equal((await call('/admin/classes/3', { lecturer_id: 1 }, 'PUT')).status, 400);
    assert.equal(mockDb.course_classes.find(c => c.id === 3).lecturer_id, 2);
    assert.equal((await call('/admin/classes/1', { max_students: 1 }, 'PUT')).status, 400);
    assert.equal((await call('/admin/classes/1', { max_students: 1000 }, 'PUT')).status, 400);
    assert.equal((await call('/admin/classes/1', { class_code: 'RENAMED', max_students: 40 }, 'PUT')).status, 200);
});
test('registration submission enforces min/max credits and changes invalidate previous submission', async () => {
    const student = '74dctt25001';
    assert.equal((await call('/registration/submit', { semester_id: 1 }, 'POST', student)).status, 400);
    mockDb.registration_periods[0].min_credits = 6;
    assert.equal((await call('/registration/submit', { semester_id: 1 }, 'POST', student)).status, 200);
    let plan = (await call('/registration/submission?semester_id=1', undefined, 'GET', student)).body.data;
    assert.equal(plan.total_credits, 6); assert.equal(plan.student_id, 1);
    assert.equal((await call('/registration/enroll', { course_class_id: 4 }, 'POST', student)).status, 200);
    assert.equal((await call('/registration/submission?semester_id=1', undefined, 'GET', student)).body.data, null);
    assert.equal((await call('/registration/submit', { semester_id: 1 }, 'POST', student)).status, 200);
    const enrollment = mockDb.enrollments.find(e => e.student_id === 1 && e.course_class_id === 4);
    assert.equal((await call('/registration/cancel', { enrollment_id: enrollment.id }, 'POST', student)).status, 200);
    assert.equal(mockDb.registration_submissions.length, 0);
    mockDb.registration_periods[0].max_credits = 3;
    assert.equal((await call('/registration/submit', { semester_id: 1 }, 'POST', student)).status, 400);
    mockDb.registration_periods[0].end_time = '2001-01-01';
    assert.equal((await call('/registration/submit', { semester_id: 1 }, 'POST', student)).status, 400);
});
test('catalog credit changes and class cancellation keep submitted plans consistent', async () => {
    mockDb.registration_periods[0].min_credits = 6;
    await call('/registration/submit', { semester_id: 1 }, 'POST', '74dctt25001');
    assert.equal((await call('/admin/subjects/5', { credits: 4 }, 'PUT')).status, 200);
    assert.equal(mockDb.registration_submissions[0].total_credits, 7);
    assert.equal((await call('/admin/subjects/5', { credits: 1 }, 'PUT')).status, 400);
    assert.equal(mockDb.subjects.find(s => s.id === 5).credits, 4);
    assert.equal((await call('/admin/classes/2/status', { status: 'CANCELLED' }, 'PUT')).status, 200);
    assert.equal(mockDb.registration_submissions.length, 0);
});
test('new endpoints enforce staff roles and registration ownership comes from token', async () => {
    for (const user of ['gv_thuan', '74dctt25001']) {
        assert.equal((await call('/admin/programs/1', { program_name: 'Hack' }, 'PUT', user)).status, 403);
        assert.equal((await call('/admin/programs/1/curriculum', undefined, 'GET', user)).status, 403);
        assert.equal((await call('/admin/admin-accounts', { username: 'hack', email: 'hack@example.com', password: 'password123' }, 'POST', user)).status, 403);
    }
    assert.equal((await call('/registration/submit', { semester_id: 1 })).status, 403);
    mockDb.registration_periods[0].min_credits = 0;
    await call('/registration/submit', { semester_id: 1, student_id: 2 }, 'POST', '74dctt25001');
    assert.equal(mockDb.registration_submissions[0].student_id, 1);
});
test('admin accounts and role changes validate profile compatibility and revoke old tokens', async () => {
    assert.equal((await call('/admin/admin-accounts', { username: 'new_admin', email: 'new@example.com', password: 'longpassword123' })).status, 200);
    assert.equal((await call('/admin/admin-accounts', { username: 'new_admin', email: 'duplicate@example.com', password: 'longpassword123' })).status, 409);
    assert.ok(!(await call('/admin/users')).body.data.some(u => u.password));
    const student = mockDb.users.find(u => u.username === '74dctt25001');
    assert.equal((await call(`/admin/users/${student.id}/role`, { role: 'LECTURER' }, 'PUT')).status, 400);
    assert.equal((await call('/admin/users/1/role', { role: 'STUDENT' }, 'PUT')).status, 400);
    assert.equal((await call(`/admin/users/${student.id}/role`, { role: 'ADMIN' }, 'PUT')).status, 200);
    assert.equal((await call('/admin/students/1', undefined, 'DELETE')).status, 409);
    assert.equal((await call('/auth/me', undefined, 'GET', '74dctt25001')).status, 401);
});
test('administrators can review submitted, insufficient and empty plans and export a real workbook', async () => {
    mockDb.students.push({ ...snapshot.students[0], id: 999, user_id: 999, student_code: 'EMPTY' });
    let result = await call('/admin/semesters/1/registration-plans');
    assert.equal(result.status, 200);
    assert.equal(result.body.data.find(s => s.student_id === 1).status, 'BELOW_MINIMUM');
    assert.ok(result.body.data.some(s => s.status === 'EMPTY'));
    mockDb.registration_periods[0].min_credits = 6;
    await call('/registration/submit', { semester_id: 1 }, 'POST', '74dctt25001');
    result = await call('/admin/semesters/1/registration-plans');
    assert.equal(result.body.data.find(s => s.student_id === 1).status, 'SUBMITTED');
    assert.equal((await call('/admin/registration-periods/1', { min_credits: 9 }, 'PUT')).status, 400);
    assert.equal((await call('/admin/semesters/1/registration-plans', undefined, 'GET', 'gv_thuan')).status, 403);
    const response = await fetch(base + '/reports/export-registration-plans/1', { headers: { Authorization: `Bearer ${tokens.admin}` } });
    assert.equal(response.status, 200);
    const xlsx = require('xlsx');
    const workbook = xlsx.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets.DangKyHocPhan);
    assert.equal(rows.length, mockDb.students.length);
    assert.equal(rows.find(s => s['Mã sinh viên'] === snapshot.students.find(s => s.id === 1).student_code)['Trạng thái'], 'Đã chốt');
});
test('disabled unused periods can be deleted but confirmed period history is retained', async () => {
    mockDb.registration_periods[0].min_credits = 6;
    await call('/registration/submit', { semester_id: 1 }, 'POST', '74dctt25001');
    await call('/admin/registration-periods/1/toggle', {}, 'PUT');
    assert.equal((await call('/admin/registration-periods/1', undefined, 'DELETE')).status, 409);
    mockDb.registration_periods.push({ id: 99, semester_id: 1, name: 'Unused', is_active: 0 });
    assert.equal((await call('/admin/registration-periods/99', undefined, 'DELETE')).status, 200);
});
