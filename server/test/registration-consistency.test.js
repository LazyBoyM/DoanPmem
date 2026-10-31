const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mockDb } = require('../src/config/db');
const registration = require('../src/controllers/registrationController');
const admin = require('../src/controllers/adminController');
const training = require('../src/controllers/trainingController');

async function invoke(handler, req) {
    let status = 200, data;
    const res = { status(code) { status = code; return this; }, json(body) { data = body; } };
    await handler(req, res);
    return { status, data };
}

test('closed, expired, upcoming and disabled windows block enroll, cancel, submit and batch enrollment', async () => {
    const snapshot = structuredClone(mockDb);
    try {
        const student = { user: { id: 4, role: 'STUDENT', student_id: 1 }, query: {} };
        const period = mockDb.registration_periods[0];
        for (const change of [
            { is_active: 1, start_time: '2000-01-01', end_time: '2001-01-01' },
            { is_active: 1, start_time: '2098-01-01', end_time: '2099-01-01' },
            { is_active: 0, start_time: '2000-01-01', end_time: '2099-01-01' }
        ]) {
            Object.assign(period, change);
            assert.equal((await invoke(registration.getContext, student)).data.data.periods[0].is_open, false);
            assert.equal((await invoke(registration.registerClass, { ...student, body: { course_class_id: 4 } })).status, 400);
            assert.equal((await invoke(registration.cancelEnrollment, { ...student, body: { enrollment_id: 1 } })).status, 400);
            assert.equal((await invoke(training.submitRegistration, { ...student, body: { semester_id: 1 } })).status, 400);
            assert.equal((await invoke(admin.batchEnrollClass, { user: { id: 1, role: 'ADMIN' }, params: { id: 4 }, body: { student_ids: [1] } })).status, 400);
            assert.deepEqual(mockDb.enrollments, snapshot.enrollments);
        }
        Object.assign(period, { is_active: 1, start_time: '2000-01-01', end_time: '2099-01-01' });
        for (const status of ['CLOSED', 'CANCELLED']) {
            mockDb.course_classes.find(c => c.id === 4).status = status;
            assert.equal((await invoke(admin.batchEnrollClass, { user: { id: 1, role: 'ADMIN' }, params: { id: 4 }, body: { student_ids: [1] } })).status, 400);
        }
        mockDb.course_classes.find(c => c.id === 4).status = 'OPEN';
        assert.equal((await invoke(admin.batchEnrollClass, { user: { id: 1, role: 'ADMIN' }, params: { id: 4 }, body: { student_ids: [1] } })).status, 200);
        assert.ok(mockDb.enrollments.some(e => e.course_class_id === 4 && e.student_id === 1));
    } finally { Object.assign(mockDb, snapshot); }
});
