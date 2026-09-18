const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { databaseConfig } = require('../src/config/database');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// These versioned files contain simple statements, with no routines or semicolons in strings.
function statements(sql) {
    return sql.replace(/^\s*--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
}
async function setup(connection, root = path.join(__dirname, '../../database'), log = console.log) {
    const ddl = statements(await fs.readFile(path.join(root, 'tables.sql'), 'utf8'));
    const seed = statements(await fs.readFile(path.join(root, 'seed.sql'), 'utf8'));
    const tables = ddl.map(sql => /CREATE TABLE IF NOT EXISTS `(\w+)`/.exec(sql)?.[1]);
    if (tables.length !== 13 || tables.some(t => !t)) throw new Error('Invalid table package');
    const [db] = await connection.query('SELECT DATABASE() AS name');
    if (!db[0]?.name || ['sys', 'mysql', 'information_schema', 'performance_schema'].includes(db[0].name)) {
        throw new Error('Select an application database, for example DB_NAME=test.');
    }
    const [existing] = await connection.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
    // Recover an interrupted DDL-only import, but never merge fixed demo IDs into user data.
    for (const table of tables.filter(t => existing.some(row => row.name === t))) {
        const [rows] = await connection.query(`SELECT 1 FROM \`${table}\` LIMIT 1`);
        if (rows.length) throw new Error('Database already contains application data. Use an empty database; no existing data has been changed.');
    }
    for (let i = 0; i < ddl.length; i++) {
        try {
            await connection.query(ddl[i]);
            const [columns] = await connection.query('SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [tables[i]]);
            const required = [...ddl[i].matchAll(/^\s*`(\w+)`/gm)].map(m => m[1]);
            if (required.some(name => !columns.some(c => c.name === name))) throw new Error('Existing table has an incompatible schema; use a new empty database.');
            log(`Table ${i + 1}/13: ${tables[i]}`);
        } catch (error) { throw new Error(`Create ${tables[i]} failed: ${error.code || error.message}`); }
    }
    await connection.beginTransaction();
    try {
        for (let i = 0; i < seed.length; i++) {
            try { await connection.query(seed[i]); }
            catch (error) { throw new Error(`Seed statement ${i + 1} failed: ${error.code || 'SQL error'}`); }
        }
        const [counts] = await connection.query('SELECT COUNT(*) AS count FROM grades');
        if (Number(counts[0].count) !== 2) throw new Error('Seed verification failed');
        await connection.commit();
        log('Ready: 13 tables and demo data imported.');
    } catch (error) {
        await connection.rollback();
        throw error;
    }
}
async function main() {
    const { connectionLimit, waitForConnections, queueLimit, ...config } = databaseConfig();
    const connection = await mysql.createConnection(config);
    try { await setup(connection); } finally { await connection.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
module.exports = { setup, statements };
