import RecordActions from '../../components/RecordActions';
import RecordWorkspace from '../../components/RecordWorkspace';
import LoadingState from '../../components/LoadingState';
import AccessibleDialog from '../../components/AccessibleDialog';
import { useFeedback } from '../../context/feedback-context';
import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

const ManageLecturers = () => {
    const { notify, confirm } = useFeedback();
    const [lecturers, setLecturers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [formData, setFormData] = useState({
        lecturer_code: '',
        full_name: '',
        degree: 'Thạc sĩ',
        department_id: '1',
        phone: '',
        email: '',
        password: ''
    });



    const fetchData = useCallback(async () => {
        try {
            const [lecRes, deptRes] = await Promise.all([
                axiosClient.get('/admin/lecturers'),
                axiosClient.get('/admin/departments')
            ]);
            if (lecRes.success) setLecturers(lecRes.data);
            if (deptRes.success) setDepartments(deptRes.data);
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi nạp dữ liệu giảng viên: Vui lòng dùng nút làm mới để thử lại.', 'danger');
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => {
        Promise.resolve().then(fetchData);
    }, [fetchData]);

    const handleOpenAdd = () => {
        setIsEditing(false);
        setCurrentId(null);
        setFormData({
            lecturer_code: '',
            full_name: '',
            degree: 'Thạc sĩ',
            department_id: departments.length > 0 ? String(departments[0].id) : '1',
            phone: '',
            email: '',
            password: '123456'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (lec) => {
        setIsEditing(true);
        setCurrentId(lec.id);
        setFormData({
            lecturer_code: lec.lecturer_code,
            full_name: lec.full_name,
            degree: lec.degree || 'Thạc sĩ',
            department_id: String(lec.department_id || 1),
            phone: lec.phone || '',
            email: lec.email || '',
            password: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const res = await axiosClient.put(`/admin/lecturers/${currentId}`, formData);
                if (res.success) {
                    notify('Cập nhật thông tin giảng viên thành công!', 'success');
                    setShowModal(false);
                    fetchData();
                }
            } else {
                const res = await axiosClient.post('/admin/lecturers', formData);
                if (res.success) {
                    notify('Thêm giảng viên mới thành công!', 'success');
                    setShowModal(false);
                    fetchData();
                }
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'danger');
        }
    };

    const handleDelete = async (id, code, name) => {
        if (!await confirm(`Bạn có chắc chắn muốn xóa giảng viên ${name} (${code})?`)) return;
        try {
            const res = await axiosClient.delete(`/admin/lecturers/${id}`);
            if (res.success) {
                notify('Xóa giảng viên thành công!', 'success');
                fetchData();
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi xóa giảng viên.', 'danger');
        }
    };

    const handleResetPassword = async (userId, lecturerCode) => {
        if (!userId) return;
        if (!await confirm(`Đặt lại mật khẩu cho giảng viên ${lecturerCode} về mặc định (123456)?`)) return;
        try {
            const res = await axiosClient.put(`/admin/users/${userId}/reset-password`);
            if (res.success) {
                notify(res.message || 'Đặt lại mật khẩu thành công.');
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi đặt lại mật khẩu.', 'danger');
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
            notify(err.response?.data?.message || 'Lỗi cập nhật trạng thái.', 'danger');
        }
    };

    const filteredLecturers = lecturers.filter(l => {
        const matchSearch = (l.lecturer_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (l.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchDept = filterDept ? String(l.department_id) === filterDept : true;
        return matchSearch && matchDept;
    });

    return (
        <div className="admin-pane">
            <RecordWorkspace heading={<>
                    <div>
                        <h1 className="fw-bold mb-0">
                            Giảng viên
                        </h1>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                        <i aria-hidden="true" className="bi bi-person-plus me-1"></i> Thêm giảng viên
                    </button>
                </>} filters={<>
                    <div className="col-md-7">
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted">
                                <i aria-hidden="true" className="bi bi-search"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                aria-label="Tìm trong danh sách" placeholder="Tìm kiếm theo mã GV, họ và tên giảng viên..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <select aria-label="Lọc phạm vi danh sách"                             className="form-select"
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            <option value="">-- Tất cả Khoa / Bộ môn --</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.department_name}</option>
                            ))}
                        </select>
                    </div>
                </>} sheetTitle="Danh sách giảng viên" filterTitle="Tra cứu giảng viên" summary={<>
                    <span className="badge bg-light text-dark border px-3 py-2">
                        Hiển thị <b>{filteredLecturers.length}</b> / <b>{lecturers.length}</b> giảng viên
                    </span>
                </>}>
<div className="table-container-responsive">
                    <table className="table-modern directory-table text-center align-middle">
                        <thead>
                            <tr>
                                <th scope="col">STT</th>
                                <th scope="col">Mã GV</th>
                                <th scope="col" className="text-start">Họ và tên</th>
                                <th scope="col">Học Vị</th>
                                <th scope="col">Khoa / Bộ Môn</th>
                                <th scope="col">Thông Tin Liên Hệ</th>
                                <th scope="col">Trạng thái</th>
                                <th scope="col">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-muted">
                                        <LoadingState compact />
                                        Đang tải dữ liệu giảng viên...
                                    </td>
                                </tr>
                            ) : filteredLecturers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-muted">
                                        <i aria-hidden="true" className="bi bi-inbox fs-3 d-block mb-1 text-secondary"></i>
                                        Không tìm thấy giảng viên nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredLecturers.map((lec, idx) => (
                                    <tr key={lec.id}>
                                        <td className="fw-semibold text-muted">{idx + 1}</td>
                                        <td>
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                                {lec.lecturer_code}
                                            </span>
                                        </td>
                                        <td className="text-start">
                                            <div className="fw-bold text-dark">{lec.full_name}</div>
                                            <div className="small text-muted">User: {lec.username || lec.lecturer_code.toLowerCase()}</div>
                                        </td>
                                        <td>
                                            <span className="badge bg-info-subtle text-info-emphasis px-2 py-1">
                                                {lec.degree || 'Thạc sĩ'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="fw-semibold text-dark small">{lec.department_name || 'Bộ môn CNTT'}</div>
                                        </td>
                                        <td className="text-start small">
                                            <div><i aria-hidden="true" className="bi bi-envelope me-1 text-muted"></i>{lec.email || '---'}</div>
                                            <div><i aria-hidden="true" className="bi bi-telephone me-1 text-muted"></i>{lec.phone || '---'}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${lec.status === 1 ? 'bg-success' : 'bg-danger'}`}>
                                                {lec.status === 1 ? 'Hoạt động' : 'Bị khóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <RecordActions label={lec.full_name || lec.subject_name || lec.username || lec.class_code}>
                                                <button
                                                    className="btn btn-outline-primary btn-sm px-2 py-1"
                                                    title="Chỉnh sửa thông tin" aria-label="Chỉnh sửa thông tin"
                                                    onClick={() => handleOpenEdit(lec)}
                                                >
                                                    <i aria-hidden="true" className="bi bi-pencil-square"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-warning btn-sm px-2 py-1"
                                                    title="Đặt lại mật khẩu về 123456" aria-label="Đặt lại mật khẩu về 123456"
                                                    onClick={() => handleResetPassword(lec.user_id, lec.lecturer_code)}
                                                >
                                                    <i aria-hidden="true" className="bi bi-key"></i>
                                                </button>
                                                <button
                                                    className={`btn btn-sm px-2 py-1 ${lec.status === 1 ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                                                    title={lec.status === 1 ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                    onClick={() => handleToggleStatus(lec.user_id, lec.status)}
                                                >
                                                    <i aria-hidden="true" className={`bi ${lec.status === 1 ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    title="Xóa giảng viên" aria-label="Xóa giảng viên"
                                                    onClick={() => handleDelete(lec.id, lec.lecturer_code, lec.full_name)}
                                                >
                                                    <i aria-hidden="true" className="bi bi-trash"></i>
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

            {showModal && (
                <AccessibleDialog className="dialog-md" onClose={() => setShowModal(false)}>
                    <div className="modal-dialog modal-md modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i aria-hidden="true" className={`bi ${isEditing ? 'bi-pencil-square text-warning' : 'bi-person-plus text-primary'} me-2`}></i>
                                    {isEditing ? 'Chỉnh Sửa Thông Tin Giảng Viên' : 'Thêm giảng viên'}
                                </h5>
                                <button type="button" className="btn-close" aria-label="Đóng cửa sổ" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageLecturers-field-1">Mã giảng viên *</label>
                                            <input id="ManageLecturers-field-1"
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: GV003"
                                                disabled={isEditing}
                                                required
                                                value={formData.lecturer_code}
                                                onChange={(e) => setFormData({ ...formData, lecturer_code: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageLecturers-field-2">Học Vị *</label>
                                            <select id="ManageLecturers-field-2"
                                                className="form-select"
                                                value={formData.degree}
                                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                            >
                                                <option value="Cử nhân">Cử nhân</option>
                                                <option value="Thạc sĩ">Thạc sĩ</option>
                                                <option value="Tiến sĩ">Tiến sĩ</option>
                                                <option value="Phó Giáo sư">Phó Giáo sư</option>
                                                <option value="Giáo sư">Giáo sư</option>
                                            </select>
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label small fw-bold" htmlFor="ManageLecturers-field-3">Họ và tên Giảng Viên *</label>
                                            <input id="ManageLecturers-field-3"
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: TS. Trần Văn Minh"
                                                required
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label small fw-bold" htmlFor="ManageLecturers-field-4">Khoa / Bộ Môn Trực Thuộc *</label>
                                            <select id="ManageLecturers-field-4"
                                                className="form-select"
                                                value={formData.department_id}
                                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                            >
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.id}>{d.department_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageLecturers-field-5">Số điện thoại</label>
                                            <input id="ManageLecturers-field-5"
                                                type="text"
                                                className="form-control"
                                                placeholder="09..."
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageLecturers-field-6">Email Liên Hệ</label>
                                            <input id="ManageLecturers-field-6"
                                                type="email"
                                                className="form-control"
                                                placeholder="gv@edu.vn"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        {!isEditing && (
                                            <div className="col-md-12">
                                                <div className="p-3 bg-light rounded small text-muted">
                                                    <i aria-hidden="true" className="bi bi-info-circle text-primary me-1"></i>
                                                    Tài khoản hệ thống sẽ được cấp với <b>Username = Mã giảng viên</b> và <b>Mật khẩu mặc định: 123456</b>.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary btn-sm px-4">
                                        <i aria-hidden="true" className="bi bi-check-circle me-1"></i> {isEditing ? 'Lưu thay đổi' : 'Tạo hồ sơ giảng viên'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </AccessibleDialog>
            )}
        </div>
    );
};

export default ManageLecturers;
