import { useState, useEffect } from 'react';
import { useAcademic } from '../context/academic-context';
import { useLocation } from 'react-router-dom';

const titles = {
    '/admin': 'Bảng điều khiển',
    '/admin/academic': 'Theo dõi học vụ',
    '/admin/students': 'Hồ sơ sinh viên',
    '/admin/lecturers': 'Giảng viên',
    '/admin/facilities': 'Cơ sở & phòng học',
    '/admin/subjects': 'Danh mục môn học',
    '/admin/classes': 'Lớp học phần',
    '/admin/semesters': 'Học kỳ & đợt đăng ký',
    '/admin/audit-logs': 'Nhật ký kiểm toán',
    '/admin/users': 'Tài khoản & phân quyền',
    '/admin/grades': 'Nhập & khóa điểm',
    '/lecturer/grades': 'Bảng điểm',
    '/lecturer/academic': 'Theo dõi sinh viên',
    '/lecturer/timetable': 'Lịch giảng dạy',
    '/student/registration': 'Đăng ký tín chỉ',
    '/student/timetable': 'Thời khóa biểu',
    '/student/grades': 'Kết quả & thi lại',
};

export default function Topbar({ menuOpen, onMenuToggle }) {
    const { semester, period, loading, error } = useAcademic();
    const { pathname } = useLocation();
    const [theme, setTheme] = useState(() => localStorage.getItem('eduportal_theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('eduportal_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return <header className="app-topbar">
        <div className="topbar-location">
            <button className="icon-button mobile-menu-toggle" onClick={onMenuToggle} aria-label="Mở menu điều hướng" aria-expanded={menuOpen} aria-controls="app-navigation"><i aria-hidden="true" className="bi bi-list" /></button>
            <span className="topbar-home"><i className="bi bi-mortarboard" aria-hidden="true" /></span><span className="breadcrumb-divider">/</span><span className="topbar-page">{titles[pathname] || 'Cổng đào tạo'}</span>
        </div>
        <div className="topbar-right-controls">
            <span className="academic-semester-pill">
                <i className="bi bi-calendar3" aria-hidden="true" />
                <span>{semester?.semester_name || 'Học kỳ chính'}</span>
            </span>
            {pathname === '/student/registration' && (
                <span className={`portal-status-tag ${period && !error && !loading ? 'is-open' : ''}`}>
                    <span className="status-dot" />
                    <span>{loading ? 'Đang tải' : error ? 'Chưa rõ trạng thái' : period ? 'Đăng ký đang mở' : 'Đăng ký đã đóng'}</span>
                </span>
            )}
            <button
                className="icon-button theme-toggle-btn"
                aria-label="Chuyển đổi giao diện sáng tối"
                title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                onClick={toggleTheme}
            >
                <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} aria-hidden="true" />
            </button>
        </div>
    </header>;
}
