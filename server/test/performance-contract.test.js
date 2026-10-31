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

test('batched transcripts match individual reports, including semester filters and empty enrollments', async () => {
    const { transcript, transcriptsForStudents } = require('../src/services/transcript');
    const store = readStore();
    const students = await store.list('students');
    for (const semesterId of [undefined, 1, 999]) {
        const expected = await Promise.all(students.map(s => transcript(store, s.id, semesterId)));
        await sqlFixture(async () => {
            assert.deepEqual(await transcriptsForStudents(readStore(), students, semesterId), expected);
        });
    }
    assert.deepEqual(await transcriptsForStudents(store, []), []);
});

test('academic directory query count stays constant as the number of students grows', async () => {
    const handler = require('../src/controllers/academicController').getStudents;
    const original = db.mockDb.students;
    const originalEnrollments = db.mockDb.enrollments;
    try {
        let initialCount;
        await sqlFixture(async queries => {
            const result = await invoke(handler, { user: { role: 'ADMIN' }, query: {} });
            assert.equal(result.data.length, original.length);
            initialCount = queries.length;
            assert.ok(initialCount <= 12);
        });
        db.mockDb.students = [...original, ...Array.from({ length: 50 }, (_, index) => ({ ...original[0], id: 1000 + index }))];
        db.mockDb.enrollments = [...originalEnrollments, ...Array.from({ length: 50 }, (_, index) => ({ ...originalEnrollments[0], id: 1000 + index, student_id: 1000 + index }))];
        await sqlFixture(async queries => {
            const result = await invoke(handler, { user: { role: 'ADMIN' }, query: {} });
            assert.equal(result.data.length, original.length + 50);
            assert.equal(queries.length, initialCount);
            assert.equal(result.data.at(-1).gpa4, '0.00');
            assert.equal(result.data.at(-1).passed_credits, 0);
        });
    } finally { db.mockDb.students = original; db.mockDb.enrollments = originalEnrollments; }
});
