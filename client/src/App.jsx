import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

import Login from './pages/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import ManageUsers from './pages/Admin/ManageUsers';
import ManageStudents from './pages/Admin/ManageStudents';
import ManageLecturers from './pages/Admin/ManageLecturers';
import ManageSubjects from './pages/Admin/ManageSubjects';
import ManageSemesters from './pages/Admin/ManageSemesters';
import ManageClasses from './pages/Admin/ManageClasses';
import LecturerDashboard from './pages/Lecturer/Dashboard';
import LecturerTimetable from './pages/Lecturer/Timetable';
import StudentDashboard from './pages/Student/Dashboard';
import StudentTimetable from './pages/Student/Timetable';
import StudentGrades from './pages/Student/Grades';

// Import CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

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
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

                {/* Protected Routes wrapped in MainLayout */}
                <Route element={<MainLayout />}>
                    {/* Admin Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/users" element={<ManageUsers />} />
                        <Route path="/admin/students" element={<ManageStudents />} />
                        <Route path="/admin/lecturers" element={<ManageLecturers />} />
                        <Route path="/admin/subjects" element={<ManageSubjects />} />
                        <Route path="/admin/semesters" element={<ManageSemesters />} />
                        <Route path="/admin/classes" element={<ManageClasses />} />
                    </Route>

                    {/* Lecturer Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['LECTURER', 'ADMIN']} />}>
                        <Route path="/lecturer" element={<Navigate to="/lecturer/grades" replace />} />
                        <Route path="/lecturer/grades" element={<LecturerDashboard />} />
                        <Route path="/lecturer/timetable" element={<LecturerTimetable />} />
                    </Route>

                    {/* Student Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                        <Route path="/student" element={<Navigate to="/student/registration" replace />} />
                        <Route path="/student/registration" element={<StudentDashboard />} />
                        <Route path="/student/timetable" element={<StudentTimetable />} />
                        <Route path="/student/grades" element={<StudentGrades />} />
                    </Route>
                </Route>

                {/* Root Redirect based on role */}
                <Route path="/" element={
                    !user ? <Navigate to="/login" /> :
                    user.role === 'ADMIN' ? <Navigate to="/admin" /> :
                    user.role === 'LECTURER' ? <Navigate to="/lecturer" /> :
                    <Navigate to="/student" />
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}

export default App;
