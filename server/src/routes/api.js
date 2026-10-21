const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middlewares/auth');
const { requireClassAccess } = require('../middlewares/classAccess');
const authController = require('../controllers/authController');
const registrationController = require('../controllers/registrationController');
const lecturerController = require('../controllers/lecturerController');
const adminController = require('../controllers/adminController');
const reportController = require('../controllers/reportController');
const academicController = require('../controllers/academicController');
router.get('/academic/students', verifyToken, requireRole(['ADMIN', 'LECTURER']), academicController.getStudents);
router.get('/academic/students/:studentId/transcript', verifyToken, requireRole(['ADMIN', 'LECTURER']), academicController.getTranscript);
router.post('/academic/resits', verifyToken, requireRole(['STUDENT']), academicController.requestResit);
router.put('/academic/resits', verifyToken, requireRole(['ADMIN', 'LECTURER']), academicController.recordResit);

router.post('/auth/login', authController.login);
router.get('/auth/me', verifyToken, authController.getProfile);
router.get('/academic/context', verifyToken, registrationController.getContext);
router.get('/registration/grades', verifyToken, requireRole(['STUDENT']), registrationController.getGrades);

router.get('/registration/open-classes', verifyToken, registrationController.getOpenClasses);
router.get('/registration/my-enrollments', verifyToken, requireRole(['STUDENT']), registrationController.getMyEnrollments);
router.post('/registration/enroll', verifyToken, requireRole(['STUDENT']), registrationController.registerClass);
router.post('/registration/cancel', verifyToken, requireRole(['STUDENT']), registrationController.cancelEnrollment);

router.get('/lecturer/my-classes', verifyToken, requireRole(['LECTURER', 'ADMIN']), lecturerController.getMyClasses);
router.get('/lecturer/class-students/:classId', verifyToken, requireRole(['LECTURER', 'ADMIN']), lecturerController.getClassStudents);
router.post('/lecturer/update-grades', verifyToken, requireRole(['LECTURER', 'ADMIN']), requireClassAccess, lecturerController.updateGrades);
router.put('/lecturer/lock-grades/:classId', verifyToken, requireRole(['LECTURER', 'ADMIN']), requireClassAccess, lecturerController.lockGrades);
router.get('/lecturer/timetable', verifyToken, requireRole(['LECTURER', 'ADMIN']), lecturerController.getLecturerTimetable);

router.get('/admin/stats', verifyToken, requireRole(['ADMIN']), adminController.getDashboardStats);
router.get('/admin/departments', verifyToken, requireRole(['ADMIN']), adminController.getAllDepartments);

router.get('/admin/users', verifyToken, requireRole(['ADMIN']), adminController.getAllUsers);
router.post('/admin/users', verifyToken, requireRole(['ADMIN']), adminController.createUser);
router.put('/admin/users/:id/status', verifyToken, requireRole(['ADMIN']), adminController.toggleUserStatus);
router.put('/admin/users/:id/reset-password', verifyToken, requireRole(['ADMIN']), adminController.resetUserPassword);

router.get('/admin/students', verifyToken, requireRole(['ADMIN']), adminController.getAllStudents);
router.post('/admin/students', verifyToken, requireRole(['ADMIN']), adminController.createStudent);
router.put('/admin/students/:id', verifyToken, requireRole(['ADMIN']), adminController.updateStudent);
router.delete('/admin/students/:id', verifyToken, requireRole(['ADMIN']), adminController.deleteStudent);

router.get('/admin/lecturers', verifyToken, requireRole(['ADMIN']), adminController.getAllLecturers);
router.post('/admin/lecturers', verifyToken, requireRole(['ADMIN']), adminController.createLecturer);
router.put('/admin/lecturers/:id', verifyToken, requireRole(['ADMIN']), adminController.updateLecturer);
router.delete('/admin/lecturers/:id', verifyToken, requireRole(['ADMIN']), adminController.deleteLecturer);

router.get('/admin/subjects', verifyToken, requireRole(['ADMIN']), adminController.getAllSubjects);
router.post('/admin/subjects', verifyToken, requireRole(['ADMIN']), adminController.createSubject);
router.put('/admin/subjects/:id', verifyToken, requireRole(['ADMIN']), adminController.updateSubject);
router.delete('/admin/subjects/:id', verifyToken, requireRole(['ADMIN']), adminController.deleteSubject);

router.get('/admin/programs', verifyToken, requireRole(['ADMIN']), adminController.getPrograms);
router.post('/admin/programs', verifyToken, requireRole(['ADMIN']), adminController.createProgram);

router.get('/admin/semesters', verifyToken, requireRole(['ADMIN']), adminController.getSemesters);
router.post('/admin/semesters', verifyToken, requireRole(['ADMIN']), adminController.createSemester);
router.put('/admin/semesters/:id/active', verifyToken, requireRole(['ADMIN']), adminController.setActiveSemester);
router.get('/admin/registration-periods', verifyToken, requireRole(['ADMIN']), adminController.getRegistrationPeriods);
router.post('/admin/registration-periods', verifyToken, requireRole(['ADMIN']), adminController.createRegistrationPeriod);
router.put('/admin/registration-periods/:id/toggle', verifyToken, requireRole(['ADMIN']), adminController.toggleRegistrationPeriod);

router.get('/admin/classes', verifyToken, requireRole(['ADMIN']), registrationController.getAllClasses);
router.post('/admin/create-class', verifyToken, requireRole(['ADMIN']), adminController.createCourseClass);
router.put('/admin/classes/:id/status', verifyToken, requireRole(['ADMIN']), adminController.updateClassStatus);
router.put('/admin/classes/:id/schedule', verifyToken, requireRole(['ADMIN']), adminController.updateClassSchedule);
const facilityController = require('../controllers/facilityController');
for (const [resource, handlers] of Object.entries({ buildings: ['getBuildings', 'createBuilding', 'updateBuilding', 'deleteBuilding'], rooms: ['getRooms', 'createRoom', 'updateRoom', 'deleteRoom'] })) {
    router.get(`/admin/${resource}`, verifyToken, requireRole(['ADMIN']), facilityController[handlers[0]]);
    router.post(`/admin/${resource}`, verifyToken, requireRole(['ADMIN']), facilityController[handlers[1]]);
    router.put(`/admin/${resource}/:id`, verifyToken, requireRole(['ADMIN']), facilityController[handlers[2]]);
    router.delete(`/admin/${resource}/:id`, verifyToken, requireRole(['ADMIN']), facilityController[handlers[3]]);
}
router.get('/admin/classes/:id/students', verifyToken, requireRole(['ADMIN']), adminController.getClassEnrolledStudents);

router.get('/reports/export-class-excel/:classId', verifyToken, requireRole(['LECTURER', 'ADMIN']), requireClassAccess, reportController.exportClassStudentsExcel);
router.get('/reports/export-students-excel', verifyToken, requireRole(['ADMIN']), reportController.exportAllStudentsExcel);
router.get('/reports/academic-stats', verifyToken, requireRole(['ADMIN', 'LECTURER']), reportController.getAcademicReports);

const training = require('../controllers/trainingController');
router.put('/admin/users/:id/role', verifyToken, requireRole(['ADMIN']), training.updateUserRole);
router.get('/admin/semesters/:id/registration-plans', verifyToken, requireRole(['ADMIN']), training.getRegistrationPlans);
router.get('/reports/export-registration-plans/:semesterId', verifyToken, requireRole(['ADMIN']), reportController.exportRegistrationPlans);
router.post('/admin/admin-accounts', verifyToken, requireRole(['ADMIN']), training.createAdmin);
for (const [path, handler] of [['/admin/programs/:id', 'updateProgram'], ['/admin/programs/:id/curriculum', 'saveCurriculum'], ['/admin/semesters/:id', 'updateSemester'], ['/admin/registration-periods/:id', 'updatePeriod'], ['/admin/classes/:id', 'updateClass']]) router.put(path, verifyToken, requireRole(['ADMIN']), training[handler]);
for (const [path, handler] of [['/admin/programs/:id', 'deleteProgram'], ['/admin/semesters/:id', 'deleteSemester'], ['/admin/registration-periods/:id', 'deletePeriod']]) router.delete(path, verifyToken, requireRole(['ADMIN']), training[handler]);
router.get('/admin/programs/:id/curriculum', verifyToken, requireRole(['ADMIN']), training.getCurriculum);
router.get('/registration/submission', verifyToken, requireRole(['STUDENT']), training.getSubmission);
router.post('/registration/submit', verifyToken, requireRole(['STUDENT']), training.submitRegistration);
module.exports = router;
