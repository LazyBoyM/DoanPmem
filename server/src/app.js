const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/db');
const { validateRuntime } = require('./config/runtime');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files if built
app.use(express.static(path.join(__dirname, '../../client/dist')));

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'Training Management & Course Registration API',
        timestamp: new Date().toISOString()
    });
});

// Start Server
app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'API không tồn tại.' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../../client/dist/index.html')));

async function startServer() {
    try {
        validateRuntime();
        await initDb();
        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`📚 API Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (err) {
        console.error('Không thể khởi động server:', err);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
