const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { databaseConfig } = require('../src/config/database');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function applyFacilitiesMigration(connection, sql) {
    const { statements } = require('./setup-db');
    for (const statement of statements(sql)) {
        if (/ADD COLUMN room_id/.test(statement)) {
            const [rows] = await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_schedules' AND COLUMN_NAME = 'room_id'");
            if (rows.length) continue;
        }
        if (/ADD CONSTRAINT fk_schedules_room/.test(statement)) {
            const [rows] = await connection.query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_schedules' AND CONSTRAINT_NAME = 'fk_schedules_room'");
            if (rows.length) continue;
        }
        if (/CREATE INDEX idx_schedules_room/.test(statement)) {
            const [rows] = await connection.query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_schedules' AND INDEX_NAME = 'idx_schedules_room'");
            if (rows.length) continue;
        }
        await connection.query(statement);
    }
}

async function migrate(only) {
    const { connectionLimit, waitForConnections, queueLimit, ...config } = databaseConfig();
    const connection = await mysql.createConnection({ ...config, multipleStatements: true });
    try {
        await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        const directory = path.join(__dirname, '../migrations');
        const names = (await fs.readdir(directory)).filter(name => name.endsWith('.sql')).sort();
        if (only !== undefined && !names.includes(only)) throw new Error('Unknown migration name');
        for (const name of names.filter(name => only === undefined || name === only)) {
            const [applied] = await connection.query('SELECT name FROM schema_migrations WHERE name = ?', [name]);
            if (applied.length) continue;
            let sql = await fs.readFile(path.join(directory, name), 'utf8');
            if (name === '002_class_grade_lock.sql') {
                const [columns] = await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_classes' AND COLUMN_NAME = 'grades_locked'");
                if (columns.length) sql = sql.replace(/^ALTER TABLE course_classes ADD COLUMN grades_locked[^;]*;/m, '');
            }
            if (name === '004_buildings_rooms.sql') await applyFacilitiesMigration(connection, sql);
            else await connection.query(sql);
            await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
            console.log(`Applied ${name}`);
        }
    } finally { await connection.end(); }
}
if (require.main === module) {
    const onlyIndex = process.argv.indexOf('--only');
    const only = onlyIndex < 0 ? undefined : process.argv[onlyIndex + 1] || '';
    migrate(only).catch(error => { console.error(`Migration failed: ${error.code || error.message}`); process.exitCode = 1; });
}
module.exports = { applyFacilitiesMigration };
