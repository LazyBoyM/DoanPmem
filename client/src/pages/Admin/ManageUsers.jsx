import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/auth-context';

const ManageUsers = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/users');
            if (res.success) {
                // Ẩn tài khoản Admin khỏi danh sách
                const nonAdminUsers = (res.data || []).filter(u => u.role !== 'ADMIN');
                setUsers(nonAdminUsers);
            }
        } catch (err) {
            console.error('Lỗi lấy danh sách tài khoản:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (targetUser) => {
        // Kiểm tra an toàn: Không cho phép tự khóa tài khoản của chính mình
        if (currentUser && currentUser.id === targetUser.id) {
            alert('Bạn không thể tự khóa tài khoản của chính mình!');
            return;
        }

        // Kiểm tra an toàn: Không cho phép khóa tài khoản Admin
        if (targetUser.role === 'ADMIN') {
            alert('Không thể khóa tài khoản Quản trị viên (Admin)!');
            return;
        }

        try {
            const res = await axiosClient.put(`/admin/users/${targetUser.id}/status`);
            if (res.success) {
                fetchUsers();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái tài khoản.');
        }
    };

    const handleResetPassword = async (targetUser) => {
        if (!window.confirm(`Bạn có chắc muốn đặt lại mật khẩu cho tài khoản "${targetUser.username}" về mặc định (123456)?`)) {
            return;
        }
        try {
            const res = await axiosClient.put(`/admin/users/${targetUser.id}/reset-password`);
            if (res.success) {
                alert(res.message || 'Đặt lại mật khẩu thành công (123456).');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi đặt lại mật khẩu.');
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
            <div className="card shadow-sm border-0 p-4">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">
                            <i className="bi bi-shield-lock text-primary me-2"></i>Quản Lý Tài Khoản & Phân Quyền
                        </h4>
                        <p className="text-muted small mb-0">
                            Quản trị tài khoản Giảng viên và Sinh viên, cấp phát quyền hạn và kích hoạt đăng nhập
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <Link className="btn btn-primary btn-sm" to="/admin/students">Tạo hồ sơ & tài khoản sinh viên</Link>
                        <Link className="btn btn-outline-primary btn-sm" to="/admin/lecturers">Tạo hồ sơ & tài khoản giảng viên</Link>
                    </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="row g-3 mb-4">
                    <div className="col-md-7">
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted">
                                <i className="bi bi-search"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Tìm kiếm theo tên đăng nhập hoặc email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <select
                            className="form-select"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="">-- Tất cả vai trò người dùng --</option>
                            <option value="LECTURER">Giảng viên (LECTURER)</option>
                            <option value="STUDENT">Sinh viên (STUDENT)</option>
                        </select>
                    </div>
                </div>

                {/* Note badge */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-light text-dark border px-3 py-2">
                        Hiển thị <b>{filteredUsers.length}</b> tài khoản (Tài khoản Quản trị viên được bảo mật ẩn)
                    </span>
                </div>

                {/* Modern Data Table */}
                <div className="table-container-responsive">
                    <table className="table-modern text-center align-middle">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Tên Đăng Nhập</th>
                                <th className="text-start">Địa Chỉ Email</th>
                                <th>Vai Trò (Role)</th>
                                <th>Trạng Thái</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-4 text-muted">
                                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                        Đang tải danh sách tài khoản...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-4 text-muted">
                                        <i className="bi bi-inbox fs-3 d-block mb-1 text-secondary"></i>
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
                                            <i className="bi bi-envelope me-1"></i>
                                            {u.email || 'Chưa cập nhật'}
                                        </td>
                                        <td>
                                            <span className={`badge px-2 py-1 ${
                                                u.role === 'LECTURER'
                                                    ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                                    : 'bg-primary-subtle text-primary border border-primary-subtle'
                                            }`}>
                                                <i className={`bi ${u.role === 'LECTURER' ? 'bi-person-workspace' : 'bi-backpack'} me-1`}></i>
                                                {u.role === 'LECTURER' ? 'Giảng Viên' : 'Sinh Viên'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge px-2 py-1 ${u.status === 1 || u.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'}`}>
                                                {u.status === 1 || u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex justify-content-center gap-1">
                                                <button
                                                    className={`btn btn-sm px-2 py-1 ${
                                                        (u.status === 1 || u.status === 'ACTIVE')
                                                            ? 'btn-outline-danger'
                                                            : 'btn-outline-success'
                                                    }`}
                                                    onClick={() => toggleStatus(u)}
                                                    title={u.status === 1 || u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                >
                                                    <i className={`bi ${(u.status === 1 || u.status === 'ACTIVE') ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-primary btn-sm px-2 py-1"
                                                    onClick={() => handleResetPassword(u)}
                                                    title="Đặt lại mật khẩu về 123456"
                                                >
                                                    <i className="bi bi-key"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tạo Tài Khoản */}

        </div>
    );
};

export default ManageUsers;
