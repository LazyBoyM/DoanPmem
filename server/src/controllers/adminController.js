const bcrypt = require('bcryptjs');
const { getPool, isUsingMock, mockDb } = require('../config/db');

// Default bcrypt hash for '123456'
const DEFAULT_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// ==========================================================
// 1. THỐNG KÊ TỔNG QUAN HỆ THỐNG
// ==========================================================
async function getDashboardStats(req, res) {
    try {
        if (isUsingMock()) {
            return res.json({
                success: true,
                stats: {
                    total_users: mockDb.users.length,
                    total_students: mockDb.students.length,
                    total_lecturers: mockDb.lecturers.length,
                    total_subjects: mockDb.subjects.length,
                    total_classes: mockDb.course_classes.length,
                    total_enrollments: mockDb.enrollments.filter(e => e.status === 'ENROLLED').length
                }
            });
        }

        const pool = getPool();
        const [[{ count: total_users }]] = await pool.query('SELECT COUNT(*) AS count FROM users');
        const [[{ count: total_students }]] = await pool.query('SELECT COUNT(*) AS count FROM students');
        const [[{ count: total_lecturers }]] = await pool.query('SELECT COUNT(*) AS count FROM lecturers');
        const [[{ count: total_subjects }]] = await pool.query('SELECT COUNT(*) AS count FROM subjects');
        const [[{ count: total_classes }]] = await pool.query('SELECT COUNT(*) AS count FROM course_classes');
        const [[{ count: total_enrollments }]] = await pool.query('SELECT COUNT(*) AS count FROM enrollments WHERE status = "ENROLLED"');

        return res.json({
            success: true,
            stats: {
                total_users,
                total_students,
                total_lecturers,
                total_subjects,
                total_classes,
                total_enrollments
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi lấy thống kê: ' + err.message });
    }
}

// ==========================================================
// 2. QUẢN LÝ TÀI KHOẢN VÀ PHÂN QUYỀN (CHỨC NĂNG 1)
// ==========================================================
async function getAllUsers(req, res) {
    try {
        if (isUsingMock()) {
            // Ẩn tài khoản Admin khỏi danh sách quản lý người dùng
            const list = mockDb.users
                .filter(u => u.role !== 'ADMIN')
                .map(u => {
                    const { password, ...safeUser } = u;
                    return safeUser;
                });
            return res.json({ success: true, data: list });
        }

        const pool = getPool();
        // Ẩn tài khoản có role = 'ADMIN' khỏi danh sách
        const [users] = await pool.query('SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE role != "ADMIN" ORDER BY id DESC');
        return res.json({ success: true, data: users });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tài khoản: ' + err.message });
    }
}

async function createUser(req, res) {
    const { username, password, email, role } = req.body;
    if (!username || !email || !role) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin username, email và vai trò.' });
    }

    try {
        const hashedPassword = password ? await bcrypt.hash(password, 10) : DEFAULT_PASSWORD_HASH;

        if (isUsingMock()) {
            const exists = mockDb.users.some(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
            if (exists) {
                return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc email đã được sử dụng.' });
            }

            const newUser = {
                id: mockDb.users.length + 1,
                username,
                password: hashedPassword,
                email,
                role: role.toUpperCase(),
                status: 1,
                created_at: new Date().toISOString()
            };
            mockDb.users.push(newUser);
            const { password: _, ...safeUser } = newUser;
            return res.json({ success: true, message: 'Tạo tài khoản thành công.', data: safeUser });
        }

        const pool = getPool();
        const [result] = await pool.query(
            'INSERT INTO users (username, password, email, role, status) VALUES (?, ?, ?, ?, 1)',
            [username, hashedPassword, email, role.toUpperCase()]
        );

        return res.json({ success: true, message: 'Tạo tài khoản thành công.', userId: result.insertId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi tạo tài khoản: ' + err.message });
    }
}

async function toggleUserStatus(req, res) {
    const { id } = req.params;
    const targetId = Number(id);

    // Không thể tự khóa tài khoản của chính mình
    if (req.user && req.user.id === targetId) {
        return res.status(400).json({ success: false, message: 'Bạn không thể tự khóa tài khoản của chính mình!' });
    }

    try {
        if (isUsingMock()) {
            const user = mockDb.users.find(u => u.id === targetId);
            if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

            // Không thể khóa tài khoản có vai trò Quản trị viên
            if (user.role === 'ADMIN' || user.username.toLowerCase() === 'admin') {
                return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản Quản trị viên (Admin)!' });
            }

            user.status = user.status === 1 ? 0 : 1;
            return res.json({ success: true, message: `Tài khoản ${user.username} hiện đang ${user.status === 1 ? 'Hoạt động' : 'Bị khóa'}.`, status: user.status });
        }

        const pool = getPool();
        const [users] = await pool.query('SELECT id, username, role, status FROM users WHERE id = ?', [targetId]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

        // Không thể khóa tài khoản Quản trị viên
        if (users[0].role === 'ADMIN' || users[0].username.toLowerCase() === 'admin') {
            return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản Quản trị viên (Admin)!' });
        }

        const newStatus = users[0].status === 1 ? 0 : 1;
        await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, targetId]);
        return res.json({ success: true, message: `Tài khoản ${users[0].username} hiện đang ${newStatus === 1 ? 'Hoạt động' : 'Bị khóa'}.`, status: newStatus });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái: ' + err.message });
    }
}

async function resetUserPassword(req, res) {
    const { id } = req.params;
    const newPass = req.body.password || '123456';

    try {
        const hashed = await bcrypt.hash(newPass, 10);
        if (isUsingMock()) {
            const user = mockDb.users.find(u => u.id === Number(id));
            if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
            user.password = hashed;
            return res.json({ success: true, message: `Đã đặt lại mật khẩu về mặc định (${newPass}) thành công.` });
        }

        const pool = getPool();
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);
        return res.json({ success: true, message: `Đã đặt lại mật khẩu về mặc định (${newPass}) thành công.` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi đặt lại mật khẩu: ' + err.message });
    }
}

// ==========================================================
// 3. QUẢN LÝ SINH VIÊN VÀ GIẢNG VIÊN (CHỨC NĂNG 2)
// ==========================================================

// Sinh viên
async function getAllStudents(req, res) {
    try {
        if (isUsingMock()) {
            const list = mockDb.students.map(s => {
                const user = mockDb.users.find(u => u.id === s.user_id);
                const prog = mockDb.programs.find(p => p.id === s.program_id);
                return {
                    ...s,
                    username: user ? user.username : '',
                    email: user ? user.email : '',
                    status: user ? user.status : 1,
                    program_name: prog ? prog.program_name : (s.program_name || 'Công nghệ Thông tin')
                };
            });
            return res.json({ success: true, data: list });
        }

        const pool = getPool();
        const [students] = await pool.query(`
            SELECT s.*, u.username, u.email, u.status, p.program_name
            FROM students s
            JOIN users u ON s.user_id = u.id
            JOIN programs p ON s.program_id = p.id
            ORDER BY s.id DESC
        `);
        return res.json({ success: true, data: students });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function createStudent(req, res) {
    const { student_code, full_name, gender, birth_date, phone, address, program_id, academic_year, class_name, email, password } = req.body;
    if (!student_code || !full_name || !class_name) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ mã SV, họ tên và lớp sinh hoạt.' });
    }

    try {
        const username = student_code.toLowerCase();
        const studentEmail = email || `${username}@sinhvien.utt.edu.vn`;
        const hashedPassword = password ? await bcrypt.hash(password, 10) : DEFAULT_PASSWORD_HASH;

        if (isUsingMock()) {
            const userExists = mockDb.users.some(u => u.username.toLowerCase() === username);
            if (userExists) return res.status(400).json({ success: false, message: 'Mã sinh viên này đã có tài khoản trên hệ thống.' });

            const newUserId = mockDb.users.length + 1;
            mockDb.users.push({
                id: newUserId,
                username,
                password: hashedPassword,
                email: studentEmail,
                role: 'STUDENT',
                status: 1
            });

            const newStudent = {
                id: mockDb.students.length + 1,
                user_id: newUserId,
                student_code: student_code.toUpperCase(),
                full_name,
                gender: gender || 'Nam',
                birth_date: birth_date || '2004-01-01',
                phone: phone || '',
                address: address || '',
                program_id: Number(program_id) || 1,
                academic_year: academic_year || 'K74',
                class_name
            };
            mockDb.students.push(newStudent);
            return res.json({ success: true, message: 'Thêm sinh viên thành công.', data: newStudent });
        }

        const pool = getPool();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [uRes] = await conn.query(
                'INSERT INTO users (username, password, email, role, status) VALUES (?, ?, ?, "STUDENT", 1)',
                [username, hashedPassword, studentEmail]
            );
            const userId = uRes.insertId;

            await conn.query(
                'INSERT INTO students (user_id, student_code, full_name, gender, birth_date, phone, address, program_id, academic_year, class_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, student_code.toUpperCase(), full_name, gender || 'Nam', birth_date, phone, address, program_id || 1, academic_year || 'K74', class_name]
            );
            await conn.commit();
            return res.json({ success: true, message: 'Thêm sinh viên thành công.' });
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi thêm sinh viên: ' + err.message });
    }
}

async function updateStudent(req, res) {
    const { id } = req.params;
    const { full_name, gender, birth_date, phone, address, class_name } = req.body;

    try {
        if (isUsingMock()) {
            const st = mockDb.students.find(s => s.id === Number(id));
            if (!st) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
            if (full_name) st.full_name = full_name;
            if (gender) st.gender = gender;
            if (birth_date) st.birth_date = birth_date;
            if (phone) st.phone = phone;
            if (address) st.address = address;
            if (class_name) st.class_name = class_name;
            return res.json({ success: true, message: 'Cập nhật sinh viên thành công.', data: st });
        }

        const pool = getPool();
        await pool.query(
            'UPDATE students SET full_name = ?, gender = ?, birth_date = ?, phone = ?, address = ?, class_name = ? WHERE id = ?',
            [full_name, gender, birth_date, phone, address, class_name, id]
        );
        return res.json({ success: true, message: 'Cập nhật sinh viên thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật: ' + err.message });
    }
}

async function deleteStudent(req, res) {
    const { id } = req.params;
    try {
        if (isUsingMock()) {
            const idx = mockDb.students.findIndex(s => s.id === Number(id));
            if (idx === -1) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
            const [deleted] = mockDb.students.splice(idx, 1);
            mockDb.users = mockDb.users.filter(u => u.id !== deleted.user_id);
            return res.json({ success: true, message: 'Xóa hồ sơ sinh viên thành công.' });
        }

        const pool = getPool();
        const [st] = await pool.query('SELECT user_id FROM students WHERE id = ?', [id]);
        if (st.length > 0) {
            await pool.query('DELETE FROM users WHERE id = ?', [st[0].user_id]);
        }
        return res.json({ success: true, message: 'Xóa hồ sơ sinh viên thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi xóa sinh viên: ' + err.message });
    }
}

// Giảng viên
async function getAllLecturers(req, res) {
    try {
        if (isUsingMock()) {
            const list = mockDb.lecturers.map(l => {
                const dept = mockDb.departments.find(d => d.id === l.department_id);
                const user = mockDb.users.find(u => u.id === l.user_id);
                return {
                    ...l,
                    department_name: dept ? dept.department_name : 'Bộ môn CNTT',
                    status: user ? user.status : 1
                };
            });
            return res.json({ success: true, data: list });
        }

        const pool = getPool();
        const [lecturers] = await pool.query(`
            SELECT l.*, d.department_name, u.username, u.email, u.status
            FROM lecturers l
            JOIN users u ON l.user_id = u.id
            JOIN departments d ON l.department_id = d.id
            ORDER BY l.id ASC
        `);
        return res.json({ success: true, data: lecturers });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function createLecturer(req, res) {
    const { lecturer_code, full_name, degree, department_id, phone, email, password } = req.body;
    if (!lecturer_code || !full_name) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ mã GV và họ tên.' });
    }

    try {
        const username = lecturer_code.toLowerCase();
        const lecturerEmail = email || `${username}@utt.edu.vn`;
        const hashedPassword = password ? await bcrypt.hash(password, 10) : DEFAULT_PASSWORD_HASH;

        if (isUsingMock()) {
            const exists = mockDb.users.some(u => u.username.toLowerCase() === username);
            if (exists) return res.status(400).json({ success: false, message: 'Mã giảng viên này đã có tài khoản.' });

            const newUserId = mockDb.users.length + 1;
            mockDb.users.push({
                id: newUserId,
                username,
                password: hashedPassword,
                email: lecturerEmail,
                role: 'LECTURER',
                status: 1
            });

            const newLecturer = {
                id: mockDb.lecturers.length + 1,
                user_id: newUserId,
                lecturer_code: lecturer_code.toUpperCase(),
                full_name,
                degree: degree || 'Thạc sĩ',
                department_id: Number(department_id) || 1,
                phone: phone || '',
                email: lecturerEmail
            };
            mockDb.lecturers.push(newLecturer);
            return res.json({ success: true, message: 'Thêm giảng viên thành công.', data: newLecturer });
        }

        const pool = getPool();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [uRes] = await conn.query(
                'INSERT INTO users (username, password, email, role, status) VALUES (?, ?, ?, "LECTURER", 1)',
                [username, hashedPassword, lecturerEmail]
            );
            const userId = uRes.insertId;

            await conn.query(
                'INSERT INTO lecturers (user_id, lecturer_code, full_name, degree, department_id, phone) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, lecturer_code.toUpperCase(), full_name, degree || 'Thạc sĩ', department_id || 1, phone]
            );
            await conn.commit();
            return res.json({ success: true, message: 'Thêm giảng viên thành công.' });
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi thêm giảng viên: ' + err.message });
    }
}

async function updateLecturer(req, res) {
    const { id } = req.params;
    const { full_name, degree, department_id, phone } = req.body;

    try {
        if (isUsingMock()) {
            const l = mockDb.lecturers.find(item => item.id === Number(id));
            if (!l) return res.status(404).json({ success: false, message: 'Không tìm thấy giảng viên.' });
            if (full_name) l.full_name = full_name;
            if (degree) l.degree = degree;
            if (department_id) l.department_id = Number(department_id);
            if (phone) l.phone = phone;
            return res.json({ success: true, message: 'Cập nhật giảng viên thành công.', data: l });
        }

        const pool = getPool();
        await pool.query(
            'UPDATE lecturers SET full_name = ?, degree = ?, department_id = ?, phone = ? WHERE id = ?',
            [full_name, degree, department_id, phone, id]
        );
        return res.json({ success: true, message: 'Cập nhật giảng viên thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function deleteLecturer(req, res) {
    const { id } = req.params;
    try {
        if (isUsingMock()) {
            const idx = mockDb.lecturers.findIndex(l => l.id === Number(id));
            if (idx === -1) return res.status(404).json({ success: false, message: 'Không tìm thấy giảng viên.' });
            const [deleted] = mockDb.lecturers.splice(idx, 1);
            mockDb.users = mockDb.users.filter(u => u.id !== deleted.user_id);
            return res.json({ success: true, message: 'Xóa giảng viên thành công.' });
        }

        const pool = getPool();
        const [lec] = await pool.query('SELECT user_id FROM lecturers WHERE id = ?', [id]);
        if (lec.length > 0) {
            await pool.query('DELETE FROM users WHERE id = ?', [lec[0].user_id]);
        }
        return res.json({ success: true, message: 'Xóa giảng viên thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi xóa giảng viên: ' + err.message });
    }
}

// ==========================================================
// 4. QUẢN LÝ MÔN HỌC (CHỨC NĂNG 3)
// ==========================================================
async function getAllSubjects(req, res) {
    try {
        if (isUsingMock()) {
            const list = mockDb.subjects.map(s => {
                const dept = mockDb.departments.find(d => d.id === s.department_id);
                const prereqs = mockDb.prerequisites
                    .filter(p => p.subject_id === s.id)
                    .map(p => {
                        const preSub = mockDb.subjects.find(sub => sub.id === p.prerequisite_subject_id);
                        return preSub ? preSub.subject_name : '';
                    });
                return {
                    ...s,
                    department_name: dept ? dept.department_name : 'Bộ môn CNTT',
                    prerequisites: prereqs
                };
            });
            return res.json({ success: true, data: list });
        }

        const pool = getPool();
        const [subjects] = await pool.query(`
            SELECT s.*, d.department_name
            FROM subjects s
            JOIN departments d ON s.department_id = d.id
            ORDER BY s.id ASC
        `);
        return res.json({ success: true, data: subjects });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function createSubject(req, res) {
    const { subject_code, subject_name, credits, theory_periods, practice_periods, department_id, prerequisite_id } = req.body;
    if (!subject_code || !subject_name) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mã và tên môn học.' });
    }

    try {
        if (isUsingMock()) {
            const newSub = {
                id: mockDb.subjects.length + 1,
                subject_code: subject_code.toUpperCase(),
                subject_name,
                credits: Number(credits) || 3,
                theory_periods: Number(theory_periods) || 30,
                practice_periods: Number(practice_periods) || 15,
                department_id: Number(department_id) || 1
            };
            mockDb.subjects.push(newSub);

            if (prerequisite_id) {
                mockDb.prerequisites.push({
                    id: mockDb.prerequisites.length + 1,
                    subject_id: newSub.id,
                    prerequisite_subject_id: Number(prerequisite_id),
                    min_grade_required: 4.0
                });
            }

            return res.json({ success: true, message: 'Thêm môn học thành công.', data: newSub });
        }

        const pool = getPool();
        const [resSub] = await pool.query(
            'INSERT INTO subjects (subject_code, subject_name, credits, theory_periods, practice_periods, department_id) VALUES (?, ?, ?, ?, ?, ?)',
            [subject_code.toUpperCase(), subject_name, credits || 3, theory_periods || 30, practice_periods || 15, department_id || 1]
        );

        if (prerequisite_id) {
            await pool.query('INSERT INTO prerequisites (subject_id, prerequisite_subject_id, min_grade_required) VALUES (?, ?, 4.0)', [resSub.insertId, prerequisite_id]);
        }

        return res.json({ success: true, message: 'Thêm môn học thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function updateSubject(req, res) {
    const { id } = req.params;
    const { subject_name, credits, theory_periods, practice_periods, department_id } = req.body;

    try {
        if (isUsingMock()) {
            const sub = mockDb.subjects.find(s => s.id === Number(id));
            if (!sub) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học.' });
            if (subject_name) sub.subject_name = subject_name;
            if (credits) sub.credits = Number(credits);
            if (theory_periods) sub.theory_periods = Number(theory_periods);
            if (practice_periods) sub.practice_periods = Number(practice_periods);
            if (department_id) sub.department_id = Number(department_id);
            return res.json({ success: true, message: 'Cập nhật môn học thành công.', data: sub });
        }

        const pool = getPool();
        await pool.query(
            'UPDATE subjects SET subject_name = ?, credits = ?, theory_periods = ?, practice_periods = ?, department_id = ? WHERE id = ?',
            [subject_name, credits, theory_periods, practice_periods, department_id, id]
        );
        return res.json({ success: true, message: 'Cập nhật môn học thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function deleteSubject(req, res) {
    const { id } = req.params;
    try {
        if (isUsingMock()) {
            const idx = mockDb.subjects.findIndex(s => s.id === Number(id));
            if (idx === -1) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học.' });
            mockDb.subjects.splice(idx, 1);
            mockDb.prerequisites = mockDb.prerequisites.filter(p => p.subject_id !== Number(id) && p.prerequisite_subject_id !== Number(id));
            return res.json({ success: true, message: 'Xóa môn học thành công.' });
        }

        const pool = getPool();
        await pool.query('DELETE FROM subjects WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Xóa môn học thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi xóa môn học: ' + err.message });
    }
}

// ==========================================================
// 5. QUẢN LÝ CHƯƠNG TRÌNH ĐÀO TẠO (CHỨC NĂNG 4)
// ==========================================================
async function getPrograms(req, res) {
    try {
        if (isUsingMock()) {
            const list = mockDb.programs.map(p => {
                const dept = mockDb.departments.find(d => d.id === p.department_id);
                const countStudents = mockDb.students.filter(s => s.program_id === p.id).length;
                return {
                    ...p,
                    department_name: dept ? dept.department_name : 'Khoa CNTT',
                    total_students: countStudents
                };
            });
            return res.json({ success: true, data: list });
        }

        const pool = getPool();
        const [programs] = await pool.query(`
            SELECT p.*, d.department_name, COUNT(s.id) AS total_students
            FROM programs p
            JOIN departments d ON p.department_id = d.id
            LEFT JOIN students s ON s.program_id = p.id
            GROUP BY p.id
        `);
        return res.json({ success: true, data: programs });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function createProgram(req, res) {
    const { program_code, program_name, department_id, total_credits, duration_years } = req.body;
    if (!program_code || !program_name) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mã và tên chương trình đào tạo.' });
    }

    try {
        if (isUsingMock()) {
            const newProg = {
                id: mockDb.programs.length + 1,
                program_code,
                program_name,
                department_id: Number(department_id) || 1,
                total_credits: Number(total_credits) || 135,
                duration_years: parseFloat(duration_years) || 4.0
            };
            mockDb.programs.push(newProg);
            return res.json({ success: true, message: 'Tạo chương trình đào tạo thành công.', data: newProg });
        }

        const pool = getPool();
        await pool.query(
            'INSERT INTO programs (program_code, program_name, department_id, total_credits, duration_years) VALUES (?, ?, ?, ?, ?)',
            [program_code, program_name, department_id || 1, total_credits || 135, duration_years || 4.0]
        );
        return res.json({ success: true, message: 'Tạo chương trình đào tạo thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

// ==========================================================
// 6. QUẢN LÝ NĂM HỌC, HỌC KỲ & ĐỢT ĐĂNG KÝ (CHỨC NĂNG 5)
// ==========================================================
async function getSemesters(req, res) {
    try {
        if (isUsingMock()) {
            return res.json({ success: true, data: mockDb.semesters });
        }
        const pool = getPool();
        const [semesters] = await pool.query('SELECT * FROM semesters ORDER BY id DESC');
        return res.json({ success: true, data: semesters });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function createSemester(req, res) {
    const { semester_code, semester_name, academic_year, start_date, end_date } = req.body;
    if (!semester_code || !semester_name || !academic_year) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ mã học kỳ, tên học kỳ và năm học.' });
    }

    try {
        if (isUsingMock()) {
            const newSem = {
                id: mockDb.semesters.length + 1,
                semester_code,
                semester_name,
                academic_year,
                start_date: start_date || '2026-09-01',
                end_date: end_date || '2027-01-15',
                is_active: 1
            };
            mockDb.semesters.push(newSem);
            return res.json({ success: true, message: 'Tạo học kỳ mới thành công.', data: newSem });
        }

        const pool = getPool();
        await pool.query(
            'INSERT INTO semesters (semester_code, semester_name, academic_year, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, 1)',
            [semester_code, semester_name, academic_year, start_date, end_date]
        );
        return res.json({ success: true, message: 'Tạo học kỳ mới thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function setActiveSemester(req, res) {
    const { id } = req.params;
    try {
        if (isUsingMock()) {
            mockDb.semesters.forEach(s => s.is_active = (s.id === Number(id) ? 1 : 0));
            return res.json({ success: true, message: 'Đã kích hoạt học kỳ thành công.' });
        }

        const pool = getPool();
        await pool.query('UPDATE semesters SET is_active = 0');
        await pool.query('UPDATE semesters SET is_active = 1 WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Đã kích hoạt học kỳ thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function getRegistrationPeriods(req, res) {
    try {
        if (isUsingMock()) {
            const list = mockDb.registration_periods.map(rp => {
                const sem = mockDb.semesters.find(s => s.id === rp.semester_id);
                return {
                    ...rp,
                    semester_name: sem ? sem.semester_name : 'Học kỳ 1 - 2026-2027'
                };
            });
            return res.json({ success: true, data: list });
        }

        const pool = getPool();
        const [periods] = await pool.query(`
            SELECT rp.*, s.semester_name
            FROM registration_periods rp
            JOIN semesters s ON rp.semester_id = s.id
            ORDER BY rp.id DESC
        `);
        return res.json({ success: true, data: periods });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function createRegistrationPeriod(req, res) {
    const { semester_id, name, start_time, end_time, min_credits, max_credits } = req.body;
    if (!name || !start_time || !end_time) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đợt và thời gian bắt đầu/kết thúc.' });
    }

    try {
        if (isUsingMock()) {
            const newPeriod = {
                id: mockDb.registration_periods.length + 1,
                semester_id: Number(semester_id) || 1,
                name,
                start_time,
                end_time,
                min_credits: Number(min_credits) || 12,
                max_credits: Number(max_credits) || 24,
                is_active: 1
            };
            mockDb.registration_periods.push(newPeriod);
            return res.json({ success: true, message: 'Tạo đợt đăng ký thành công.', data: newPeriod });
        }

        const pool = getPool();
        await pool.query(
            'INSERT INTO registration_periods (semester_id, name, start_time, end_time, min_credits, max_credits, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [semester_id || 1, name, start_time, end_time, min_credits || 12, max_credits || 24]
        );
        return res.json({ success: true, message: 'Tạo đợt đăng ký thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function toggleRegistrationPeriod(req, res) {
    const { id } = req.params;
    try {
        if (isUsingMock()) {
            const p = mockDb.registration_periods.find(item => item.id === Number(id));
            if (!p) return res.status(404).json({ success: false, message: 'Không tìm thấy đợt đăng ký.' });
            p.is_active = p.is_active === 1 ? 0 : 1;
            return res.json({ success: true, message: `Đợt đăng ký hiện đang ${p.is_active ? 'MỞ' : 'ĐÓNG'}.`, is_active: p.is_active });
        }

        const pool = getPool();
        const [p] = await pool.query('SELECT is_active FROM registration_periods WHERE id = ?', [id]);
        if (p.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đợt đăng ký.' });
        const newStatus = p[0].is_active === 1 ? 0 : 1;
        await pool.query('UPDATE registration_periods SET is_active = ? WHERE id = ?', [newStatus, id]);
        return res.json({ success: true, message: `Đợt đăng ký hiện đang ${newStatus ? 'MỞ' : 'ĐÓNG'}.`, is_active: newStatus });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

// ==========================================================
// 7. MỞ VÀ QUẢN LÝ LỚP HỌC PHẦN (CHỨC NĂNG 6)
// ==========================================================
async function createCourseClass(req, res) {
    const { class_code, subject_id, semester_id, lecturer_id, max_students, schedules } = req.body;

    if (!class_code || !subject_id || !semester_id) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã lớp, mã môn và học kỳ.' });
    }

    try {
        if (isUsingMock()) {
            const subject = mockDb.subjects.find(s => s.id === Number(subject_id));
            const lecturer = mockDb.lecturers.find(l => l.id === Number(lecturer_id));
            const newId = mockDb.course_classes.length + 1;

            const newClass = {
                id: newId,
                class_code,
                subject_id: Number(subject_id),
                subject_code: subject ? subject.subject_code : '',
                subject_name: subject ? subject.subject_name : '',
                credits: subject ? subject.credits : 3,
                semester_id: Number(semester_id),
                lecturer_id: lecturer ? lecturer.id : null,
                lecturer_name: lecturer ? lecturer.full_name : 'Chưa phân công',
                max_students: Number(max_students) || 50,
                current_students: 0,
                status: 'OPEN'
            };
            mockDb.course_classes.push(newClass);

            if (schedules && Array.isArray(schedules)) {
                for (const sc of schedules) {
                    mockDb.class_schedules.push({
                        id: mockDb.class_schedules.length + 1,
                        course_class_id: newId,
                        day_of_week: Number(sc.day_of_week),
                        start_period: Number(sc.start_period),
                        total_periods: Number(sc.total_periods),
                        room: sc.room || 'P.101',
                        week_from: sc.week_from || 1,
                        week_to: sc.week_to || 16
                    });
                }
            }

            return res.json({ success: true, message: 'Mở lớp học phần mới thành công!', data: newClass });
        }

        const pool = getPool();
        const [result] = await pool.query(`
            INSERT INTO course_classes (class_code, subject_id, semester_id, lecturer_id, max_students, status)
            VALUES (?, ?, ?, ?, ?, 'OPEN')
        `, [class_code, subject_id, semester_id, lecturer_id || null, max_students || 50]);

        const classId = result.insertId;

        if (schedules && Array.isArray(schedules)) {
            for (const sc of schedules) {
                await pool.query(`
                    INSERT INTO class_schedules (course_class_id, day_of_week, start_period, total_periods, room, week_from, week_to)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [classId, sc.day_of_week, sc.start_period, sc.total_periods, sc.room, sc.week_from || 1, sc.week_to || 16]);
            }
        }

        return res.json({ success: true, message: 'Mở lớp học phần mới thành công!' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi mở lớp: ' + err.message });
    }
}

async function updateClassStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body; // OPEN, CLOSED, CANCELLED

    if (!['OPEN', 'CLOSED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ (OPEN, CLOSED, CANCELLED).' });
    }

    try {
        if (isUsingMock()) {
            const cls = mockDb.course_classes.find(c => c.id === Number(id));
            if (!cls) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần.' });
            cls.status = status;
            return res.json({ success: true, message: `Cập nhật trạng thái lớp thành [${status}].` });
        }

        const pool = getPool();
        await pool.query('UPDATE course_classes SET status = ? WHERE id = ?', [status, id]);
        return res.json({ success: true, message: `Cập nhật trạng thái lớp thành [${status}].` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

async function getClassEnrolledStudents(req, res) {
    const { id } = req.params;
    try {
        if (isUsingMock()) {
            const cls = mockDb.course_classes.find(c => c.id === Number(id));
            if (!cls) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần.' });

            const enrollments = mockDb.enrollments.filter(e => e.course_class_id === Number(id) && e.status === 'ENROLLED');
            const data = enrollments.map(e => {
                const s = mockDb.students.find(st => st.id === e.student_id);
                const g = mockDb.grades.find(gr => gr.enrollment_id === e.id);
                return {
                    enrollment_id: e.id,
                    student_id: s ? s.id : null,
                    student_code: s ? s.student_code : '',
                    full_name: s ? s.full_name : '',
                    class_name: s ? s.class_name : '',
                    enrollment_time: e.enrollment_time,
                    attendance_score: g ? g.attendance_score : null,
                    midterm_score: g ? g.midterm_score : null,
                    final_score: g ? g.final_score : null,
                    total_score_10: g ? g.total_score_10 : null,
                    letter_grade: g ? g.letter_grade : null
                };
            });
            return res.json({ success: true, course_class: cls, data });
        }

        const pool = getPool();
        const [classes] = await pool.query('SELECT * FROM course_classes WHERE id = ?', [id]);
        if (classes.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp.' });

        const [students] = await pool.query(`
            SELECT e.id AS enrollment_id, s.id AS student_id, s.student_code, s.full_name, s.class_name, e.enrollment_time,
                   g.attendance_score, g.midterm_score, g.final_score, g.total_score_10, g.letter_grade
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN grades g ON e.id = g.enrollment_id
            WHERE e.course_class_id = ? AND e.status = 'ENROLLED'
            ORDER BY s.student_code ASC
        `, [id]);

        return res.json({ success: true, course_class: classes[0], data: students });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

// Lấy danh sách Khoa / Bộ môn
async function getAllDepartments(req, res) {
    try {
        if (isUsingMock()) {
            return res.json({ success: true, data: mockDb.departments });
        }
        const pool = getPool();
        const [depts] = await pool.query('SELECT * FROM departments');
        return res.json({ success: true, data: depts });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
    }
}

module.exports = {
    getDashboardStats,
    getAllUsers,
    createUser,
    toggleUserStatus,
    resetUserPassword,
    getAllStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    getAllLecturers,
    createLecturer,
    updateLecturer,
    deleteLecturer,
    getAllSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    getPrograms,
    createProgram,
    getSemesters,
    createSemester,
    setActiveSemester,
    getRegistrationPeriods,
    createRegistrationPeriod,
    toggleRegistrationPeriod,
    createCourseClass,
    updateClassStatus,
    getClassEnrolledStudents,
    getAllDepartments
};
