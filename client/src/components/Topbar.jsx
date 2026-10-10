import { useAcademic } from '../context/academic-context';
import { useLocation } from 'react-router-dom';

const titles = {
    '/admin/grades': 'Nhập & khóa điểm', '/lecturer/academic': 'Theo dõi sinh viên',
    '/admin': 'Bảng điều khiển', '/admin/students': 'Sinh viên', '/admin/lecturers': 'Giảng viên',
    '/admin/facilities': 'Tòa nhà & phòng học', '/admin/subjects': 'Môn học', '/admin/classes': 'Lớp học phần', '/admin/semesters': 'Học kỳ & đăng ký', '/admin/users': 'Tài khoản & phân quyền',
    '/lecturer/grades': 'Nhập & khóa điểm', '/lecturer/timetable': 'Lịch giảng dạy',
    '/student/registration': 'Đăng ký học phần', '/student/timetable': 'Thời khóa biểu', '/student/grades': 'Kết quả & thi lại',
};
export default function Topbar({ menuOpen, onMenuToggle }) {
    const { semester, period, loading, error } = useAcademic();
    const { pathname } = useLocation();
    return <header className="app-topbar">
        <div className="topbar-location">
            <button className="icon-button mobile-menu-toggle" onClick={onMenuToggle} aria-label="Mở menu điều hướng" aria-expanded={menuOpen} aria-controls="app-navigation"><i aria-hidden="true" className="bi bi-list" /></button>
            <span className="topbar-home"><i className="bi bi-house-door" aria-hidden="true" /></span><span className="breadcrumb-divider">/</span><span className="topbar-page">{titles[pathname] || 'Cổng đào tạo'}</span>
        </div>
        <div className="topbar-right-controls">
            <span className="academic-semester-pill"><i className="bi bi-calendar3" aria-hidden="true" /><span>{semester?.semester_name || 'Chưa chọn học kỳ'}</span></span>
            <span className={`portal-status-tag ${period && !error && !loading ? 'is-open' : ''}`}><span className="status-dot" /><span>{loading ? 'Đang tải' : error ? 'Chưa rõ trạng thái' : period ? 'Đăng ký đang mở' : 'Đăng ký đã đóng'}</span></span>
            <button className="icon-button" aria-label="Làm mới trang và dữ liệu" title="Làm mới trang" onClick={() => window.location.reload()}><i className="bi bi-arrow-clockwise" aria-hidden="true" /></button>
        </div>
    </header>;
}
