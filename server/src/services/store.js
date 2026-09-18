const db = require('../config/db');
const tables = new Set(['users', 'departments', 'programs', 'students', 'lecturers', 'subjects', 'prerequisites', 'semesters', 'registration_periods', 'course_classes', 'class_schedules', 'enrollments', 'grades']);
const counters = new Map();
let mockQueue = Promise.resolve();

function identifier(value) {
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid database identifier');
    return '`' + value + '`';
}
function createStore(connection, writing = false, memory = db.mockDb) {
    function tableName(table) {
        if (!tables.has(table)) throw new Error('Invalid table');
        return identifier(table);
    }
    function where(filter) {
        const entries = Object.entries(filter);
        return [entries.length ? ' WHERE ' + entries.map(([key]) => `${identifier(key)} <=> ?`).join(' AND ') : '', entries.map(([, value]) => value)];
    }
    return {
        async list(table, filter = {}, options = {}) {
            const name = tableName(table);
            if (!connection) return structuredClone(memory[table].filter(row => Object.entries(filter).every(([key, value]) => row[key] === value)));
            const [clause, values] = where(filter);
            const [rows] = await connection.query(`SELECT * FROM ${name}${clause} ORDER BY id${writing && (options.lock ?? Object.keys(filter).length > 0) ? ' FOR UPDATE' : ''}`, values);
            return rows;
        },
        // Related data is read without locking unrelated rows or entire tables.
        async related(table, key, ids) {
            const name = tableName(table), column = identifier(key);
            const values = [...new Set(ids)];
            if (!values.length) return [];
            if (!connection) return structuredClone(memory[table].filter(row => values.includes(row[key])));
            const [rows] = await connection.query(`SELECT * FROM ${name} WHERE ${column} IN (${values.map(() => '?').join(',')}) ORDER BY id`, values);
            return rows;
        },
        async one(table, filter) { return (await this.list(table, filter))[0] || null; },
        async insert(table, data) {
            const name = tableName(table);
            if (!connection) {
                const id = Math.max(counters.get(table) || 0, ...memory[table].map(row => row.id || 0)) + 1;
                counters.set(table, id);
                memory[table].push({ ...structuredClone(data), id });
                return { ...data, id };
            }
            const keys = Object.keys(data);
            const [result] = await connection.query(`INSERT INTO ${name} (${keys.map(identifier).join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(data));
            return { ...data, id: result.insertId };
        },
        async update(table, id, data) {
            const name = tableName(table);
            if (!connection) {
                const row = memory[table].find(item => item.id === id);
                if (row) Object.assign(row, structuredClone(data));
                return;
            }
            const keys = Object.keys(data);
            if (keys.length) await connection.query(`UPDATE ${name} SET ${keys.map(key => `${identifier(key)} = ?`).join(',')} WHERE id = ?`, [...Object.values(data), id]);
        },
        async remove(table, filter) {
            const name = tableName(table);
            if (!Object.keys(filter).length) throw new Error('Delete requires a filter');
            if (!connection) {
                memory[table] = memory[table].filter(row => !Object.entries(filter).every(([key, value]) => row[key] === value));
                return;
            }
            const [clause, values] = where(filter);
            await connection.query(`DELETE FROM ${name}${clause}`, values);
        }
    };
}
function readStore() { return createStore(db.isUsingMock() ? null : db.getPool()); }
async function transaction(work) {
    if (db.isUsingMock()) {
        const previous = mockQueue;
        let release;
        mockQueue = new Promise(resolve => { release = resolve; });
        await previous;
        const snapshot = structuredClone(db.mockDb);
        try {
            const result = await work(createStore(null, true, snapshot));
            Object.assign(db.mockDb, snapshot);
            return result;
        }
        finally { release(); }
    }
    for (let attempt = 0; ; attempt++) {
        const connection = await db.getPool().getConnection();
        try {
            await connection.beginTransaction();
            const result = await work(createStore(connection, true));
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            if (!['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code) || attempt >= 2) throw error;
        } finally { connection.release(); }
    }
}
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function endpoint(work, writing = false) {
    return async (req, res) => {
        try {
            const body = writing ? await transaction(store => work(req, store)) : await work(req, readStore());
            res.json({ success: true, ...body });
        } catch (error) {
            const status = error.status || (['ER_DUP_ENTRY', 'ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(error.code) ? 409 : 500);
            if (status === 500) console.error(error);
            res.status(status).json({ success: false, message: error.status ? error.message : status === 409 ? 'Dá»¯ liá»‡u bá»‹ trÃ¹ng hoáº·c Ä‘ang Ä‘Æ°á»£c sá»­ dá»¥ng.' : 'KhÃ´ng thá»ƒ xá»­ lÃ½ yÃªu cáº§u. Vui lÃ²ng thá»­ láº¡i.' });
        }
    };
}
module.exports = { readStore, transaction, endpoint, fail };
