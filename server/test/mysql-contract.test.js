const { test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const { transaction, readStore } = require('../src/services/store');
const controller = require('../src/controllers/registrationController');

test('SQL grade writes accept numbered score columns and reject unsafe identifiers', async () => {
    const originalPool = db.getPool, originalMock = db.isUsingMock;
    const calls = [];
    db.isUsingMock = () => false;
    db.getPool = () => ({ query: async (sql, values) => { calls.push({ sql, values }); return [{ insertId: 9 }]; } });
    try {
        const store = readStore();
        await store.insert('grades', { enrollment_id: 3, total_score_10: 8, total_score_4: 3.5 });
        await store.update('grades', 9, { total_score_10: null, total_score_4: null });
        assert.match(calls[0].sql, /`total_score_10`,`total_score_4`/);
        assert.deepEqual(calls[0].values, [3, 8, 3.5]);
        assert.match(calls[1].sql, /`total_score_10` = \?,`total_score_4` = \?/);
        assert.deepEqual(calls[1].values, [null, null, 9]);
        await assert.rejects(store.update('grades', 9, { 'id` = 1 --': 2 }), /Invalid database identifier/);
        assert.equal(calls.length, 2);
    } finally { db.getPool = originalPool; db.isUsingMock = originalMock; }
});

test('SQL-backed response has the same nested enrollment contract as mock', async () => {
    const originalPool = db.getPool, originalMock = db.isUsingMock;
    const rows = {
        enrollments: [{ id: 10, student_id: 1, course_class_id: 1, status: 'ENROLLED' }, { id: 11, student_id: 1, course_class_id: 2, status: 'ENROLLED' }],
        course_classes: [{ id: 1, subject_id: 1, semester_id: 1, lecturer_id: 1, status: 'OPEN' }, { id: 2, subject_id: 1, semester_id: 2, status: 'OPEN' }],
        subjects: [{ id: 1, subject_name: 'Test', subject_code: 'TEST', credits: 3 }], lecturers: [{ id: 1, full_name: 'Teacher' }],
        class_schedules: [{ id: 1, course_class_id: 1, day_of_week: 2, start_period: 1, total_periods: 3 }],
        grades: [{ id: 8, enrollment_id: 10, total_score_10: 7.5, is_locked: 1 }]
    };
    db.isUsingMock = () => false;
    db.getPool = () => ({ query: async sql => {
        const table = /FROM `([a-z_]+)`/.exec(sql)?.[1];
        assert.ok(rows[table], sql);
        return [rows[table]];
    } });
    try {
        let result;
        await controller.getMyEnrollments({ user: { student_id: 1 }, query: {} }, {
            json: body => { result = body; }, status: code => { throw new Error(`HTTP ${code}`); }
        });
        assert.equal(result.data[0].grade.total_score_10, 7.5);
        assert.equal(result.data[0].grade.is_locked, 1);
        assert.equal(result.data[0].schedules.length, 1);
        assert.equal(result.data[0].lecturer_name, 'Teacher');
        assert.equal(result.data[1].grade, null);
    } finally { db.getPool = originalPool; db.isUsingMock = originalMock; }
});
test('SQL transaction retries deadlock, rolls back failed attempt and releases each connection', async () => {
    const originalPool = db.getPool, originalMock = db.isUsingMock;
    let attempts = 0, rolledBack = 0, committed = 0, released = 0;
    db.isUsingMock = () => false;
    db.getPool = () => ({ getConnection: async () => ({
        beginTransaction: async () => {}, rollback: async () => { rolledBack++; }, commit: async () => { committed++; }, release: () => { released++; },
        query: async sql => { assert.match(sql, /FOR UPDATE/); return [[{ id: 1 }]]; }
    }) });
    try {
        const result = await transaction(async store => {
            attempts++;
            await store.one('course_classes', { id: 1 });
            if (attempts === 1) throw Object.assign(new Error('deadlock'), { code: 'ER_LOCK_DEADLOCK' });
            return 'ok';
        });
        assert.equal(result, 'ok');
        assert.deepEqual([attempts, rolledBack, committed, released], [2,1,1,2]);
    } finally { db.getPool = originalPool; db.isUsingMock = originalMock; }
});
test('mock rollback is atomic and readers never see uncommitted data', async () => {
    const before = await readStore().one('subjects', { id: 1 });
    await assert.rejects(transaction(async store => {
        await store.update('subjects', 1, { subject_name: 'Uncommitted' });
        assert.equal((await readStore().one('subjects', { id: 1 })).subject_name, before.subject_name);
        throw new Error('rollback');
    }));
    assert.deepEqual(await readStore().one('subjects', { id: 1 }), before);
});


test('transaction locks scoped rows, leaves catalog reads unlocked and scopes related data', async () => {
    const originalPool = db.getPool, originalMock = db.isUsingMock;
    const queries = [];
    db.isUsingMock = () => false;
    db.getPool = () => ({ getConnection: async () => ({
        beginTransaction: async () => {}, rollback: async () => {}, commit: async () => {}, release: () => {},
        query: async (sql, values) => { queries.push({ sql, values }); return [[]]; }
    }) });
    try {
        await transaction(async store => {
            await store.one('students', { id: 7 });
            await store.one('course_classes', { id: 4 });
            await store.list('subjects');
            await store.related('grades', 'enrollment_id', [2, 3, 2]);
            await store.related('grades', 'enrollment_id', []);
            await store.list('semesters', {}, { lock: true });
        });
        assert.match(queries[0].sql, /WHERE `id` <=> \? ORDER BY id FOR UPDATE$/);
        assert.match(queries[1].sql, /FOR UPDATE$/);
        assert.doesNotMatch(queries[2].sql, /FOR UPDATE/);
        assert.match(queries[3].sql, /WHERE `enrollment_id` IN \(\?,\?\)/);
        assert.deepEqual(queries[3].values, [2, 3]);
        assert.match(queries[4].sql, /FOR UPDATE$/);
        assert.equal(queries.length, 5);
    } finally { db.getPool = originalPool; db.isUsingMock = originalMock; }
});
