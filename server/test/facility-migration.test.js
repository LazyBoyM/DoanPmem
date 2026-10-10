const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { applyFacilitiesMigration } = require('../scripts/migrate');
const sql = fs.readFileSync(path.join(__dirname, '../migrations/004_buildings_rooms.sql'), 'utf8');
test('facility migration can restart after auto-committed DDL without duplicating columns or constraints', async () => {
    const existing = new Set(), executed = [];
    const connection = { query: async statement => {
        if (statement.includes('information_schema.COLUMNS')) return [existing.has('column') ? [{}] : []];
        if (statement.includes('information_schema.TABLE_CONSTRAINTS')) return [existing.has('constraint') ? [{}] : []];
        if (statement.includes('information_schema.STATISTICS')) return [existing.has('index') ? [{}] : []];
        if (statement.includes('ADD COLUMN room_id')) { assert.ok(!existing.has('column')); existing.add('column'); }
        if (statement.includes('ADD CONSTRAINT fk_schedules_room')) { assert.ok(!existing.has('constraint')); existing.add('constraint'); }
        if (statement.includes('CREATE INDEX idx_schedules_room')) { assert.ok(!existing.has('index')); existing.add('index'); }
        executed.push(statement); return [[]];
    } };
    await applyFacilitiesMigration(connection, sql);
    await applyFacilitiesMigration(connection, sql);
    for (const part of ['ADD COLUMN room_id', 'ADD CONSTRAINT fk_schedules_room', 'CREATE INDEX idx_schedules_room']) assert.equal(executed.filter(s => s.includes(part)).length, 1);
    assert.ok(executed.some(s => /UPDATE class_schedules/.test(s) && /WHERE s.room_id IS NULL/.test(s)));
    assert.ok(!executed.some(s => /^(DELETE|TRUNCATE|DROP TABLE)\b/.test(s)));
});

test('SQL allocations take catalog lock before class locks and scopes room enrichment by IDs', async () => {
    const db = require('../src/config/db');
    const { transaction } = require('../src/services/store');
    const { lockFacilities, resolveRooms } = require('../src/services/facilities');
    const { classesWithDetails } = require('../src/services/academic');
    const originalMock = db.isUsingMock, originalPool = db.getPool;
    const calls = [];
    const rows = { buildings: [{ id: 1, building_code: 'A', status: 'ACTIVE' }], rooms: [{ id: 1, building_id: 1, room_code: '101', capacity: 40, status: 'ACTIVE' }],
        course_classes: [{ id: 1, subject_id: 1, lecturer_id: null }], subjects: [{ id: 1 }], class_schedules: [{ id: 1, course_class_id: 1, room_id: 1, room: 'OLD' }] };
    const connection = { beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
        query: async (sql, values) => { calls.push({ sql, values }); return [rows[/FROM `([a-z_]+)`/.exec(sql)?.[1]] || []]; } };
    db.isUsingMock = () => false; db.getPool = () => ({ getConnection: async () => connection });
    try {
        await transaction(async store => {
            await lockFacilities(store);
            assert.equal((await resolveRooms(store, [{ room_id: 1 }], 40))[0].room, 'A · 101');
            assert.equal((await classesWithDetails(store))[0].schedules[0].room, 'A · 101');
        });
        assert.match(calls[0].sql, /FROM `buildings` ORDER BY id FOR UPDATE/);
        assert.ok(calls.some(c => /FROM `rooms` WHERE `id` IN/.test(c.sql) && c.values[0] === 1));
    } finally { db.isUsingMock = originalMock; db.getPool = originalPool; }
});
