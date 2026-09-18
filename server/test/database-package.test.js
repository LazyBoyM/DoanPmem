const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bcrypt = require('bcryptjs');
const { setup, statements } = require('../scripts/setup-db');
const { convertGrade, isScheduleOverlap } = require('../src/services/scheduleConflictService');
const root = path.join(__dirname, '../../database');
const ddl = statements(fs.readFileSync(path.join(root, 'tables.sql'), 'utf8'));
const seed = statements(fs.readFileSync(path.join(root, 'seed.sql'), 'utf8'));
const rows = {};
for (const sql of seed) {
    const match = /INSERT INTO `(\w+)` \((.*?)\) VALUES([\s\S]*?)ON DUPLICATE KEY/.exec(sql);
    assert.ok(match, sql);
    const keys = [...match[2].matchAll(/`(\w+)`/g)].map(m => m[1]);
    // Parse only this repository's numeric/string literal demo tuples, never user input.
    const tuples = vm.runInNewContext('[' + match[3].trim().replaceAll('(', '[').replaceAll(')', ']') + ']');
    rows[match[1]] = tuples.map(tuple => Object.fromEntries(keys.map((key, i) => [key, tuple[i]])));
}
test('database package creates parents first and each editor file contains one statement', () => {
    const created = new Set();
    for (const sql of ddl) {
        for (const match of sql.matchAll(/REFERENCES `(\w+)`/g)) assert.ok(created.has(match[1]), match[1]);
        created.add(/CREATE TABLE IF NOT EXISTS `(\w+)`/.exec(sql)[1]);
    }
    assert.equal(created.size, 13);
    const files = fs.readdirSync(path.join(root, 'tables')).sort();
    assert.equal(files.length, 13);
    files.forEach((file, i) => assert.deepEqual(statements(fs.readFileSync(path.join(root, 'tables', file), 'utf8')), [ddl[i]]));
    assert.deepEqual(statements(fs.readFileSync(path.join(root, '../schema.sql'), 'utf8')), [...ddl, ...seed]);
});
test('demo keys, references, capacity, grades, passwords and lecturer schedules are consistent', () => {
    for (const sql of ddl) {
        const table = /CREATE TABLE IF NOT EXISTS `(\w+)`/.exec(sql)[1];
        const data = rows[table];
        assert.equal(new Set(data.map(row => row.id)).size, data.length, table);
        for (const match of sql.matchAll(/FOREIGN KEY \(`(\w+)`\) REFERENCES `(\w+)` \(`(\w+)`\)/g)) {
            for (const row of data) assert.ok(rows[match[2]].some(parent => parent[match[3]] === row[match[1]]), `${table}.${match[1]}`);
        }
    }
    for (const user of rows.users) assert.ok(bcrypt.compareSync('123456', user.password));
    for (const cls of rows.course_classes) {
        assert.equal(cls.current_students, rows.enrollments.filter(e => e.course_class_id === cls.id && e.status === 'ENROLLED').length);
    }
    for (const grade of rows.grades) {
        const expected = convertGrade(grade.attendance_score, grade.midterm_score, grade.final_score);
        assert.equal(grade.total_score_10, expected.total10);
        assert.equal(grade.total_score_4, expected.total4);
        assert.equal(grade.letter_grade, expected.letter);
    }
    for (const enrollment of rows.enrollments) {
        const cls = rows.course_classes.find(c => c.id === enrollment.course_class_id);
        assert.equal(rows.prerequisites.filter(p => p.subject_id === cls.subject_id).length, 0);
    }
    for (const a of rows.class_schedules) for (const b of rows.class_schedules) {
        if (a.id >= b.id) continue;
        const ca = rows.course_classes.find(c => c.id === a.course_class_id), cb = rows.course_classes.find(c => c.id === b.course_class_id);
        if (ca.lecturer_id === cb.lecturer_id || a.room === b.room) assert.equal(isScheduleOverlap(a, b), false);
    }
});
function fakeConnection({ populated = false, failSeed = false } = {}) {
    const calls = [];
    return { calls, query: async (sql, params) => {
        calls.push(sql);
        if (sql.startsWith('SELECT DATABASE')) return [[{ name: 'test' }]];
        if (sql.includes('information_schema.TABLES')) return [populated ? [{ name: 'users' }] : []];
        if (sql.startsWith('SELECT 1')) return [[{ value: 1 }]];
        if (sql.includes('information_schema.COLUMNS')) {
            const definition = ddl.find(s => s.startsWith('CREATE TABLE IF NOT EXISTS `' + params[0] + '`'));
            return [[...definition.matchAll(/^\s*`(\w+)`/gm)].map(m => ({ name: m[1] }))];
        }
        if (failSeed && sql.startsWith('INSERT')) throw { code: 'TEST_FAILURE' };
        if (sql.startsWith('SELECT COUNT')) return [[{ count: 2 }]];
        return [[]];
    }, beginTransaction: async () => calls.push('BEGIN'), commit: async () => calls.push('COMMIT'), rollback: async () => calls.push('ROLLBACK') };
}
test('setup runs DDL before seeding, protects existing data and rolls back failed seed', async () => {
    const success = fakeConnection(); await setup(success, root, () => {});
    assert.equal(success.calls.filter(s => s.startsWith('CREATE TABLE')).length, 13);
    assert.equal(success.calls.at(-1), 'COMMIT');
    const populated = fakeConnection({ populated: true });
    await assert.rejects(setup(populated, root, () => {}), /already contains/);
    assert.ok(!populated.calls.some(s => /^(CREATE|INSERT|DELETE|UPDATE)/.test(s)));
    const failure = fakeConnection({ failSeed: true });
    await assert.rejects(setup(failure, root, () => {}), /Seed statement 1/);
    assert.equal(failure.calls.at(-1), 'ROLLBACK');
});
