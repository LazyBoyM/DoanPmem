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
    const enrollments = await store.list('enrollments', { course_class_id: cls.id, status: 'ENROLLED' });
    const students = await store.related('students', 'id', enrollments.map(e => e.student_id));
    const grades = await store.related('grades', 'enrollment_id', enrollments.map(e => e.id));
    const programs = await store.related('programs', 'id', students.map(s => s.program_id).filter(Boolean));
    const studentById = new Map(students.map(s => [s.id, s]));
    const gradeByEnrollment = new Map(grades.map(g => [g.enrollment_id, g]));
    const programById = new Map(programs.map(p => [p.id, p]));
    return enrollments.map((e,i) => {
        const s = studentById.get(e.student_id), g = gradeByEnrollment.get(e.id);
        return { STT: i+1, 'Mã sinh viên': s.student_code, 'Họ tên': s.full_name, 'Lớp': s.class_name, 'Ngành': programById.get(s.program_id)?.program_name,
            'Chuyên cần': g?.attendance_score ?? '', 'Giữa kỳ': g?.midterm_score ?? '', 'Cuối kỳ': g?.final_score ?? '', 'Hệ 10': g?.total_score_10 ?? '', 'Hệ 4': g?.total_score_4 ?? '', 'Điểm chữ': g?.letter_grade ?? '' };
    });
}, 'DanhSachLop', 'Danh_sach_lop.xlsx');
const exportAllStudentsExcel = excel(async (_req, store) => {
    const students = await store.list('students');
    const users = await store.related('users', 'id', students.map(s => s.user_id));
    const programs = await store.related('programs', 'id', students.map(s => s.program_id).filter(Boolean));
    const userById = new Map(users.map(u => [u.id, u]));
    const programById = new Map(programs.map(p => [p.id, p]));
    return students.map((s,i) => ({ STT: i+1, 'Mã sinh viên': s.student_code, 'Họ tên': s.full_name, 'Giới tính': s.gender, 'Ngày sinh': String(s.birth_date || '').slice(0,10), 'Lớp': s.class_name, 'Khóa': s.academic_year,
        'Điện thoại': s.phone, Email: userById.get(s.user_id)?.email, 'Ngành': programById.get(s.program_id)?.program_name }));
}, 'SinhVien', 'Danh_sach_sinh_vien.xlsx');
const getAcademicReports = endpoint(async (req, store) => {
    const ownedClasses = await store.list('course_classes', req.user.role === 'ADMIN' ? {} : { lecturer_id: req.user.lecturer_id });
    const classes = await classesWithDetails(store, ownedClasses.filter(c => c.status !== 'CANCELLED').map(c => c.id));
    const enrollments = (await store.related('enrollments', 'course_class_id', classes.map(c => c.id))).filter(e => e.status === 'ENROLLED');
    const grades = await store.related('grades', 'enrollment_id', enrollments.map(e => e.id));
    const gradeDistribution = { A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, 'D+': 0, D: 0, F: 0 };
    for (const g of grades) if (g.total_score_10 != null && Object.hasOwn(gradeDistribution, g.letter_grade)) gradeDistribution[g.letter_grade]++;
    const gradedCount = Object.values(gradeDistribution).reduce((a,b) => a+b, 0), failedCount = gradeDistribution.F, passedCount = gradedCount-failedCount;
    return { data: { gradeDistribution, gradedCount, failedCount, passedCount, passRate: gradedCount ? ((passedCount/gradedCount)*100).toFixed(1) : '0.0',
        classOccupancy: classes.map(c => ({ ...c, occupancy_rate: c.max_students ? Math.round(c.current_students/c.max_students*100) : 0 })) } };
});
module.exports = { exportClassStudentsExcel, exportAllStudentsExcel, getAcademicReports };
