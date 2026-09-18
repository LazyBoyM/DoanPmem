const xlsx = require('xlsx');
const { endpoint, readStore } = require('../services/store');
const { requireRow, classesWithDetails, checkClassAccess } = require('../services/academic');
function excel(work, sheet, filename) {
    return async (req, res) => {
        try {
            const rows = await work(req, readStore());
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(rows), sheet);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
        } catch (error) {
            if (!error.status) console.error(error);
            res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể xuất báo cáo.' });
        }
    };
}
const exportClassStudentsExcel = excel(async (req, store) => {
    const cls = await requireRow(store, 'course_classes', req.params.classId, 'Lớp');
    checkClassAccess(req.user, cls);
    const students = await store.list('students'), grades = await store.list('grades'), programs = await store.list('programs');
    return (await store.list('enrollments', { course_class_id: cls.id, status: 'ENROLLED' })).map((e,i) => {
        const s = students.find(s => s.id === e.student_id), g = grades.find(g => g.enrollment_id === e.id);
        return { STT: i+1, 'Mã sinh viên': s.student_code, 'Họ tên': s.full_name, 'Lớp': s.class_name, 'Ngành': programs.find(p => p.id === s.program_id)?.program_name,
            'Chuyên cần': g?.attendance_score ?? '', 'Giữa kỳ': g?.midterm_score ?? '', 'Cuối kỳ': g?.final_score ?? '', 'Hệ 10': g?.total_score_10 ?? '', 'Hệ 4': g?.total_score_4 ?? '', 'Điểm chữ': g?.letter_grade ?? '' };
    });
}, 'DanhSachLop', 'Danh_sach_lop.xlsx');
const exportAllStudentsExcel = excel(async (_req, store) => {
    const users = await store.list('users'), programs = await store.list('programs');
    return (await store.list('students')).map((s,i) => ({ STT: i+1, 'Mã sinh viên': s.student_code, 'Họ tên': s.full_name, 'Giới tính': s.gender, 'Ngày sinh': String(s.birth_date || '').slice(0,10), 'Lớp': s.class_name, 'Khóa': s.academic_year,
        'Điện thoại': s.phone, Email: users.find(u => u.id === s.user_id)?.email, 'Ngành': programs.find(p => p.id === s.program_id)?.program_name }));
}, 'SinhVien', 'Danh_sach_sinh_vien.xlsx');
const getAcademicReports = endpoint(async (req, store) => {
    const classes = (await classesWithDetails(store)).filter(c => c.status !== 'CANCELLED' && (req.user.role === 'ADMIN' || c.lecturer_id === req.user.lecturer_id));
    const enrollments = (await store.list('enrollments', { status: 'ENROLLED' })).filter(e => classes.some(c => c.id === e.course_class_id));
    const grades = (await store.list('grades')).filter(g => enrollments.some(e => e.id === g.enrollment_id));
    const gradeDistribution = { A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, 'D+': 0, D: 0, F: 0 };
    for (const g of grades) if (g.total_score_10 != null && Object.hasOwn(gradeDistribution, g.letter_grade)) gradeDistribution[g.letter_grade]++;
    const gradedCount = Object.values(gradeDistribution).reduce((a,b) => a+b, 0), failedCount = gradeDistribution.F, passedCount = gradedCount-failedCount;
    return { data: { gradeDistribution, gradedCount, failedCount, passedCount, passRate: gradedCount ? ((passedCount/gradedCount)*100).toFixed(1) : '0.0',
        classOccupancy: classes.map(c => ({ ...c, occupancy_rate: c.max_students ? Math.round(c.current_students/c.max_students*100) : 0 })) } };
});
module.exports = { exportClassStudentsExcel, exportAllStudentsExcel, getAcademicReports };
