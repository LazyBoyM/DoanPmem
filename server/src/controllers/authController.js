const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readStore, endpoint, fail } = require('../services/store');
const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_for_training_system_2026';
async function profile(store, user) {
    const student = user.role === 'STUDENT' ? await store.one('students', { user_id: user.id }) : null;
    const lecturer = user.role === 'LECTURER' ? await store.one('lecturers', { user_id: user.id }) : null;
    if ((user.role === 'STUDENT' && !student) || (user.role === 'LECTURER' && !lecturer)) fail('Tài khoản chưa liên kết hồ sơ. Vui lòng liên hệ quản trị viên.');
    return { id: user.id, username: user.username, role: user.role, email: user.email, student_id: student?.id || null,
        student_code: student?.student_code || null, lecturer_id: lecturer?.id || null, full_name: student?.full_name || lecturer?.full_name || 'Quản trị viên' };
}
const login = endpoint(async req => {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) fail('Vui lòng nhập tên đăng nhập và mật khẩu.');
    const store = readStore();
    const user = (await store.list('users')).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || user.status !== 1 || !await bcrypt.compare(password, user.password)) fail('Tài khoản hoặc mật khẩu không chính xác, hoặc tài khoản đã bị khóa.');
    const data = await profile(store, user);
    return { token: jwt.sign(data, secret, { expiresIn: '24h' }), user: data, message: 'Đăng nhập thành công.' };
});
const getProfile = endpoint(async (req, store) => {
    const user = await store.one('users', { id: req.user.id });
    if (!user) fail('Tài khoản không tồn tại.', 401);
    return { data: await profile(store, user) };
});
module.exports = { login, getProfile };
