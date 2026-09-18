const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { databaseConfig } = require('../src/config/database');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    const { connectionLimit, waitForConnections, queueLimit, ...config } = databaseConfig();
    const connection = await mysql.createConnection({ ...config, multipleStatements: true });
    try {
        await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        const directory = path.join(__dirname, '../migrations');
        for (const name of (await fs.readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
            const [applied] = await connection.query('SELECT name FROM schema_migrations WHERE name = ?', [name]);
            if (applied.length) continue;
            let sql = await fs.readFile(path.join(directory, name), 'utf8');
            if (name === '002_class_grade_lock.sql') {
                const [columns] = await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_classes' AND COLUMN_NAME = 'grades_locked'");
                if (columns.length) sql = sql.replace(/^ALTER TABLE course_classes ADD COLUMN grades_locked[^;]*;/m, '');
            }
            // SQL comes exclusively from versioned local migration files.
            await connection.query(sql);
            await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
            console.log(`Applied ${name}`);
        }
    } finally { await connection.end(); }
}
migrate().catch(error => { console.error(`Migration failed: ${error.code || error.message}`); process.exitCode = 1; });
