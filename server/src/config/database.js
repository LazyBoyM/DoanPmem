const fs = require('node:fs');

function databaseConfig(env = process.env) {
    let address;
    if (env.DATABASE_URL) {
        try { address = new URL(env.DATABASE_URL); } catch { throw new Error('Invalid DATABASE_URL'); }
        if (address.protocol !== 'mysql:') throw new Error('DATABASE_URL must use mysql:');
        if (address.search) throw new Error('Configure database options using DB_* variables, not URL query parameters.');
    }
    const host = address?.hostname || env.DB_HOST || 'localhost';
    const production = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
    const cloud = /(?:^|\.)(?:tidbcloud\.com|aivencloud\.com)$/i.test(host);
    const sslEnabled = production || cloud || env.DB_SSL === 'true' || env.TIDB_ENABLE_SSL === 'true';
    if (production && (env.DB_SSL === 'false' || env.DB_SSL_REJECT_UNAUTHORIZED === 'false')) {
        throw new Error('Production requires verified database TLS.');
    }
    const port = Number(address?.port || env.DB_PORT || 3306);
    const connectionLimit = Number(env.DB_CONNECTION_LIMIT || (env.VERCEL ? 2 : 10));
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid DB_PORT');
    if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 100) throw new Error('Invalid DB_CONNECTION_LIMIT');
    const ssl = sslEnabled ? { minVersion: 'TLSv1.2', rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined;
    if (ssl && (env.DB_SSL_CA || env.DB_SSL_CA_PATH)) ssl.ca = env.DB_SSL_CA || fs.readFileSync(env.DB_SSL_CA_PATH, 'utf8');
    return {
        host, port,
        user: address ? decodeURIComponent(address.username) : env.DB_USER || 'root',
        password: address ? decodeURIComponent(address.password) : env.DB_PASSWORD || '',
        database: address ? decodeURIComponent(address.pathname.slice(1)) : env.DB_NAME || 'training_management',
        waitForConnections: true, connectionLimit, queueLimit: 100,
        connectTimeout: 10000, dateStrings: true, timezone: '+07:00',
        ...(ssl ? { ssl } : {})
    };
}
module.exports = { databaseConfig };
