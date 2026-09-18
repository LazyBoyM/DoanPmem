function validateRuntime(env = process.env) {
    if (env.NODE_ENV !== 'production' && !env.VERCEL) return;
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || env.JWT_SECRET === 'super_secret_jwt_key_for_training_system_2026') {
        throw new Error('Production requires a unique JWT_SECRET with at least 32 characters.');
    }
    if (env.DB_MODE === 'mock') throw new Error('Mock database is disabled in production.');
}
module.exports = { validateRuntime };
