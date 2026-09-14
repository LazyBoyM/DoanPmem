const xlsx = require('xlsx');
const { getPool, isUsingMock, mockDb } = require('../config/db');

// Xuất file Excel danh sách sinh viên lớp học phần
async function exportClassStudentsExcel(req, res) {
    const { classId } = req.params;

    try {
        let students = [];
        let classInfo = null;

        if (isUsingMock()) {
            classInfo = mockDb.course_classes.find(c => c.id === Number(classId));
            const enrollments = mockDb.enrollments.filter(e => e.course_class_id === Number(classId) && e.status === 'ENROLLED');
            students = enrollments.map((e, index) => {
                const s = mockDb.students.find(st => st.id === e.student_id);
                const g = mockDb.grades.find(gr => gr.enrollment_id === e.id);
                return {
                    'STT': index + 1,
                    'Mã Sinh Viên': s ? s.student_code : '',
                    'Họ và Tên': s ? s.full_name : '',
                    'Lớp Sinh Hoạt': s ? s.class_name : '',
                    'Chuyên Ngành': s ? (s.program_name || 'CNTT') : 'CNTT',
                    'Điểm Chuyên Cần (10%)': g && g.attendance_score !== null ? g.attendance_score : '',
                    'Điểm Giữa Kỳ (30%)': g && g.midterm_score !== null ? g.midterm_score : '',
                    'Điểm Cuối Kỳ (60%)': g && g.final_score !== null ? g.final_score : '',
                    'Tổng Kết (Hệ 10)': g && g.total_score_10 !== null ? g.total_score_10 : '',
                    'Tổng Kết (Hệ 4)': g && g.total_score_4 !== null ? g.total_score_4 : '',
                    'Điểm Chữ': g && g.letter_grade ? g.letter_grade : '',
                    'Kết Quả': g && g.total_score_10 !== null ? (g.total_score_10 >= 4.0 ? 'Đạt' : 'Học lại') : ''
                };
            });
        } else {
            const pool = getPool();
            const [classes] = await pool.query('SELECT * FROM course_classes WHERE id = ?', [classId]);
            classInfo = classes[0];

            const [rows] = await pool.query(`
                SELECT s.student_code, s.full_name, s.class_name, p.program_name,
                       g.attendance_score, g.midterm_score, g.final_score, g.total_score_10, g.total_score_4, g.letter_grade
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN programs p ON s.program_id = p.id
                LEFT JOIN grades g ON e.id = g.enrollment_id
                WHERE e.course_class_id = ? AND e.status = 'ENROLLED'
                ORDER BY s.student_code ASC
            `, [classId]);

            students = rows.map((r, i) => ({
                'STT': i + 1,
                'Mã Sinh Viên': r.student_code,
                'Họ và Tên': r.full_name,
                'Lớp Sinh Hoạt': r.class_name,
                'Chuyên Ngành': r.program_name,
                'Điểm Chuyên Cần (10%)': r.attendance_score !== null ? r.attendance_score : '',
                'Điểm Giữa Kỳ (30%)': r.midterm_score !== null ? r.midterm_score : '',
                'Điểm Cuối Kỳ (60%)': r.final_score !== null ? r.final_score : '',
                'Tổng Kết (Hệ 10)': r.total_score_10 !== null ? r.total_score_10 : '',
                'Tổng Kết (Hệ 4)': r.total_score_4 !== null ? r.total_score_4 : '',
                'Điểm Chữ': r.letter_grade || '',
                'Kết Quả': r.total_score_10 !== null ? (r.total_score_10 >= 4.0 ? 'Đạt' : 'Học lại') : ''
            }));
        }

        const worksheet = xlsx.utils.json_to_sheet(students);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'DanhSachLop');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileName = `Danh_sach_lop_${classInfo ? classInfo.class_code : classId}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buffer);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi xuất file Excel: ' + err.message });
    }
}

// Xuất file Excel toàn bộ danh sách sinh viên
async function exportAllStudentsExcel(req, res) {
    try {
        let students = [];

        if (isUsingMock()) {
            students = mockDb.students.map((s, idx) => {
                const prog = mockDb.programs.find(p => p.id === s.program_id);
                const user = mockDb.users.find(u => u.id === s.user_id);
                return {
                    'STT': idx + 1,
                    'Mã Sinh Viên': s.student_code,
                    'Họ và Tên': s.full_name,
                    'Giới Tính': s.gender || 'Nam',
                    'Ngày Sinh': s.birth_date || '',
                    'Số Điện Thoại': s.phone || '',
                    'Lớp Sinh Hoạt': s.class_name,
                    'Khóa': s.academic_year || 'K74',
                    'Chuyên Ngành': prog ? prog.program_name : 'Công nghệ Thông tin',
                    'Email': user ? user.email : '',
                    'Trạng Thái Tài Khoản': user && user.status === 1 ? 'Hoạt động' : 'Khóa'
                };
            });
        } else {
            const pool = getPool();
            const [rows] = await pool.query(`
                SELECT s.*, p.program_name, u.email, u.status
                FROM students s
                JOIN programs p ON s.program_id = p.id
                JOIN users u ON s.user_id = u.id
                ORDER BY s.student_code ASC
            `);

            students = rows.map((r, idx) => ({
                'STT': idx + 1,
                'Mã Sinh Viên': r.student_code,
                'Họ và Tên': r.full_name,
                'Giới Tính': r.gender,
                'Ngày Sinh': r.birth_date ? r.birth_date.toISOString().slice(0, 10) : '',
                'Số Điện Thoại': r.phone,
                'Lớp Sinh Hoạt': r.class_name,
                'Khóa': r.academic_year,
                'Chuyên Ngành': r.program_name,
                'Email': r.email,
                'Trạng Thái Tài Khoản': r.status === 1 ? 'Hoạt động' : 'Khóa'
            }));
        }

        const worksheet = xlsx.utils.json_to_sheet(students);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'ToanBoSinhVien');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="Danh_sach_toan_bo_sinh_vien.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buffer);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi xuất Excel: ' + err.message });
    }
}

// Báo cáo thống kê học tập và kết quả đào tạo
async function getAcademicReports(req, res) {
    try {
        const gradeDistribution = {
            'A': 0,
            'B+': 0,
            'B': 0,
            'C+': 0,
            'C': 0,
            'D+': 0,
            'D': 0,
            'F': 0
        };

        let passedCount = 0;
        let failedCount = 0;
        let gradedCount = 0;

        if (isUsingMock()) {
            mockDb.grades.forEach(g => {
                if (g.letter_grade && gradeDistribution[g.letter_grade] !== undefined) {
                    gradeDistribution[g.letter_grade]++;
                    gradedCount++;
                    if (g.letter_grade === 'F') {
                        failedCount++;
                    } else {
                        passedCount++;
                    }
                }
            });

            const classOccupancy = mockDb.course_classes.map(c => ({
                id: c.id,
                class_code: c.class_code,
                subject_name: c.subject_name,
                current_students: c.current_students,
                max_students: c.max_students,
                occupancy_rate: Math.round((c.current_students / c.max_students) * 100)
            }));

            return res.json({
                success: true,
                data: {
                    gradedCount,
                    passedCount,
                    failedCount,
                    passRate: gradedCount > 0 ? ((passedCount / gradedCount) * 100).toFixed(1) : '100.0',
                    gradeDistribution,
                    classOccupancy
                }
            });
        }

        const pool = getPool();
        const [grades] = await pool.query('SELECT letter_grade FROM grades WHERE letter_grade IS NOT NULL');
        grades.forEach(g => {
            if (gradeDistribution[g.letter_grade] !== undefined) {
                gradeDistribution[g.letter_grade]++;
                gradedCount++;
                if (g.letter_grade === 'F') failedCount++;
                else passedCount++;
            }
        });

        const [classes] = await pool.query(`
            SELECT c.id, c.class_code, s.subject_name, c.current_students, c.max_students
            FROM course_classes c
            JOIN subjects s ON c.subject_id = s.id
        `);

        const classOccupancy = classes.map(c => ({
            id: c.id,
            class_code: c.class_code,
            subject_name: c.subject_name,
            current_students: c.current_students,
            max_students: c.max_students,
            occupancy_rate: Math.round((c.current_students / c.max_students) * 100)
        }));

        return res.json({
            success: true,
            data: {
                gradedCount,
                passedCount,
                failedCount,
                passRate: gradedCount > 0 ? ((passedCount / gradedCount) * 100).toFixed(1) : '100.0',
                gradeDistribution,
                classOccupancy
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo: ' + err.message });
    }
}

module.exports = {
    exportClassStudentsExcel,
    exportAllStudentsExcel,
    getAcademicReports
};
