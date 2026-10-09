import { Link, useLocation } from 'react-router-dom';
import WorkspaceArt from './WorkspaceArt';
const guides = {
    '/admin/students': ['Hồ sơ sinh viên', 'Tìm theo mã hoặc tên, bấm nút mắt để xem hồ sơ, điểm và tín chỉ. Chọn Chỉnh sửa hồ sơ trong cửa sổ thông tin để cập nhật.'],
    '/admin/lecturers': ['Đội ngũ giảng dạy', 'Quản lý hồ sơ giảng viên; phân công giảng dạy khi mở lớp học phần.', '/admin/classes', 'Quản lý lớp'],
    '/admin/subjects': ['Danh mục môn học', 'Khai báo tín chỉ và môn tiên quyết trước khi mở lớp.', '/admin/classes', 'Mở lớp học phần'],
    '/admin/classes': ['Tổ chức lớp học phần', 'Chọn học kỳ, mở lớp và kiểm tra sĩ số. Nhập điểm và khóa bảng điểm ở trang riêng.', '/admin/grades', 'Nhập & khóa điểm'],
    '/admin/semesters': ['Kế hoạch đăng ký', 'Tạo học kỳ, chọn học kỳ hoạt động rồi thiết lập thời hạn và giới hạn tín chỉ.', '/admin/classes', 'Xem lớp học phần'],
    '/admin/users': ['Tài khoản & quyền truy cập', 'Tìm tài khoản để khóa, mở khóa hoặc đặt lại mật khẩu. Hồ sơ sinh viên và giảng viên được quản lý riêng.'],
    '/admin/grades': ['Quản lý bảng điểm', 'Chọn học kỳ → chọn lớp → nhập điểm → lưu từng sinh viên → khóa bảng điểm sau khi kiểm tra.', '/admin/students', 'Xem hồ sơ sinh viên'],
    '/lecturer/grades': ['Không gian giảng dạy', 'Chọn lớp phụ trách, nhập điểm và lưu từng sinh viên. Mở khóa bảng điểm trước khi cần sửa.', '/lecturer/academic', 'Xem GPA & thi lại'],
    '/student/registration': ['Lên kế hoạch học kỳ', 'Chọn học kỳ, tìm môn rồi đăng ký lớp. Hệ thống kiểm tra tiên quyết, sĩ số, tín chỉ và trùng lịch.', '/student/grades', 'Xem môn cần học lại'],
    '/student/timetable': ['Lịch học của bạn', 'Chọn học kỳ và tuần để xem đúng các buổi học đã đăng ký.', '/student/registration', 'Điều chỉnh đăng ký'],
    '/lecturer/timetable': ['Kế hoạch giảng dạy', 'Chọn học kỳ và tuần để xem lịch các lớp được phân công.', '/lecturer/grades', 'Đến bảng điểm'],
};
export default function PageGuide() {
    const { pathname } = useLocation();
    const item = guides[pathname];
    if (!item) return null;
    const [title, description, path, action] = item;
    return <section className="page-guide d-print-none"><div className="workspace-copy"><span className="eyebrow"><span className="hero-dot" />EDUPORTAL / KHÔNG GIAN LÀM VIỆC</span><h1>{title}</h1><p>{description}</p>{path && <Link className="btn btn-primary" to={path}>{action}<i className="bi bi-arrow-up-right" /></Link>}</div><WorkspaceArt /></section>;
}
