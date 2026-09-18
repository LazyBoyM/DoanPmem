const { getPool, isUsingMock, mockDb } = require('../config/db');

async function requireClassAccess(req, res, next) {
    try {
        let classId = Number(req.params.classId);
        if (!req.params.classId) {
            const enrollmentId = Number(req.body.enrollment_id);
            const enrollment = isUsingMock()
                ? mockDb.enrollments.find(e => e.id === enrollmentId && e.status === 'ENROLLED')
                : (await getPool().query('SELECT course_class_id FROM enrollments WHERE id = ? AND status = "ENROLLED"', [enrollmentId]))[0][0];
            if (!enrollment) return res.status(404).json({ success: false, message: 'Không tìm thấy đăng ký học phần.' });
            classId = enrollment.course_class_id;
        }
        const cls = isUsingMock()
            ? mockDb.course_classes.find(c => c.id === classId)
            : (await getPool().query('SELECT * FROM course_classes WHERE id = ?', [classId]))[0][0];
        if (!cls) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần.' });
        if (req.user.role !== 'ADMIN' && cls.lecturer_id !== req.user.lecturer_id) {
            return res.status(403).json({ success: false, message: 'Bạn không phụ trách lớp học phần này.' });
        }
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Không thể kiểm tra quyền truy cập lớp.' });
    }
}

module.exports = { requireClassAccess };
