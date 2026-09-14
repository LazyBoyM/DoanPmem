import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Topbar = () => {
    const location = useLocation();
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
            setCurrentTime(`${dateStr} • ${timeStr}`);
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // Map route path to title
    const getPageTitle = () => {
        const path = location.pathname;
        if (path.includes('/admin/users')) return { title: 'Quản Lý Tài Khoản', icon: 'bi-shield-lock', breadcrumb: 'Quản Trị Viên / Quản Lý Tài Khoản' };
        if (path.includes('/admin/students')) return { title: 'Hồ Sơ Quản Lý Sinh Viên', icon: 'bi-backpack', breadcrumb: 'Quản Trị Viên / Hồ Sơ Quản Lý Sinh Viên' };
        if (path.includes('/admin/lecturers')) return { title: 'Hồ Sơ Quản Lý Giảng Viên', icon: 'bi-person-workspace', breadcrumb: 'Quản Trị Viên / Hồ Sơ Quản Lý Giảng Viên' };
        if (path.includes('/admin/subjects')) return { title: 'Danh Mục Môn Học & Học Phần', icon: 'bi-journal-bookmark', breadcrumb: 'Quản Trị Viên / Danh Mục Môn Học & Học Phần' };
        if (path.includes('/admin/semesters')) return { title: 'Năm Học, Học Kỳ & Đợt ĐKHP', icon: 'bi-calendar2-range', breadcrumb: 'Quản Trị Viên / Cấu Hình Đào Tạo' };
        if (path.includes('/admin/classes')) return { title: 'Quản Trị Lớp Học Phần', icon: 'bi-collection-play', breadcrumb: 'Quản Trị Viên / Quản Trị Lớp Học Phần' };
        if (path.includes('/admin')) return { title: 'Tổng Quan & Thống Kê Đào Tạo', icon: 'bi-speedometer2', breadcrumb: 'Quản Trị Viên / Dashboard Chỉ Số KPI' };
        
        if (path.includes('/lecturer/timetable')) return { title: 'Thời Khóa Biểu Giảng Dạy Trong Tuần', icon: 'bi-calendar-event', breadcrumb: 'Giảng Viên / Thời Khóa Biểu Giảng Dạy Trong Tuần' };
        if (path.includes('/lecturer/grades') || path.includes('/lecturer')) return { title: 'Quản Lý Lớp & Nhập Kết Quả Học Tập', icon: 'bi-journal-check', breadcrumb: 'Giảng Viên / Quản Lý Lớp & Nhập Kết Quả Học Tập' };

        if (path.includes('/student/timetable')) return { title: 'Thời Khóa Biểu Học Tập Tuần', icon: 'bi-calendar3-week', breadcrumb: 'Sinh Viên / Thời Khóa Biểu Học Tập Tuần' };
        if (path.includes('/student/grades')) return { title: 'Kết Quả Học Tập', icon: 'bi-award', breadcrumb: 'Sinh Viên / Kết Quả Học Tập' };
        if (path.includes('/student/registration') || path.includes('/student')) return { title: 'Cổng Đăng Ký Học Phần', icon: 'bi-card-checklist', breadcrumb: 'Sinh Viên / Đăng Ký Tín Chỉ' };
        
        return { title: 'EduPortal UTT', icon: 'bi-mortarboard-fill', breadcrumb: 'Hệ Thống Quản Lý Đào Tạo' };
    };

    const { title, icon, breadcrumb } = getPageTitle();

    return (
        <header className="app-topbar">
            <div className="page-title-area">
                <h1 className="page-main-title">
                    <i className={`bi ${icon} text-primary me-2`}></i> {title}
                </h1>
                <span className="page-breadcrumb">{breadcrumb}</span>
            </div>

            <div className="topbar-right-controls">
                {currentTime && (
                    <span className="text-muted small fw-semibold d-none d-lg-inline-block">
                        <i className="bi bi-clock me-1 text-secondary"></i>{currentTime}
                    </span>
                )}
                <div className="academic-semester-pill">
                    <i className="bi bi-calendar3"></i>
                    <span>HK1 (2026 - 2027)</span>
                </div>
                <div className="d-flex align-items-center gap-2 px-3 py-1 bg-success-subtle border border-success-subtle rounded-pill">
                    <span className="pulse-dot"></span>
                    <span className="text-success fw-bold small">Cổng ĐKHP Mở</span>
                </div>
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => window.location.reload()}
                    title="Làm mới dữ liệu trang"
                >
                    <i className="bi bi-arrow-clockwise"></i>
                </button>
            </div>
        </header>
    );
};

export default Topbar;
