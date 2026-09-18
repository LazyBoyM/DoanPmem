import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';

const ManageStudents = () => {
    const [students, setStudents] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProgram, setFilterProgram] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        student_code: '',
        full_name: '',
        gender: 'Nam',
        birth_date: '2004-01-01',
        phone: '',
        address: '',
        class_name: '',
        program_id: '1',
        academic_year: 'K74',
        email: '',
        password: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [studentsRes, programsRes] = await Promise.all([
                axiosClient.get('/admin/students'),
                axiosClient.get('/admin/programs')
            ]);
            if (studentsRes.success) setStudents(studentsRes.data);
            if (programsRes.success) setPrograms(programsRes.data);
        } catch (err) {
            console.error('Lỗi nạp dữ liệu sinh viên:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setIsEditing(false);
        setCurrentId(null);
        setFormData({
            student_code: '',
            full_name: '',
            gender: 'Nam',
            birth_date: '2004-01-01',
            phone: '',
            address: '',
            class_name: '',
            program_id: programs.length > 0 ? String(programs[0].id) : '1',
            academic_year: 'K74',
            email: '',
            password: '123456'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (st) => {
        setIsEditing(true);
        setCurrentId(st.id);
        setFormData({
            student_code: st.student_code,
            full_name: st.full_name,
            gender: st.gender || 'Nam',
            birth_date: st.birth_date ? st.birth_date.slice(0, 10) : '2004-01-01',
            phone: st.phone || '',
            address: st.address || '',
            class_name: st.class_name || '',
            program_id: String(st.program_id || 1),
            academic_year: st.academic_year || 'K74',
            email: st.email || '',
            password: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const res = await axiosClient.put(`/admin/students/${currentId}`, formData);
                if (res.success) {
                    alert('Cập nhật thông tin sinh viên thành công!');
                    setShowModal(false);
                    fetchData();
                }
            } else {
                const res = await axiosClient.post('/admin/students', formData);
                if (res.success) {
                    alert('Thêm sinh viên mới thành công!');
                    setShowModal(false);
                    fetchData();
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        }
    };

    const handleDelete = async (id, code, name) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa sinh viên ${name} (${code})?`)) return;
        try {
            const res = await axiosClient.delete(`/admin/students/${id}`);
            if (res.success) {
                alert('Xóa sinh viên thành công!');
                fetchData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi xóa sinh viên.');
        }
    };

    const handleResetPassword = async (userId, studentCode) => {
        if (!userId) {
            alert('Không tìm thấy thông tin tài khoản của sinh viên.');
            return;
        }
        if (!window.confirm(`Đặt lại mật khẩu cho sinh viên ${studentCode} về mặc định (123456)?`)) return;
        try {
            const res = await axiosClient.put(`/admin/users/${userId}/reset-password`);
            if (res.success) {
                alert(res.message || 'Đặt lại mật khẩu thành công.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi đặt lại mật khẩu.');
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        if (!userId) return;
        try {
            const newStatus = currentStatus === 1 ? 'LOCKED' : 'ACTIVE';
            const res = await axiosClient.put(`/admin/users/${userId}/status`, { status: newStatus });
            if (res.success) {
                fetchData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi thay đổi trạng thái.');
        }
    };

    const handleExportExcel = async () => {
        try {
            await downloadFile('/reports/export-students-excel', 'Danh_sach_sinh_vien.xlsx');
        } catch (err) {
            console.error('Lỗi tải file Excel:', err);
            alert('Không thể tải file Excel. Vui lòng kiểm tra lại server.');
        }
    };

    const filteredStudents = students.filter(st => {
        const matchSearch = (st.student_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (st.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (st.class_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchProgram = filterProgram ? String(st.program_id) === filterProgram : true;
        return matchSearch && matchProgram;
    });

    return (
        <div className="admin-pane">
            <div className="card shadow-sm border-0 p-4">
                {/* Top Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">
                            <i className="bi bi-backpack text-primary me-2"></i>Quản Lý Hồ Sơ Sinh Viên
                        </h4>
                        <p className="text-muted small mb-0">
                            Tra cứu, thêm mới, sửa đổi hồ sơ sinh viên, quản lý tài khoản và xuất danh sách
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={handleExportExcel}>
                            <i className="bi bi-file-earmark-excel me-1"></i> Xuất File Excel
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                            <i className="bi bi-person-plus me-1"></i> Thêm Sinh Viên Mới
                        </button>
                    </div>
                </div>

                {/* Filter & Search */}
                <div className="row g-3 mb-4">
                    <div className="col-md-7">
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted">
                                <i className="bi bi-search"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Tìm kiếm theo mã SV, họ tên hoặc lớp sinh hoạt..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <select
                            className="form-select"
                            value={filterProgram}
                            onChange={(e) => setFilterProgram(e.target.value)}
                        >
                            <option value="">-- Tất cả ngành đào tạo --</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.program_name} ({p.program_code})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Counter */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-light text-dark border px-3 py-2">
                        Hiển thị <b>{filteredStudents.length}</b> / <b>{students.length}</b> sinh viên
                    </span>
                </div>

                {/* Table */}
                <div className="table-container-responsive">
                    <table className="table-modern text-center align-middle">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Mã SV</th>
                                <th className="text-start">Họ và Tên</th>
                                <th>Lớp SH</th>
                                <th>Chương Trình Đào Tạo</th>
                                <th>Liên Hệ</th>
                                <th>Trạng Thái</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-muted">
                                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                        Đang tải dữ liệu sinh viên...
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-muted">
                                        <i className="bi bi-inbox fs-3 d-block mb-1 text-secondary"></i>
                                        Không tìm thấy sinh viên nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((st, idx) => (
                                    <tr key={st.id}>
                                        <td className="fw-semibold text-muted">{idx + 1}</td>
                                        <td>
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                                {st.student_code}
                                            </span>
                                        </td>
                                        <td className="text-start">
                                            <div className="fw-bold text-dark">{st.full_name}</div>
                                            <div className="small text-muted">
                                                {st.gender} | {st.birth_date ? st.birth_date.slice(0, 10) : '---'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                                                {st.class_name}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="small fw-semibold">{st.program_name || 'Công nghệ Thông tin'}</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Khóa: {st.academic_year || 'K74'}</div>
                                        </td>
                                        <td className="text-start small">
                                            <div><i className="bi bi-envelope me-1 text-muted"></i>{st.email || '---'}</div>
                                            <div><i className="bi bi-telephone me-1 text-muted"></i>{st.phone || '---'}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${st.status === 1 ? 'bg-success' : 'bg-danger'}`}>
                                                {st.status === 1 ? 'Hoạt động' : 'Bị khóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex justify-content-center gap-1">
                                                <button
                                                    className="btn btn-outline-primary btn-sm px-2 py-1"
                                                    title="Chỉnh sửa thông tin"
                                                    onClick={() => handleOpenEdit(st)}
                                                >
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-warning btn-sm px-2 py-1"
                                                    title="Đặt lại mật khẩu về 123456"
                                                    onClick={() => handleResetPassword(st.user_id, st.student_code)}
                                                >
                                                    <i className="bi bi-key"></i>
                                                </button>
                                                <button
                                                    className={`btn btn-sm px-2 py-1 ${st.status === 1 ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                                                    title={st.status === 1 ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                    onClick={() => handleToggleStatus(st.user_id, st.status)}
                                                >
                                                    <i className={`bi ${st.status === 1 ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    title="Xóa hồ sơ sinh viên"
                                                    onClick={() => handleDelete(st.id, st.student_code, st.full_name)}
                                                >
                                                    <i className="bi bi-trash"></i>
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

            {/* Modal Thêm/Sửa */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i className={`bi ${isEditing ? 'bi-pencil-square text-warning' : 'bi-person-plus text-primary'} me-2`}></i>
                                    {isEditing ? 'Chỉnh Sửa Hồ Sơ Sinh Viên' : 'Thêm Sinh Viên Mới'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Mã Sinh Viên *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: 74DCTT25005"
                                                disabled={isEditing}
                                                required
                                                value={formData.student_code}
                                                onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Họ và Tên *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: Nguyễn Văn An"
                                                required
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Giới Tính</label>
                                            <select
                                                className="form-select"
                                                value={formData.gender}
                                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            >
                                                <option value="Nam">Nam</option>
                                                <option value="Nữ">Nữ</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Ngày Sinh</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.birth_date}
                                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Số Điện Thoại</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="09..."
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Lớp Sinh Hoạt *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: 2DCTT745"
                                                required
                                                value={formData.class_name}
                                                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Chương Trình / Ngành</label>
                                            <select
                                                className="form-select"
                                                value={formData.program_id}
                                                onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                                            >
                                                {programs.map(p => (
                                                    <option key={p.id} value={p.id}>{p.program_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Khóa Học</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: K74"
                                                value={formData.academic_year}
                                                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Địa Chỉ Thường Trú</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Hà Nội,..."
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                        {!isEditing && (
                                            <div className="col-md-12">
                                                <div className="p-3 bg-light rounded small text-muted">
                                                    <i className="bi bi-info-circle text-primary me-1"></i>
                                                    Tài khoản đăng nhập hệ thống sẽ tự động được tạo với <b>Username = Mã sinh viên</b> và <b>Mật khẩu mặc định: 123456</b>.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary btn-sm px-4">
                                        <i className="bi bi-check-circle me-1"></i> {isEditing ? 'Lưu Thay Đổi' : 'Tạo Sinh Viên'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageStudents;
