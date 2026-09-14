const { getPool, isUsingMock, mockDb } = require('../config/db');
const { checkScheduleConflicts } = require('../services/scheduleConflictService');

// Lấy danh sách các lớp học phần đang mở kèm lịch học
async function getOpenClasses(req, res) {
    try {
        if (isUsingMock()) {
            const classes = mockDb.course_classes.map(c => {
                const schedules = mockDb.class_schedules.filter(s => s.course_class_id === c.id);
                return {
                    ...c,
                    schedules
                };
            });
            return res.json({ success: true, data: classes });
        }

        const pool = getPool();
        const query = `
            SELECT c.*, s.subject_code, s.subject_name, s.credits, l.full_name AS lecturer_name
            FROM course_classes c
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN lecturers l ON c.lecturer_id = l.id
            WHERE c.status = 'OPEN'
        `;
        const [classes] = await pool.query(query);

        // Attach schedules
        for (const cls of classes) {
            const [scheds] = await pool.query('SELECT * FROM class_schedules WHERE course_class_id = ?', [cls.id]);
            cls.schedules = scheds;
        }

        return res.json({ success: true, data: classes });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lớp học phần: ' + err.message });
    }
}

// Lấy các lớp sinh viên đã đăng ký trong kỳ
async function getMyEnrollments(req, res) {
    const studentId = req.user.student_id;
    if (!studentId) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy thông tin sinh viên tương ứng.' });
    }

    try {
        if (isUsingMock()) {
            const myEnrollments = mockDb.enrollments
                .filter(e => e.student_id === studentId && e.status === 'ENROLLED')
                .map(e => {
                    const cls = mockDb.course_classes.find(c => c.id === e.course_class_id);
                    const schedules = mockDb.class_schedules.filter(s => s.course_class_id === e.course_class_id);
                    const grade = mockDb.grades.find(g => g.enrollment_id === e.id);
                    return {
                        enrollment_id: e.id,
                        enrollment_time: e.enrollment_time,
                        ...cls,
                        schedules,
                        grade: grade || null
                    };
                });
            return res.json({ success: true, data: myEnrollments });
        }

        const pool = getPool();
        const query = `
            SELECT e.id AS enrollment_id, e.enrollment_time, c.*, s.subject_code, s.subject_name, s.credits, l.full_name AS lecturer_name,
                   g.attendance_score, g.midterm_score, g.final_score, g.total_score_10, g.total_score_4, g.letter_grade
            FROM enrollments e
            JOIN course_classes c ON e.course_class_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN lecturers l ON c.lecturer_id = l.id
            LEFT JOIN grades g ON e.id = g.enrollment_id
            WHERE e.student_id = ? AND e.status = 'ENROLLED'
        `;
        const [enrollments] = await pool.query(query, [studentId]);

        for (const item of enrollments) {
            const [scheds] = await pool.query('SELECT * FROM class_schedules WHERE course_class_id = ?', [item.id]);
            item.schedules = scheds;
        }

        return res.json({ success: true, data: enrollments });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đăng ký: ' + err.message });
    }
}

// Đăng ký lớp học phần (với kiểm tra trùng lịch & giới hạn tín chỉ)
async function registerClass(req, res) {
    const studentId = req.user.student_id;
    const { course_class_id } = req.body;

    if (!studentId || !course_class_id) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin lớp học phần cần đăng ký.' });
    }

    try {
        if (isUsingMock()) {
            const targetClass = mockDb.course_classes.find(c => c.id === Number(course_class_id));
            if (!targetClass || targetClass.status !== 'OPEN') {
                return res.status(400).json({ success: false, message: 'Lớp học phần không tồn tại hoặc đã đóng đăng ký.' });
            }

            if (targetClass.current_students >= targetClass.max_students) {
                return res.status(400).json({ success: false, message: 'Lớp học phần đã đủ số lượng sinh viên (hết chỗ).' });
            }

            // 1. Kiểm tra đợt đăng ký tín chỉ
            const activePeriod = mockDb.registration_periods.find(p => p.is_active === 1);
            if (!activePeriod) {
                return res.status(400).json({ success: false, message: 'Hiện tại chưa mở đợt đăng ký tín chỉ nào.' });
            }

            // 2. Kiểm tra môn tiên quyết
            const prereqs = mockDb.prerequisites.filter(p => p.subject_id === targetClass.subject_id);
            for (const pr of prereqs) {
                const preSubject = mockDb.subjects.find(s => s.id === pr.prerequisite_subject_id);
                const prereqEnrollment = mockDb.enrollments.find(e => {
                    if (e.student_id !== studentId) return false;
                    const c = mockDb.course_classes.find(item => item.id === e.course_class_id);
                    return c && c.subject_id === pr.prerequisite_subject_id;
                });

                if (prereqEnrollment) {
                    const g = mockDb.grades.find(gr => gr.enrollment_id === prereqEnrollment.id);
                    if (g && g.total_score_10 !== null && g.total_score_10 < (pr.min_grade_required || 4.0)) {
                        return res.status(400).json({
                            success: false,
                            message: `Không đủ điều kiện tiên quyết: Bạn chưa đạt môn [${preSubject ? preSubject.subject_name : 'Tiên quyết'}] (Điểm: ${g.total_score_10} < 4.0).`
                        });
                    }
                }
            }

            // 3. Kiểm tra đã đăng ký lớp này chưa
            const alreadyEnrolled = mockDb.enrollments.some(e => e.student_id === studentId && e.course_class_id === Number(course_class_id) && e.status === 'ENROLLED');
            if (alreadyEnrolled) {
                return res.status(400).json({ success: false, message: 'Bạn đã đăng ký lớp học phần này rồi.' });
            }

            // Lấy danh sách các lớp sinh viên đã đăng ký
            const enrolledClasses = mockDb.enrollments
                .filter(e => e.student_id === studentId && e.status === 'ENROLLED')
                .map(e => {
                    const c = mockDb.course_classes.find(item => item.id === e.course_class_id);
                    return {
                        ...c,
                        schedules: mockDb.class_schedules.filter(s => s.course_class_id === e.course_class_id)
                    };
                });

            // Kiểm tra đăng ký trùng môn (cùng môn học nhưng lớp khác)
            const duplicateSubject = enrolledClasses.some(c => c.subject_id === targetClass.subject_id);
            if (duplicateSubject) {
                return res.status(400).json({ success: false, message: `Bạn đã đăng ký một lớp học phần khác của môn [${targetClass.subject_name}] rồi.` });
            }

            // Kiểm tra tổng số tín chỉ
            const totalCredits = enrolledClasses.reduce((sum, c) => sum + (c.credits || 3), 0) + (targetClass.credits || 3);
            if (totalCredits > 24) {
                return res.status(400).json({ success: false, message: `Vượt quá giới hạn tối đa 24 tín chỉ trong học kỳ (Hiện tại: ${totalCredits} TC).` });
            }

            // KIỂM TRA TRÙNG LỊCH HỌC
            const candidateSchedules = mockDb.class_schedules.filter(s => s.course_class_id === targetClass.id);
            const conflictResult = checkScheduleConflicts(candidateSchedules, enrolledClasses);
            if (conflictResult.hasConflict) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Không thể đăng ký: ' + conflictResult.detail 
                });
            }

            // Tiến hành ghi nhận đăng ký
            targetClass.current_students += 1;
            const newEnrollmentId = mockDb.enrollments.length + 1;
            mockDb.enrollments.push({
                id: newEnrollmentId,
                student_id: studentId,
                course_class_id: targetClass.id,
                status: 'ENROLLED',
                enrollment_time: new Date().toISOString()
            });

            return res.json({ success: true, message: `Đăng ký thành công lớp [${targetClass.class_code}] - ${targetClass.subject_name}.` });
        }

        // MySQL Mode with Database Transaction
        const pool = getPool();
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            // Khóa dòng lớp học phần để kiểm tra slot
            const [classes] = await conn.query('SELECT c.*, s.credits, s.subject_name FROM course_classes c JOIN subjects s ON c.subject_id = s.id WHERE c.id = ? FOR UPDATE', [course_class_id]);
            if (classes.length === 0) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: 'Lớp học phần không tồn tại.' });
            }

            const targetClass = classes[0];
            if (targetClass.status !== 'OPEN' || targetClass.current_students >= targetClass.max_students) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: 'Lớp học phần đã hết chỗ hoặc đóng đăng ký.' });
            }

            // 1. Kiểm tra đợt đăng ký tín chỉ
            const [activePeriods] = await conn.query('SELECT * FROM registration_periods WHERE is_active = 1');
            if (activePeriods.length === 0) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: 'Hiện tại chưa mở đợt đăng ký tín chỉ nào.' });
            }

            // 2. Kiểm tra môn tiên quyết
            const [prereqs] = await conn.query('SELECT p.*, s.subject_name FROM prerequisites p JOIN subjects s ON p.prerequisite_subject_id = s.id WHERE p.subject_id = ?', [targetClass.subject_id]);
            for (const pr of prereqs) {
                const [enr] = await conn.query(`
                    SELECT g.total_score_10
                    FROM enrollments e
                    JOIN course_classes c ON e.course_class_id = c.id
                    LEFT JOIN grades g ON e.id = g.enrollment_id
                    WHERE e.student_id = ? AND c.subject_id = ? AND e.status = 'ENROLLED'
                `, [studentId, pr.prerequisite_subject_id]);
                if (enr.length > 0 && enr[0].total_score_10 !== null && enr[0].total_score_10 < (pr.min_grade_required || 4.0)) {
                    await conn.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Không đủ điều kiện tiên quyết: Bạn chưa đạt môn [${pr.subject_name}] (Điểm: ${enr[0].total_score_10} < 4.0).`
                    });
                }
            }

            // Lấy các lớp sinh viên đã đăng ký
            const [myEnrolled] = await conn.query(`
                SELECT c.*, s.subject_name, s.credits
                FROM enrollments e
                JOIN course_classes c ON e.course_class_id = c.id
                JOIN subjects s ON c.subject_id = s.id
                WHERE e.student_id = ? AND e.status = 'ENROLLED'
            `, [studentId]);

            // Kiểm tra đã đăng ký lớp này chưa
            if (myEnrolled.some(c => c.id === Number(course_class_id))) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: 'Bạn đã đăng ký lớp học phần này rồi.' });
            }

            // Trùng môn
            if (myEnrolled.some(c => c.subject_id === targetClass.subject_id)) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: `Bạn đã đăng ký một lớp học phần khác của môn [${targetClass.subject_name}] rồi.` });
            }

            // Tín chỉ
            const totalCredits = myEnrolled.reduce((sum, c) => sum + c.credits, 0) + targetClass.credits;
            if (totalCredits > 24) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: `Vượt quá giới hạn tối đa 24 tín chỉ trong học kỳ (Hiện tại: ${totalCredits} TC).` });
            }

            // Lấy lịch học để kiểm tra trùng
            const [candScheds] = await conn.query('SELECT * FROM class_schedules WHERE course_class_id = ?', [course_class_id]);
            for (const item of myEnrolled) {
                const [scs] = await conn.query('SELECT * FROM class_schedules WHERE course_class_id = ?', [item.id]);
                item.schedules = scs;
            }

            const conflict = checkScheduleConflicts(candScheds, myEnrolled);
            if (conflict.hasConflict) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: 'Không thể đăng ký: ' + conflict.detail });
            }

            // Cập nhật slot và tạo bản ghi đăng ký
            await conn.query('UPDATE course_classes SET current_students = current_students + 1 WHERE id = ?', [course_class_id]);
            await conn.query('INSERT INTO enrollments (student_id, course_class_id, status) VALUES (?, ?, "ENROLLED")', [studentId, course_class_id]);

            await conn.commit();
            return res.json({ success: true, message: `Đăng ký thành công lớp [${targetClass.class_code}] - ${targetClass.subject_name}.` });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi trong quá trình đăng ký học phần: ' + err.message });
    }
}

// Hủy đăng ký học phần
async function cancelEnrollment(req, res) {
    const studentId = req.user.student_id;
    const { enrollment_id } = req.body;

    if (!studentId || !enrollment_id) {
        return res.status(400).json({ success: false, message: 'Thiếu mã đăng ký cần hủy.' });
    }

    try {
        if (isUsingMock()) {
            const enrollment = mockDb.enrollments.find(e => e.id === Number(enrollment_id) && e.student_id === studentId);
            if (!enrollment || enrollment.status !== 'ENROLLED') {
                return res.status(400).json({ success: false, message: 'Bản ghi đăng ký không tồn tại hoặc đã bị hủy.' });
            }

            enrollment.status = 'CANCELLED';
            const cls = mockDb.course_classes.find(c => c.id === enrollment.course_class_id);
            if (cls && cls.current_students > 0) {
                cls.current_students -= 1;
            }

            return res.json({ success: true, message: 'Hủy đăng ký học phần thành công.' });
        }

        const pool = getPool();
        const [enrollments] = await pool.query('SELECT * FROM enrollments WHERE id = ? AND student_id = ? AND status = "ENROLLED"', [enrollment_id, studentId]);
        if (enrollments.length === 0) {
            return res.status(400).json({ success: false, message: 'Bản ghi đăng ký không hợp lệ.' });
        }

        const enr = enrollments[0];
        await pool.query('UPDATE enrollments SET status = "CANCELLED" WHERE id = ?', [enr.id]);
        await pool.query('UPDATE course_classes SET current_students = GREATEST(0, current_students - 1) WHERE id = ?', [enr.course_class_id]);

        return res.json({ success: true, message: 'Hủy đăng ký học phần thành công.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi khi hủy đăng ký: ' + err.message });
    }
}

module.exports = {
    getOpenClasses,
    getMyEnrollments,
    registerClass,
    cancelEnrollment
};
