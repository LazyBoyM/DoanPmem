const { test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const { readStore } = require('../src/services/store');

async function sqlFixture(work) {
    const originalPool = db.getPool, originalMock = db.isUsingMock;
    const queries = [];
    db.isUsingMock = () => false;
    db.getPool = () => ({ query: async (sql, values = []) => {
        queries.push({ sql, values });
        const table = /FROM `([a-z_]+)`/.exec(sql)[1];
        let rows = db.mockDb[table];
        const columns = [...sql.matchAll(/`([a-z_]+)` <=> \?/g)].map(match => match[1]);
        rows = rows.filter(row => columns.every((key, index) => row[key] === values[index]));
        const related = /`([a-z_]+)` IN \(/.exec(sql);
        if (related) rows = rows.filter(row => values.includes(row[related[1]]));
        return [sql.startsWith('SELECT COUNT(*)') ? [{ total: String(rows.length) }] : structuredClone(rows)];
    } });
    try { await work(queries); }
    finally { db.getPool = originalPool; db.isUsingMock = originalMock; }
}

async function invoke(handler, req) {
    let result;
    await handler(req, { json: body => { result = body; }, status: code => { throw new Error(`HTTP ${code}`); } });
    return result;
}

test('dashboard counts match mock and SQL uses aggregates with enrollment status filter', async () => {
    const handler = require('../src/controllers/adminController').getDashboardStats;
    const expected = await invoke(handler, {});
    await sqlFixture(async queries => {
        assert.deepEqual(await invoke(handler, {}), expected);
        assert.equal(queries.length, 6);
        assert.ok(queries.every(q => q.sql.startsWith('SELECT COUNT(*) AS total')));
        assert.deepEqual(queries.at(-1).values, ['ENROLLED']);
        assert.equal(await readStore().count('students', { id: -1 }), 0);
    });
});

test('class roster queries only enrolled students and their grades in both role endpoints', async () => {
    const admin = require('../src/controllers/adminController').getClassEnrolledStudents;
    const lecturer = require('../src/controllers/lecturerController').getClassStudents;
    for (const handler of [admin, lecturer]) {
        const req = { params: { id: 1, classId: 1 }, user: { role: 'LECTURER', lecturer_id: 1 } };
        const expected = await invoke(handler, req);
        await sqlFixture(async queries => {
            assert.deepEqual(await invoke(handler, req), expected);
            const enrollments = db.mockDb.enrollments.filter(e => e.course_class_id === 1 && e.status === 'ENROLLED');
            assert.deepEqual(queries.find(q => q.sql.includes('FROM `students`')).values, [...new Set(enrollments.map(e => e.student_id))]);
            assert.deepEqual(queries.find(q => q.sql.includes('FROM `grades`')).values, enrollments.map(e => e.id));
            assert.match(queries.find(q => q.sql.includes('FROM `grades`')).sql, /WHERE `enrollment_id` IN/);
        });
    }
});

test('class queries filter semester, open status and lecturer before loading related data', async () => {
    const registration = require('../src/controllers/registrationController');
    const lecturer = require('../src/controllers/lecturerController');
    for (const [handler, filterValues] of [[registration.getAllClasses, [1]], [registration.getOpenClasses, [1, 'OPEN']], [lecturer.getMyClasses, [1, 1]]]) {
        const req = { query: { semester_id: '1' }, user: { role: 'LECTURER', lecturer_id: 1 } };
        const expected = await invoke(handler, req);
        await sqlFixture(async queries => {
            assert.deepEqual(await invoke(handler, req), expected);
            assert.deepEqual(queries[0].values, filterValues);
            assert.match(queries[0].sql, /WHERE .*`semester_id` <=> \?/);
        });
    }
    await sqlFixture(async queries => {
        const result = await invoke(registration.getOpenClasses, { query: { semester_id: '999' } });
        assert.deepEqual(result.data, []);
        assert.equal(queries.length, 1);
    });
});
