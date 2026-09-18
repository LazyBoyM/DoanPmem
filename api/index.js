const app = require('../server/src/app');
const { initDb } = require('../server/src/config/db');
const { validateRuntime } = require('../server/src/config/runtime');

module.exports = async (req, res) => {
    try {
        validateRuntime();
        await initDb();
    } catch {
        // Do not expose connection strings or serve demo data after startup failure.
        return res.status(503).json({ success: false, message: 'Dịch vụ chưa sẵn sàng. Vui lòng thử lại sau.' });
    }
    return app(req, res);
};
