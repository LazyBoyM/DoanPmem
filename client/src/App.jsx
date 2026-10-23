import './portalLedger.css';
import FeedbackProvider from './context/FeedbackProvider';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const ManageUsers = lazy(() => import('./pages/Admin/ManageUsers'));
const ManageStudents = lazy(() => import('./pages/Admin/ManageStudents'));
const ManageLecturers = lazy(() => import('./pages/Admin/ManageLecturers'));
const ManageSubjects = lazy(() => import('./pages/Admin/ManageSubjects'));
const ManageSemesters = lazy(() => import('./pages/Admin/ManageSemesters'));
const ManageClasses = lazy(() => import('./pages/Admin/ManageClasses'));
const ManageFacilities = lazy(() => import('./pages/Admin/ManageFacilities'));
const AuditLogs = lazy(() => import('./pages/Admin/AuditLogs'));
const LecturerDashboard = lazy(() => import('./pages/Lecturer/Dashboard'));
const LecturerTimetable = lazy(() => import('./pages/Lecturer/Timetable'));
const StudentDashboard = lazy(() => import('./pages/Student/Dashboard'));
const StudentTimetable = lazy(() => import('./pages/Student/Timetable'));
const AcademicStudents = lazy(() => import('./pages/AcademicStudents'));
const StudentGrades = lazy(() => import('./pages/Student/Grades'));

const AppRoutes = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
            </div>
        </div>;
    }

    return (
        <Router>
            <Suspense fallback={<div className="d-flex justify-content-center p-5" role="status"><span className="spinner-border text-primary" aria-hidden="true" /><span className="visually-hidden">Đang tải trang...</span></div>}>
            <Routes>
                
                <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

                
                <Route element={<MainLayout />}>
                    
                    <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/academic" element={<AcademicStudents />} />
                        <Route path="/admin/audit-logs" element={<AuditLogs />} />
                        <Route path="/admin/grades" element={<LecturerDashboard />} />
                        <Route path="/admin/users" element={<ManageUsers />} />
                        <Route path="/admin/students" element={<ManageStudents />} />
                        <Route path="/admin/lecturers" element={<ManageLecturers />} />
                        <Route path="/admin/subjects" element={<ManageSubjects />} />
                        <Route path="/admin/semesters" element={<ManageSemesters />} />
                        <Route path="/admin/classes" element={<ManageClasses />} />
                        <Route path="/admin/facilities" element={<ManageFacilities />} />
                    </Route>

                    
                    <Route element={<ProtectedRoute allowedRoles={['LECTURER', 'ADMIN']} />}>
                        <Route path="/lecturer" element={<Navigate to="/lecturer/grades" replace />} />
                        <Route path="/lecturer/grades" element={<LecturerDashboard />} />
                        <Route path="/lecturer/academic" element={<AcademicStudents />} />
                        <Route path="/lecturer/timetable" element={<LecturerTimetable />} />
                    </Route>

                    
                    <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                        <Route path="/student" element={<Navigate to="/student/registration" replace />} />
                        <Route path="/student/registration" element={<StudentDashboard />} />
                        <Route path="/student/timetable" element={<StudentTimetable />} />
                        <Route path="/student/grades" element={<StudentGrades />} />
                    </Route>
                </Route>

                
                <Route path="/" element={
                    !user ? <Navigate to="/login" /> :
                    user.role === 'ADMIN' ? <Navigate to="/admin" /> :
                    user.role === 'LECTURER' ? <Navigate to="/lecturer" /> :
                    <Navigate to="/student" />
                } />

                
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            </Suspense>
        </Router>
    );
};

function App() {
    return (
        <AuthProvider>
            <FeedbackProvider>
            <AppRoutes />
        </FeedbackProvider>
        </AuthProvider>
    );
}

export default App;
