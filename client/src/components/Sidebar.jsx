import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

const Sidebar = () => {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const handleQuickSwitch = async (roleName) => {
        if (roleName === 'ADMIN' && user.role !== 'ADMIN') {
            const res = await login('admin', '123456');
            if (res.success) navigate('/admin');
        } else if (roleName === 'LECTURER' && user.role !== 'LECTURER') {
            const res = await login('gv_thuan', '123456');
            if (res.success) navigate('/lecturer');
        } else if (roleName === 'STUDENT' && user.role !== 'STUDENT') {
            const res = await login('74dctt25001', '123456');
            if (res.success) navigate('/student');
        }
    };

    const renderMenu = () => {
        if (user.role === 'ADMIN') {
            return (
                <>
                    <li className="sidebar-menu-item">
                        <NavLink to="/admin" end className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-speedometer2"></i> Tổng Quan & Thống Kê
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/admin/users" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-shield-lock"></i> Quản Lý Tài Khoản
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/admin/students" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-backpack"></i> Quản Lý Sinh Viên
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/admin/lecturers" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-person-workspace"></i> Quản Lý Giảng Viên
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/admin/subjects" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-journal-bookmark"></i> Danh Mục Môn Học
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/admin/semesters" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-calendar2-range"></i> Năm Học & Đợt ĐKHP
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/admin/classes" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-collection-play"></i> Quản Trị Lớp Học Phần
                        </NavLink>
                    </li>
                </>
            );
        } else if (user.role === 'LECTURER') {
            return (
                <>
                    <li className="sidebar-menu-item">
                        <NavLink to="/lecturer/grades" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-journal-check"></i> Quản Lý Lớp & Nhập Điểm
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/lecturer/timetable" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-calendar-event"></i> Lịch Giảng Dạy Tuần
                        </NavLink>
                    </li>
                </>
            );
        } else if (user.role === 'STUDENT') {
            return (
                <>
                    <li className="sidebar-menu-item">
                        <NavLink to="/student/registration" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-card-checklist"></i> Đăng Ký Học Phần
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/student/timetable" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-calendar3-week"></i> Thời Khóa Biểu Tuần
                        </NavLink>
                    </li>
                    <li className="sidebar-menu-item">
                        <NavLink to="/student/grades" className={({isActive}) => `sidebar-menu-link ${isActive ? 'active' : ''}`}>
                            <i className="bi bi-award"></i> Kết Quả Học Tập
                        </NavLink>
                    </li>
                </>
            );
        }
    };

    const getRoleName = () => {
        if (user.role === 'ADMIN') return 'Quản trị viên (Admin)';
        if (user.role === 'LECTURER') return 'Giảng viên';
        return 'Sinh viên';
    };

    const getAvatarText = () => {
        if (user.role === 'ADMIN') return 'QV';
        if (user.role === 'LECTURER') return 'GV';
        return 'SV';
    };

    return (
        <aside className="app-sidebar">
            <div className="sidebar-header">
                <div className="brand-logo-wrapper">
                    <div className="brand-icon">
                        <i className="bi bi-mortarboard-fill"></i>
                    </div>
                    <div>
                        <div className="brand-name">EduPortal</div>
                        <div className="brand-sub">Cổng Quản Lý Đào Tạo</div>
                    </div>
                </div>
            </div>

            {/* Quick Demo Role Switcher */}
            {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true' && (
            <div className="sidebar-role-selector">
                <div className="sidebar-role-label">
                    <i className="bi bi-arrow-repeat text-info"></i> Chuyển đổi vai trò test:
                </div>
                <div className="quick-role-buttons">
                    <button
                        className={`btn-role-quick ${user.role === 'ADMIN' ? 'active' : ''}`}
                        onClick={() => handleQuickSwitch('ADMIN')}
                        title="Đăng nhập tài khoản Admin"
                    >
                        <i className="bi bi-shield-check"></i> Admin
                    </button>
                    <button
                        className={`btn-role-quick ${user.role === 'LECTURER' ? 'active' : ''}`}
                        onClick={() => handleQuickSwitch('LECTURER')}
                        title="Đăng nhập Giảng viên"
                    >
                        <i className="bi bi-person-workspace"></i> GV
                    </button>
                    <button
                        className={`btn-role-quick ${user.role === 'STUDENT' ? 'active' : ''}`}
                        onClick={() => handleQuickSwitch('STUDENT')}
                        title="Đăng nhập Sinh viên"
                    >
                        <i className="bi bi-backpack"></i> SV
                    </button>
                </div>
            </div>

            )}

            <div className="sidebar-nav-container">
                <div className="nav-section-title">MENU CHỨC NĂNG</div>
                <ul className="sidebar-menu">
                    {renderMenu()}
                </ul>
            </div>

            <div className="sidebar-footer">
                <div className="user-profile-widget">
                    <div className="user-avatar-circle">{getAvatarText()}</div>
                    <div className="user-info-text">
                        <div className="user-display-name text-truncate" title={user.full_name || user.username}>
                            {user.full_name || user.username}
                        </div>
                        <span className="user-display-role text-truncate" title={getRoleName()}>
                            {getRoleName()}
                        </span>
                    </div>
                    <button className="btn-sidebar-logout" onClick={logout} title="Đăng xuất">
                        <i className="bi bi-box-arrow-right"></i>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
