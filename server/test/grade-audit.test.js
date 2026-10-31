const { test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const lecturer = require('../src/controllers/lecturerController');
const admin = require('../src/controllers/adminController');

async function invoke(handler, req) {
    let status = 200, data;
    await handler(req, { status(code) { status = code; return this; }, json(body) { data = body; } });
    return { status, data };
}

test('admin and lecturer grade saves, new grades and lock changes appear in audit history', async () => {
    const snapshot = structuredClone(db.mockDb);
    try {
        const actors = [{ id: 1, username: 'admin', role: 'ADMIN' }, { id: 2, username: 'gv_thuan', role: 'LECTURER', lecturer_id: 1 }];
        for (const user of actors) {
            const before = structuredClone(db.mockDb.grades.find(g => g.enrollment_id === 1));
            const count = db.mockDb.audit_logs.length;
            const result = await invoke(lecturer.updateGrades, { user, body: { enrollment_id: 1, attendance_score: 8, midterm_score: 7, final_score: 6 } });
            assert.equal(result.status, 200);
            assert.equal(db.mockDb.audit_logs.length, count + 1);
            const log = db.mockDb.audit_logs.at(-1), detail = JSON.parse(log.detail);
            assert.equal(log.user_id, user.id);
            assert.ok(log.user_name.includes(user.role));
            assert.equal(log.target_table, 'grades');
            assert.equal(log.action, 'UPDATE');
            assert.equal(log.record_id, String(before.id));
            assert.equal(detail.before.final_score, before.final_score);
            assert.equal(detail.after.final_score, 6);
            const history = await invoke(admin.getAuditLogs, {});
            assert.ok(history.data.data.some(row => row.id === log.id));
        }
        const user = actors[0];
        assert.equal((await invoke(lecturer.updateGrades, { user, body: { enrollment_id: 5, attendance_score: 8, midterm_score: 7, final_score: 6 } })).status, 200);
        assert.equal(db.mockDb.audit_logs.at(-1).action, 'CREATE');
        for (const is_locked of [1, 0]) {
            assert.equal((await invoke(lecturer.lockGrades, { user, params: { classId: 1 }, body: { is_locked } })).status, 200);
            const log = db.mockDb.audit_logs.at(-1);
            assert.equal(log.target_table, 'course_classes');
            assert.equal(JSON.parse(log.detail).after.grades_locked, is_locked);
        }
        const count = db.mockDb.audit_logs.length;
        assert.equal((await invoke(lecturer.updateGrades, { user, body: { enrollment_id: 1, final_score: 11 } })).status, 400);
        assert.equal(db.mockDb.audit_logs.length, count);
    } finally { Object.assign(db.mockDb, snapshot); }
});

test('SQL grade save rolls back when audit insertion fails', async () => {
    const originalPool = db.getPool, originalMock = db.isUsingMock, originalError = console.error;
    let commits = 0, rollbacks = 0, releases = 0;
    const statements = [];
    const connection = {
        beginTransaction: async () => {}, commit: async () => { commits++; },
        rollback: async () => { rollbacks++; }, release: () => { releases++; },
        query: async (sql, values) => {
            statements.push(sql);
            if (sql.startsWith('SELECT')) {
                const table = /FROM `([a-z_]+)`/.exec(sql)[1];
                const key = /WHERE `([a-z_]+)`/.exec(sql)[1];
                return [structuredClone(db.mockDb[table].filter(row => row[key] === values[0]))];
            }
            if (sql.startsWith('INSERT INTO `audit_logs`')) throw new Error('Audit storage unavailable');
            return [{ affectedRows: 1 }];
        }
    };
    db.isUsingMock = () => false;
    db.getPool = () => ({ getConnection: async () => connection });
    console.error = () => {};
    try {
        const result = await invoke(lecturer.updateGrades, { user: { id: 1, username: 'admin', role: 'ADMIN' }, body: { enrollment_id: 1, attendance_score: 8, midterm_score: 7, final_score: 6 } });
        assert.equal(result.status, 500);
        assert.ok(statements.some(sql => sql.startsWith('UPDATE `grades`')));
        assert.ok(statements.some(sql => sql.startsWith('INSERT INTO `audit_logs`')));
        assert.equal(commits, 0);
        assert.equal(rollbacks, 1);
        assert.equal(releases, 1);
    } finally { db.getPool = originalPool; db.isUsingMock = originalMock; console.error = originalError; }
});
