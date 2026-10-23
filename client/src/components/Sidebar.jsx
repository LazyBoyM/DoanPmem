import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

const menus = {
    ADMIN: [
        { title: 'Tổng quan', items: [['/admin', 'bi-grid-1x2', 'Bảng điều khiển']] },
        { title: 'Quản lý đào tạo', items: [['/admin/academic', 'bi-graph-up', 'Theo dõi học vụ'], ['/admin/students', 'bi-people', 'Hồ sơ sinh viên'], ['/admin/grades', 'bi-journal-check', 'Nhập & khóa điểm'], ['/admin/lecturers', 'bi-person-workspace', 'Đội ngũ giảng viên'], ['/admin/subjects', 'bi-journal-bookmark', 'Danh mục môn học'], ['/admin/classes', 'bi-collection', 'Lớp học phần'], ['/admin/facilities', 'bi-buildings', 'Cơ sở & phòng học'], ['/admin/semesters', 'bi-calendar3', 'Học kỳ & đợt đăng ký']] },
        { title: 'Hệ thống', items: [['/admin/audit-logs', 'bi-clock-history', 'Nhật ký kiểm toán'], ['/admin/users', 'bi-shield-check', 'Tài khoản & phân quyền']] },
    ],
    LECTURER: [{ title: 'Giảng viên', items: [['/lecturer/grades', 'bi-journal-check', 'Bảng điểm'], ['/lecturer/academic', 'bi-graph-up', 'Theo dõi sinh viên'], ['/lecturer/timetable', 'bi-calendar3', 'Lịch giảng dạy']] }],
    STUDENT: [{ title: 'Sinh viên', items: [['/student/registration', 'bi-journal-plus', 'Đăng ký tín chỉ'], ['/student/timetable', 'bi-calendar3', 'Thời khóa biểu tuần'], ['/student/grades', 'bi-bar-chart', 'Kết quả & thi lại']] }],
};
const roles = { ADMIN: 'Quản trị viên', LECTURER: 'Giảng viên', STUDENT: 'Sinh viên' };

export default function Sidebar({ open, onClose }) {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();
    if (!user) return null;
    const quickSwitch = async role => {
        const names = { ADMIN: 'admin', LECTURER: 'gv_thuan', STUDENT: '74dctt25001' };
        const result = await login(names[role], '123456');
        if (result.success) { onClose(); navigate(`/${role.toLowerCase()}`); }
    };
    const initials = (user.full_name || user.username).trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase();
    return <aside id="app-navigation" className={`app-sidebar ${open ? 'is-open' : ''}`} aria-label="Điều hướng chính">
        <div className="sidebar-header">
            <NavLink to="/" className="brand-logo-wrapper" onClick={onClose}>
                <span className="brand-icon"><i className="bi bi-shield-shaded" aria-hidden="true" /></span>
                <span><span className="brand-name">EduPortal<span className="brand-dot">.</span></span><span className="brand-sub">Cổng Đào Tạo</span></span>
            </NavLink>
            <button className="icon-button sidebar-close" onClick={onClose} aria-label="Đóng menu"><i aria-hidden="true" className="bi bi-x-lg" /></button>
        </div>
        <nav className="sidebar-nav-container">
            {(menus[user.role] || []).map(section => <div key={section.title}>
                <div className="nav-section-title">{section.title}</div>
                <ul className="sidebar-menu">{section.items.map(([path, icon, label]) => <li key={path}>
                    <NavLink to={path} end className={({ isActive }) => `sidebar-menu-link ${isActive ? 'active' : ''}`} onClick={onClose}><i className={`bi ${icon}`} aria-hidden="true" /><span>{label}</span></NavLink>
                </li>)}</ul>
            </div>)}
            {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true' && <div className="sidebar-role-selector"><div className="nav-section-title">Chuyển vai trò nhanh</div><div className="quick-role-buttons">{Object.keys(roles).map(role => <button key={role} className={`btn-role-quick ${user.role === role ? 'active' : ''}`} onClick={() => quickSwitch(role)}>{roles[role]}</button>)}</div></div>}
        </nav>
        <div className="sidebar-footer"><div className="user-profile-widget">
            <div className="user-avatar-circle">{initials}</div><div className="user-info-text"><div className="user-display-name" title={user.full_name || user.username}>{user.full_name || user.username}</div><span className="user-display-role">{roles[user.role]}</span></div>
            <button className="btn-sidebar-logout" onClick={logout} title="Đăng xuất khỏi hệ thống" aria-label="Đăng xuất"><i aria-hidden="true" className="bi bi-box-arrow-right" /></button>
        </div></div>
    </aside>;
}
