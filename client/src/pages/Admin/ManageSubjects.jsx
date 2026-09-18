import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

const ManageSubjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        subject_code: '',
        subject_name: '',
        credits: 3,
        theory_periods: 30,
        practice_periods: 15,
        department_id: '1',
        prerequisite_id: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [subRes, deptRes] = await Promise.all([
                axiosClient.get('/admin/subjects'),
                axiosClient.get('/admin/departments')
            ]);
            if (subRes.success) setSubjects(subRes.data);
            if (deptRes.success) setDepartments(deptRes.data);
        } catch (err) {
            console.error('Lỗi nạp dữ liệu môn học:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setIsEditing(false);
        setCurrentId(null);
        setFormData({
            subject_code: '',
            subject_name: '',
            credits: 3,
            theory_periods: 30,
            practice_periods: 15,
            department_id: departments.length > 0 ? String(departments[0].id) : '1',
            prerequisite_id: ''
        });
        setShowModal(true);
    };

    const handleOpenEdit = (sub) => {
        setIsEditing(true);
        setCurrentId(sub.id);
        setFormData({
            subject_code: sub.subject_code,
            subject_name: sub.subject_name,
            credits: sub.credits ?? 3,
            theory_periods: sub.theory_periods ?? 30,
            practice_periods: sub.practice_periods ?? 15,
            department_id: String(sub.department_id || 1),
            prerequisite_id: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const res = await axiosClient.put(`/admin/subjects/${currentId}`, formData);
                if (res.success) {
                    alert('Cập nhật thông tin môn học thành công!');
                    setShowModal(false);
                    fetchData();
                }
            } else {
                const res = await axiosClient.post('/admin/subjects', formData);
                if (res.success) {
                    alert('Thêm môn học mới thành công!');
                    setShowModal(false);
                    fetchData();
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        }
    };

    const handleDelete = async (id, code, name) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa môn học ${name} (${code})?`)) return;
        try {
            const res = await axiosClient.delete(`/admin/subjects/${id}`);
            if (res.success) {
                alert('Xóa môn học thành công!');
                fetchData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi xóa môn học.');
        }
    };

    const filteredSubjects = subjects.filter(s => {
        const matchSearch = (s.subject_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (s.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchDept = filterDept ? String(s.department_id) === filterDept : true;
        return matchSearch && matchDept;
    });

    return (
        <div className="admin-pane">
            <div className="card shadow-sm border-0 p-4">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">
                            <i className="bi bi-journal-bookmark text-primary me-2"></i>Danh Mục Môn Học & Học Phần
                        </h4>
                        <p className="text-muted small mb-0">
                            Quản lý định lượng tín chỉ, số tiết lý thuyết, thực hành và điều kiện môn học tiên quyết
                        </p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                        <i className="bi bi-plus-circle me-1"></i> Thêm Môn Học Mới
                    </button>
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
                                placeholder="Tìm kiếm theo mã môn học hoặc tên môn học..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <select
                            className="form-select"
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            <option value="">-- Tất cả Khoa / Bộ môn --</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.department_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Counter */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-light text-dark border px-3 py-2">
                        Hiển thị <b>{filteredSubjects.length}</b> / <b>{subjects.length}</b> môn học
                    </span>
                </div>

                {/* Table */}
                <div className="table-container-responsive">
                    <table className="table-modern text-center align-middle">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Mã Môn</th>
                                <th className="text-start">Tên Môn Học</th>
                                <th>Số Tín Chỉ</th>
                                <th>Lý Thuyết / Thực Hành</th>
                                <th>Khoa Phụ Trách</th>
                                <th>Môn Tiên Quyết</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-muted">
                                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                        Đang tải danh mục môn học...
                                    </td>
                                </tr>
                            ) : filteredSubjects.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-muted">
                                        <i className="bi bi-inbox fs-3 d-block mb-1 text-secondary"></i>
                                        Không tìm thấy môn học nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubjects.map((sub, idx) => (
                                    <tr key={sub.id}>
                                        <td className="fw-semibold text-muted">{idx + 1}</td>
                                        <td>
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                                {sub.subject_code}
                                            </span>
                                        </td>
                                        <td className="text-start">
                                            <div className="fw-bold text-dark">{sub.subject_name}</div>
                                        </td>
                                        <td>
                                            <span className="badge bg-info-subtle text-info-emphasis px-2 py-1 fs-6">
                                                {sub.credits} TC
                                            </span>
                                        </td>
                                        <td>
                                            <span className="small text-muted">
                                                {sub.theory_periods} tiết LT / {sub.practice_periods} tiết TH
                                            </span>
                                        </td>
                                        <td>
                                            <div className="small fw-semibold text-secondary">
                                                {sub.department_name || 'Bộ môn CNTT'}
                                            </div>
                                        </td>
                                        <td>
                                            {sub.prerequisites && sub.prerequisites.length > 0 ? (
                                                <div className="d-flex flex-wrap gap-1 justify-content-center">
                                                    {sub.prerequisites.map((pName, pIdx) => (
                                                        <span key={pIdx} className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 small">
                                                            <i className="bi bi-link-45deg me-1"></i>{pName}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted small">Không</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="d-flex justify-content-center gap-1">
                                                <button
                                                    className="btn btn-outline-primary btn-sm px-2 py-1"
                                                    title="Chỉnh sửa môn học"
                                                    onClick={() => handleOpenEdit(sub)}
                                                >
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    title="Xóa môn học"
                                                    onClick={() => handleDelete(sub.id, sub.subject_code, sub.subject_name)}
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

            {/* Modal Thêm/Sửa Môn Học */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i className={`bi ${isEditing ? 'bi-pencil-square text-warning' : 'bi-plus-circle text-primary'} me-2`}></i>
                                    {isEditing ? 'Chỉnh Sửa Thông Tin Môn Học' : 'Thêm Môn Học Mới'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Mã Môn Học *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: INT1006"
                                                disabled={isEditing}
                                                required
                                                value={formData.subject_code}
                                                onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Tên Môn Học *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: Kiến Trúc Máy Tính"
                                                required
                                                value={formData.subject_name}
                                                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Số Tín Chỉ *</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                min="1"
                                                max="10"
                                                required
                                                value={formData.credits}
                                                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Tiết Lý Thuyết</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                min="0"
                                                value={formData.theory_periods}
                                                onChange={(e) => setFormData({ ...formData, theory_periods: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Tiết Thực Hành</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                min="0"
                                                value={formData.practice_periods}
                                                onChange={(e) => setFormData({ ...formData, practice_periods: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Khoa / Bộ Môn Phụ Trách</label>
                                            <select
                                                className="form-select"
                                                value={formData.department_id}
                                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                            >
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.id}>{d.department_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {!isEditing && (
                                            <div className="col-md-6">
                                                <label className="form-label small fw-bold">Môn Tiên Quyết (Nếu có)</label>
                                                <select
                                                    className="form-select"
                                                    value={formData.prerequisite_id}
                                                    onChange={(e) => setFormData({ ...formData, prerequisite_id: e.target.value })}
                                                >
                                                    <option value="">-- Không có điều kiện tiên quyết --</option>
                                                    {subjects.map(s => (
                                                        <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary btn-sm px-4">
                                        <i className="bi bi-check-circle me-1"></i> {isEditing ? 'Lưu Thay Đổi' : 'Tạo Môn Học'}
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

export default ManageSubjects;
