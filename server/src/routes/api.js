const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middlewares/auth');
const { requireClassAccess } = require('../middlewares/classAccess');
const authController = require('../controllers/authController');
const registrationController = require('../controllers/registrationController');
const lecturerController = require('../controllers/lecturerController');
const adminController = require('../controllers/adminController');
const reportController = require('../controllers/reportController');

// ==========================================================
// 1. AUTH & PROFILE (Public & Authenticated)
// ==========================================================
router.post('/auth/login', authController.login);
router.get('/auth/me', verifyToken, authController.getProfile);
router.get('/academic/context', verifyToken, registrationController.getContext);
router.get('/registration/grades', verifyToken, requireRole(['STUDENT']), registrationController.getGrades);

// ==========================================================
// 2. SINH VIÊN & ĐĂNG KÝ HỌC PHẦN (CHỨC NĂNG 7, 8, 10, 11)
// ==========================================================
router.get('/registration/open-classes', verifyToken, registrationController.getOpenClasses);
router.get('/registration/my-enrollments', verifyToken, requireRole(['STUDENT']), registrationController.getMyEnrollments);
router.post('/registration/enroll', verifyToken, requireRole(['STUDENT']), registrationController.registerClass);
router.post('/registration/cancel', verifyToken, requireRole(['STUDENT']), registrationController.cancelEnrollment);

// ==========================================================
// 3. GIẢNG VIÊN & NHẬP ĐIỂM (CHỨC NĂNG 9, 11)
// ==========================================================
router.get('/lecturer/my-classes', verifyToken, requireRole(['LECTURER', 'ADMIN']), lecturerController.getMyClasses);
router.get('/lecturer/class-students/:classId', verifyToken, requireRole(['LECTURER', 'ADMIN']), lecturerController.getClassStudents);
router.post('/lecturer/update-grades', verifyToken, requireRole(['LECTURER', 'ADMIN']), requireClassAccess, lecturerController.updateGrades);
router.put('/lecturer/lock-grades/:classId', verifyToken, requireRole(['LECTURER', 'ADMIN']), requireClassAccess, lecturerController.lockGrades);
router.get('/lecturer/timetable', verifyToken, requireRole(['LECTURER', 'ADMIN']), lecturerController.getLecturerTimetable);

// ==========================================================
// 4. QUẢN TRỊ VIÊN ADMIN (CHỨC NĂNG 1, 2, 3, 4, 5, 6)
// ==========================================================
// 4.1. Thống kê & Dashboard
router.get('/admin/stats', verifyToken, requireRole(['ADMIN']), adminController.getDashboardStats);
router.get('/admin/departments', verifyToken, requireRole(['ADMIN']), adminController.getAllDepartments);

// 4.2. Quản lý Tài khoản (Chức năng 1)
router.get('/admin/users', verifyToken, requireRole(['ADMIN']), adminController.getAllUsers);
router.post('/admin/users', verifyToken, requireRole(['ADMIN']), adminController.createUser);
router.put('/admin/users/:id/status', verifyToken, requireRole(['ADMIN']), adminController.toggleUserStatus);
router.put('/admin/users/:id/reset-password', verifyToken, requireRole(['ADMIN']), adminController.resetUserPassword);

// 4.3. Quản lý Sinh viên (Chức năng 2)
router.get('/admin/students', verifyToken, requireRole(['ADMIN']), adminController.getAllStudents);
router.post('/admin/students', verifyToken, requireRole(['ADMIN']), adminController.createStudent);
router.put('/admin/students/:id', verifyToken, requireRole(['ADMIN']), adminController.updateStudent);
router.delete('/admin/students/:id', verifyToken, requireRole(['ADMIN']), adminController.deleteStudent);

// 4.4. Quản lý Giảng viên (Chức năng 2)
router.get('/admin/lecturers', verifyToken, requireRole(['ADMIN']), adminController.getAllLecturers);
router.post('/admin/lecturers', verifyToken, requireRole(['ADMIN']), adminController.createLecturer);
router.put('/admin/lecturers/:id', verifyToken, requireRole(['ADMIN']), adminController.updateLecturer);
router.delete('/admin/lecturers/:id', verifyToken, requireRole(['ADMIN']), adminController.deleteLecturer);

// 4.5. Quản lý Môn học (Chức năng 3)
router.get('/admin/subjects', verifyToken, requireRole(['ADMIN']), adminController.getAllSubjects);
router.post('/admin/subjects', verifyToken, requireRole(['ADMIN']), adminController.createSubject);
router.put('/admin/subjects/:id', verifyToken, requireRole(['ADMIN']), adminController.updateSubject);
router.delete('/admin/subjects/:id', verifyToken, requireRole(['ADMIN']), adminController.deleteSubject);

// 4.6. Quản lý Chương trình đào tạo (Chức năng 4)
router.get('/admin/programs', verifyToken, requireRole(['ADMIN']), adminController.getPrograms);
router.post('/admin/programs', verifyToken, requireRole(['ADMIN']), adminController.createProgram);

// 4.7. Quản lý Năm học & Học kỳ, Đợt đăng ký (Chức năng 5)
router.get('/admin/semesters', verifyToken, requireRole(['ADMIN']), adminController.getSemesters);
router.post('/admin/semesters', verifyToken, requireRole(['ADMIN']), adminController.createSemester);
router.put('/admin/semesters/:id/active', verifyToken, requireRole(['ADMIN']), adminController.setActiveSemester);
router.get('/admin/registration-periods', verifyToken, requireRole(['ADMIN']), adminController.getRegistrationPeriods);
router.post('/admin/registration-periods', verifyToken, requireRole(['ADMIN']), adminController.createRegistrationPeriod);
router.put('/admin/registration-periods/:id/toggle', verifyToken, requireRole(['ADMIN']), adminController.toggleRegistrationPeriod);

// 4.8. Mở và quản lý lớp học phần (Chức năng 6)
router.get('/admin/classes', verifyToken, requireRole(['ADMIN']), registrationController.getAllClasses);
router.post('/admin/create-class', verifyToken, requireRole(['ADMIN']), adminController.createCourseClass);
router.put('/admin/classes/:id/status', verifyToken, requireRole(['ADMIN']), adminController.updateClassStatus);
router.get('/admin/classes/:id/students', verifyToken, requireRole(['ADMIN']), adminController.getClassEnrolledStudents);

// ==========================================================
// 5. THỐNG KÊ, BÁO CÁO & XUẤT FILE EXCEL (CHỨC NĂNG 12)
// ==========================================================
router.get('/reports/export-class-excel/:classId', verifyToken, requireRole(['LECTURER', 'ADMIN']), requireClassAccess, reportController.exportClassStudentsExcel);
router.get('/reports/export-students-excel', verifyToken, requireRole(['ADMIN']), reportController.exportAllStudentsExcel);
router.get('/reports/academic-stats', verifyToken, requireRole(['ADMIN', 'LECTURER']), reportController.getAcademicReports);

module.exports = router;
