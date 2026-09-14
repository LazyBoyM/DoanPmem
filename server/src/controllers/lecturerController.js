const { getPool, isUsingMock, mockDb } = require('../config/db');
const { convertGrade } = require('../services/scheduleConflictService');

// Lấy danh sách lớp giảng viên được phân công
async function getMyClasses(req, res) {
    const lecturerId = req.user.lecturer_id;
    if (!lecturerId) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy thông tin giảng viên.' });
    }

    try {
        if (isUsingMock()) {
            const classes = mockDb.course_classes
                .filter(c => c.lecturer_id === lecturerId)
                .map(c => ({
                    ...c,
                    schedules: mockDb.class_schedules.filter(s => s.course_class_id === c.id)
                }));
            return res.json({ success: true, data: classes });
        }

        const pool = getPool();
        const query = `
            SELECT c.*, s.subject_code, s.subject_name, s.credits
            FROM course_classes c
            JOIN subjects s ON c.subject_id = s.id
            WHERE c.lecturer_id = ?
        `;
        const [classes] = await pool.query(query, [lecturerId]);

        for (const c of classes) {
            const [scheds] = await pool.query('SELECT * FROM class_schedules WHERE course_class_id = ?', [c.id]);
            c.schedules = scheds;
        }

        return res.json({ success: true, data: classes });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lớp: ' + err.message });
    }
}

// Lấy danh sách sinh viên và bảng điểm của một lớp học phần
async function getClassStudents(req, res) {
    const lecturerId = req.user.lecturer_id;
    const { classId } = req.params;

    try {
        if (isUsingMock()) {
            const cls = mockDb.course_classes.find(c => c.id === Number(classId));
            if (!cls || (req.user.role === 'LECTURER' && cls.lecturer_id !== lecturerId)) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý lớp học phần này.' });
            }

            const enrollments = mockDb.enrollments.filter(e => e.course_class_id === Number(classId) && e.status === 'ENROLLED');
            const studentList = enrollments.map(e => {
                const s = mockDb.students.find(st => st.id === e.student_id);
                const g = mockDb.grades.find(gr => gr.enrollment_id === e.id);
                return {
                    enrollment_id: e.id,
                    student_id: s.id,
                    student_code: s.student_code,
                    full_name: s.full_name,
                    class_name: s.class_name,
                    attendance_score: g ? g.attendance_score : null,
                    midterm_score: g ? g.midterm_score : null,
                    final_score: g ? g.final_score : null,
                    total_score_10: g ? g.total_score_10 : null,
                    total_score_4: g ? g.total_score_4 : null,
                    letter_grade: g ? g.letter_grade : null,
                    is_locked: g ? g.is_locked : 0
                };
            });

            return res.json({ success: true, course_class: cls, data: studentList });
        }

        const pool = getPool();
        const [classes] = await pool.query('SELECT * FROM course_classes WHERE id = ?', [classId]);
        if (classes.length === 0 || (req.user.role === 'LECTURER' && classes[0].lecturer_id !== lecturerId)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý lớp học phần này.' });
        }

        const query = `
            SELECT e.id AS enrollment_id, s.id AS student_id, s.student_code, s.full_name, s.class_name,
                   g.attendance_score, g.midterm_score, g.final_score, g.total_score_10, g.total_score_4, g.letter_grade, g.is_locked
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN grades g ON e.id = g.enrollment_id
            WHERE e.course_class_id = ? AND e.status = 'ENROLLED'
            ORDER BY s.student_code ASC
        `;
        const [students] = await pool.query(query, [classId]);

        return res.json({ success: true, course_class: classes[0], data: students });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách sinh viên lớp: ' + err.message });
    }
}

// Giảng viên cập nhật điểm
async function updateGrades(req, res) {
    const { enrollment_id, attendance_score, midterm_score, final_score } = req.body;

    if (!enrollment_id) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin mã đăng ký để cập nhật điểm.' });
    }

    const { total10, total4, letter } = convertGrade(
        attendance_score !== undefined ? parseFloat(attendance_score) : null,
        midterm_score !== undefined ? parseFloat(midterm_score) : null,
        final_score !== undefined ? parseFloat(final_score) : null
    );

    try {
        if (isUsingMock()) {
            let grade = mockDb.grades.find(g => g.enrollment_id === Number(enrollment_id));
            if (grade && grade.is_locked) {
                return res.status(400).json({ success: false, message: 'Bảng điểm đã bị khóa, không thể chỉnh sửa.' });
            }

            if (!grade) {
                grade = { id: mockDb.grades.length + 1, enrollment_id: Number(enrollment_id) };
                mockDb.grades.push(grade);
            }

            grade.attendance_score = attendance_score !== undefined ? parseFloat(attendance_score) : null;
            grade.midterm_score = midterm_score !== undefined ? parseFloat(midterm_score) : null;
            grade.final_score = final_score !== undefined ? parseFloat(final_score) : null;
            grade.total_score_10 = total10;
            grade.total_score_4 = total4;
            grade.letter_grade = letter;
            grade.is_locked = 0;

            return res.json({ success: true, message: 'Cập nhật điểm thành công.', data: grade });
        }

        const pool = getPool();
        const [existing] = await pool.query('SELECT * FROM grades WHERE enrollment_id = ?', [enrollment_id]);
        if (existing.length > 0 && existing[0].is_locked) {
            return res.status(400).json({ success: false, message: 'Bảng điểm đã bị khóa, không thể chỉnh sửa.' });
        }

        if (existing.length === 0) {
            await pool.query(`
                INSERT INTO grades (enrollment_id, attendance_score, midterm_score, final_score, total_score_10, total_score_4, letter_grade)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [enrollment_id, attendance_score, midterm_score, final_score, total10, total4, letter]);
        } else {
            await pool.query(`
                UPDATE grades
                SET attendance_score = ?, midterm_score = ?, final_score = ?, total_score_10 = ?, total_score_4 = ?, letter_grade = ?
                WHERE enrollment_id = ?
            `, [attendance_score, midterm_score, final_score, total10, total4, letter, enrollment_id]);
        }

        return res.json({ success: true, message: 'Cập nhật điểm thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật điểm: ' + err.message });
    }
}

// Khóa hoặc mở khóa toàn bộ bảng điểm của một lớp học phần
async function lockGrades(req, res) {
    const { classId } = req.params;
    const { is_locked } = req.body; // 1 hoặc 0

    try {
        if (isUsingMock()) {
            const enrollments = mockDb.enrollments.filter(e => e.course_class_id === Number(classId) && e.status === 'ENROLLED');
            enrollments.forEach(e => {
                let grade = mockDb.grades.find(g => g.enrollment_id === e.id);
                if (grade) {
                    grade.is_locked = Number(is_locked) || 0;
                }
            });
            return res.json({ success: true, message: is_locked ? 'Đã khóa bảng điểm thành công.' : 'Đã mở khóa bảng điểm.' });
        }

        const pool = getPool();
        await pool.query(`
            UPDATE grades g
            JOIN enrollments e ON g.enrollment_id = e.id
            SET g.is_locked = ?
            WHERE e.course_class_id = ?
        `, [Number(is_locked) || 0, classId]);

        return res.json({ success: true, message: is_locked ? 'Đã khóa bảng điểm thành công.' : 'Đã mở khóa bảng điểm.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi khóa bảng điểm: ' + err.message });
    }
}

// Lấy thời khóa biểu giảng dạy của giảng viên
async function getLecturerTimetable(req, res) {
    const lecturerId = req.user.lecturer_id;
    if (!lecturerId) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy thông tin giảng viên.' });
    }

    try {
        if (isUsingMock()) {
            const classes = mockDb.course_classes.filter(c => c.lecturer_id === lecturerId);
            const timetable = [];
            classes.forEach(c => {
                const scheds = mockDb.class_schedules.filter(s => s.course_class_id === c.id);
                scheds.forEach(s => {
                    timetable.push({
                        class_code: c.class_code,
                        subject_name: c.subject_name,
                        subject_code: c.subject_code,
                        credits: c.credits,
                        day_of_week: s.day_of_week,
                        start_period: s.start_period,
                        total_periods: s.total_periods,
                        room: s.room,
                        week_from: s.week_from,
                        week_to: s.week_to
                    });
                });
            });
            return res.json({ success: true, data: timetable });
        }

        const pool = getPool();
        const [timetable] = await pool.query(`
            SELECT c.class_code, s.subject_name, s.subject_code, s.credits,
                   cs.day_of_week, cs.start_period, cs.total_periods, cs.room, cs.week_from, cs.week_to
            FROM course_classes c
            JOIN subjects s ON c.subject_id = s.id
            JOIN class_schedules cs ON cs.course_class_id = c.id
            WHERE c.lecturer_id = ?
            ORDER BY cs.day_of_week ASC, cs.start_period ASC
        `, [lecturerId]);

        return res.json({ success: true, data: timetable });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi lấy thời khóa biểu giảng viên: ' + err.message });
    }
}

module.exports = {
    getMyClasses,
    getClassStudents,
    updateGrades,
    lockGrades,
    getLecturerTimetable
};

