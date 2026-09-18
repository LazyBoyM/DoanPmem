const { test } = require('node:test');
const assert = require('node:assert/strict');
const { databaseConfig } = require('../src/config/database');
const { validateRuntime } = require('../src/config/runtime');

test('database URL and discrete settings resolve identically with verified cloud TLS', () => {
    const url = databaseConfig({ DATABASE_URL: 'mysql://user:p%40ss@db.tidbcloud.com:4000/training' });
    const fields = databaseConfig({ DB_HOST: 'db.tidbcloud.com', DB_USER: 'user', DB_PASSWORD: 'p@ss', DB_PORT: '4000', DB_NAME: 'training' });
    assert.deepEqual(url, fields);
    assert.equal(url.ssl.rejectUnauthorized, true);
    assert.equal(url.ssl.minVersion, 'TLSv1.2');
    assert.equal(databaseConfig({ VERCEL: '1' }).connectionLimit, 2);
});

test('TLS accepts a supplied CA and production rejects insecure overrides', () => {
    assert.equal(databaseConfig({ DB_SSL: 'true', DB_SSL_CA: 'test CA' }).ssl.ca, 'test CA');
    for (const override of [{ DB_SSL: 'false' }, { DB_SSL_REJECT_UNAUTHORIZED: 'false' }]) {
        assert.throws(() => databaseConfig({ NODE_ENV: 'production', ...override }), /verified database TLS/);
    }
    assert.throws(() => databaseConfig({ DATABASE_URL: 'mysql://user:pass@host/db?ssl=false' }), /query parameters/);
    assert.throws(() => databaseConfig({ DB_CONNECTION_LIMIT: 'NaN' }), /DB_CONNECTION_LIMIT/);
    assert.throws(() => databaseConfig({ DB_PORT: '0' }), /DB_PORT/);
});

test('serverless and standalone production enforce the same secret and mock restrictions', () => {
    for (const env of [{ VERCEL: '1' }, { NODE_ENV: 'production' }]) {
        assert.throws(() => validateRuntime(env), /JWT_SECRET/);
        assert.throws(() => validateRuntime({ ...env, JWT_SECRET: 'super_secret_jwt_key_for_training_system_2026' }), /JWT_SECRET/);
        assert.throws(() => validateRuntime({ ...env, JWT_SECRET: 'x'.repeat(40), DB_MODE: 'mock' }), /Mock/);
        assert.doesNotThrow(() => validateRuntime({ ...env, JWT_SECRET: 'x'.repeat(40), DB_MODE: 'mysql' }));
    }
});

test('serverless stops with 503 on failed initialization and never invokes the application', async () => {
    const db = require('../src/config/db');
    const appPath = require.resolve('../src/app');
    const handlerPath = require.resolve('../../api');
    const previousApp = require.cache[appPath], previousHandler = require.cache[handlerPath], previousInit = db.initDb;
    let appCalls = 0;
    require.cache[appPath] = { id: appPath, filename: appPath, loaded: true, exports: () => { appCalls++; } };
    let fail = true;
    db.initDb = async () => { if (fail) throw new Error('private credentials'); };
    delete require.cache[handlerPath];
    try {
        const handler = require(handlerPath);
        let status, body;
        const response = { status(code) { status = code; return this; }, json(data) { body = data; } };
        await handler({}, response);
        assert.equal(status, 503);
        assert.equal(body.success, false);
        assert.doesNotMatch(JSON.stringify(body), /private credentials/);
        assert.equal(appCalls, 0);
        fail = false;
        await handler({}, response);
        assert.equal(appCalls, 1);
    } finally {
        db.initDb = previousInit;
        if (previousApp) require.cache[appPath] = previousApp; else delete require.cache[appPath];
        if (previousHandler) require.cache[handlerPath] = previousHandler; else delete require.cache[handlerPath];
    }
});

test('concurrent cold starts share one pool; failed pools close and later initialization retries', async () => {
    const mysql = require('mysql2/promise');
    const dbPath = require.resolve('../src/config/db');
    const previousModule = require.cache[dbPath], originalCreate = mysql.createPool;
    const previousEnv = { ...process.env };
    let created = 0, ended = 0, released = 0, fail = true;
    process.env.DB_MODE = 'mysql';
    delete require.cache[dbPath];
    mysql.createPool = () => {
        created++;
        return { getConnection: async () => { await Promise.resolve(); if (fail) throw new Error('offline'); return { release: () => { released++; } }; }, end: async () => { ended++; } };
    };
    try {
        const db = require(dbPath);
        const results = await Promise.allSettled([db.initDb(), db.initDb(), db.initDb()]);
        assert.ok(results.every(r => r.status === 'rejected'));
        assert.equal(created, 1);
        assert.equal(ended, 1);
        fail = false;
        await Promise.all([db.initDb(), db.initDb()]);
        await db.initDb();
        assert.equal(created, 2);
        assert.equal(released, 1);
        assert.equal(db.isUsingMock(), false);
    } finally {
        mysql.createPool = originalCreate;
        require.cache[dbPath] = previousModule;
        for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
        Object.assign(process.env, previousEnv);
    }
});
