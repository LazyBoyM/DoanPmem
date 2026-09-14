const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/db');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files if built
app.use(express.static(path.join(__dirname, '../../client/public')));

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
async function startServer() {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`📚 API Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (err) {
        console.error('Không thể khởi động server:', err);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
