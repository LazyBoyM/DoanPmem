const jwt = require('jsonwebtoken');
const { getPool, isUsingMock, mockDb } = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_training_system_2026';

async function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập tài nguyên này.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        let user;
        if (isUsingMock()) {
            user = mockDb.users.find(u => u.id === decoded.id);
        } else {
            try {
                const [rows] = await getPool().query('SELECT id, status, role FROM users WHERE id = ?', [decoded.id]);
                user = rows[0];
            } catch (queryErr) {
                if (['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT'].includes(queryErr.code)) {
                    const [retryRows] = await getPool().query('SELECT id, status, role FROM users WHERE id = ?', [decoded.id]);
                    user = retryRows[0];
                } else {
                    throw queryErr;
                }
            }
        }
        if (!user || Number(user.status) !== 1 || user.role !== decoded.role) {
            return res.status(401).json({ success: false, message: 'Tài khoản không còn hoạt động. Vui lòng đăng nhập lại.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Không thể kiểm tra phiên đăng nhập.' });
        }
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
}

function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Từ chối truy cập. Chức năng này yêu cầu quyền: ${roles.join(' hoặc ')}.` 
            });
        }
        next();
    };
}

module.exports = {
    verifyToken,
    requireRole
};
