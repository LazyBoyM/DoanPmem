import RecordActions from '../../components/RecordActions';
import RecordWorkspace from '../../components/RecordWorkspace';
import LoadingState from '../../components/LoadingState';
import { useFeedback } from '../../context/feedback-context';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/auth-context';

const ManageUsers = () => {
    const { notify, confirm } = useFeedback();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');



    const fetchUsers = useCallback(async () => {
        try {
            const res = await axiosClient.get('/admin/users');
            if (res.success) {
                // Ẩn tài khoản Admin khỏi danh sách
                const nonAdminUsers = (res.data || []).filter(u => u.role !== 'ADMIN');
                setUsers(nonAdminUsers);
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi lấy danh sách tài khoản: Vui lòng dùng nút làm mới để thử lại.', 'danger');
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => {
        // HTTP responses update state after the request settles.
        // eslint-disable-next-line react/set-state-in-effect
        fetchUsers();
    }, [fetchUsers]);

    const toggleStatus = async (targetUser) => {
        // Kiểm tra an toàn: Không cho phép tự khóa tài khoản của chính mình
        if (currentUser && currentUser.id === targetUser.id) {
            notify('Bạn không thể tự khóa tài khoản của chính mình!');
            return;
        }

        // Kiểm tra an toàn: Không cho phép khóa tài khoản Admin
        if (targetUser.role === 'ADMIN') {
            notify('Không thể khóa tài khoản Quản trị viên (Admin)!');
            return;
        }

        try {
            const res = await axiosClient.put(`/admin/users/${targetUser.id}/status`);
            if (res.success) {
                fetchUsers();
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi cập nhật trạng thái tài khoản.', 'danger');
        }
    };

    const handleResetPassword = async (targetUser) => {
        if (!await confirm(`Bạn có chắc muốn đặt lại mật khẩu cho tài khoản "${targetUser.username}" về mặc định (123456)?`)) {
            return;
        }
        try {
            const res = await axiosClient.put(`/admin/users/${targetUser.id}/reset-password`);
            if (res.success) {
                notify(res.message || 'Đặt lại mật khẩu thành công (123456).');
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi đặt lại mật khẩu.', 'danger');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchSearch = (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = roleFilter ? u.role === roleFilter : true;
        return matchSearch && matchRole;
    });

    return (
        <div className="admin-pane">
            <RecordWorkspace heading={<>
                    <div>
                        <h1 className="fw-bold mb-1">
                            Tài khoản & phân quyền
                        </h1>
                        <p className="text-muted small mb-0">
                            Quản trị tài khoản Giảng viên và Sinh viên, cấp phát quyền hạn và kích hoạt đăng nhập
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <Link className="btn btn-primary btn-sm" to="/admin/students">Tạo hồ sơ & tài khoản sinh viên</Link>
                        <Link className="btn btn-outline-primary btn-sm" to="/admin/lecturers">Tạo hồ sơ & tài khoản giảng viên</Link>
                    </div>
                </>} filters={<>
                    <div className="col-md-7">
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted">
                                <i aria-hidden="true" className="bi bi-search"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                aria-label="Tìm trong danh sách" placeholder="Tìm kiếm theo tên đăng nhập hoặc email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <select aria-label="Lọc phạm vi danh sách"                             className="form-select"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="">-- Tất cả vai trò người dùng --</option>
                            <option value="LECTURER">Giảng viên (LECTURER)</option>
                            <option value="STUDENT">Sinh viên (STUDENT)</option>
                        </select>
                    </div>
                </>} sheetTitle="Danh sách tài khoản" filterTitle="Tra cứu tài khoản" summary={<>
                    <span className="badge bg-light text-dark border px-3 py-2">
                        Hiển thị <b>{filteredUsers.length}</b> tài khoản (Tài khoản Quản trị viên được bảo mật ẩn)
                    </span>
                </>}>
<div className="table-container-responsive">
                    <table className="table-modern text-center align-middle">
                        <thead>
                            <tr>
                                <th scope="col">STT</th>
                                <th scope="col">Tên Đăng Nhập</th>
                                <th scope="col" className="text-start">Địa Chỉ Email</th>
                                <th scope="col">Vai Trò (Role)</th>
                                <th scope="col">Trạng thái</th>
                                <th scope="col">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-4 text-muted">
                                        <LoadingState compact />
                                        Đang tải danh sách tài khoản...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-4 text-muted">
                                        <i aria-hidden="true" className="bi bi-inbox fs-3 d-block mb-1 text-secondary"></i>
                                        Không tìm thấy tài khoản nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u, idx) => (
                                    <tr key={u.id}>
                                        <td className="fw-semibold text-muted">{idx + 1}</td>
                                        <td>
                                            <span className="badge bg-light text-dark border px-2 py-1 font-monospace fs-6">
                                                {u.username}
                                            </span>
                                        </td>
                                        <td className="text-start text-muted small">
                                            <i aria-hidden="true" className="bi bi-envelope me-1"></i>
                                            {u.email || 'Chưa cập nhật'}
                                        </td>
                                        <td>
                                            <span className={`badge px-2 py-1 ${
                                                u.role === 'LECTURER'
                                                    ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                                    : 'bg-primary-subtle text-primary border border-primary-subtle'
                                            }`}>
                                                <i aria-hidden="true" className={`bi ${u.role === 'LECTURER' ? 'bi-person-workspace' : 'bi-backpack'} me-1`}></i>
                                                {u.role === 'LECTURER' ? 'Giảng Viên' : 'Sinh Viên'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge px-2 py-1 ${u.status === 1 || u.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'}`}>
                                                {u.status === 1 || u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <RecordActions label={u.full_name || u.subject_name || u.username || u.class_code}>
                                                <button
                                                    className={`btn btn-sm px-2 py-1 ${
                                                        (u.status === 1 || u.status === 'ACTIVE')
                                                            ? 'btn-outline-danger'
                                                            : 'btn-outline-success'
                                                    }`}
                                                    onClick={() => toggleStatus(u)}
                                                    title={u.status === 1 || u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                >
                                                    <i aria-hidden="true" className={`bi ${(u.status === 1 || u.status === 'ACTIVE') ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-primary btn-sm px-2 py-1"
                                                    onClick={() => handleResetPassword(u)}
                                                    title="Đặt lại mật khẩu về 123456" aria-label="Đặt lại mật khẩu về 123456"
                                                >
                                                    <i aria-hidden="true" className="bi bi-key"></i>
                                                </button>
                                            </RecordActions>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

</RecordWorkspace>

            {/* Modal Tạo Tài Khoản */}

        </div>
    );
};

export default ManageUsers;
