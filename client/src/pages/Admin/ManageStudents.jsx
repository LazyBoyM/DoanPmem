import RecordActions from '../../components/RecordActions';
import RecordWorkspace from '../../components/RecordWorkspace';
import LoadingState from '../../components/LoadingState';
import AccessibleDialog from '../../components/AccessibleDialog';
import { useFeedback } from '../../context/feedback-context';
import { useCallback, useEffect, useState } from 'react';
import StudentDetails from '../../components/StudentDetails';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';

const ManageStudents = () => {
    const { notify, confirm } = useFeedback();
    const [students, setStudents] = useState([]);
    const [detailStudent, setDetailStudent] = useState(null);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProgram, setFilterProgram] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

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

    const fetchData = useCallback(async () => {
        try {
            const [studentsRes, programsRes] = await Promise.all([
                axiosClient.get('/admin/students'),
                axiosClient.get('/admin/programs')
            ]);
            if (studentsRes.success) setStudents(studentsRes.data);
            if (programsRes.success) setPrograms(programsRes.data);
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi nạp dữ liệu sinh viên: Vui lòng dùng nút làm mới để thử lại.', 'danger');
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
                    notify('Cập nhật thông tin sinh viên thành công!', 'success');
                    setShowModal(false);
                    fetchData();
                }
            } else {
                const res = await axiosClient.post('/admin/students', formData);
                if (res.success) {
                    notify('Thêm sinh viên mới thành công!', 'success');
                    setShowModal(false);
                    fetchData();
                }
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'danger');
        }
    };

    const handleDelete = async (id, code, name) => {
        if (!await confirm(`Bạn có chắc chắn muốn xóa sinh viên ${name} (${code})?`)) return;
        try {
            const res = await axiosClient.delete(`/admin/students/${id}`);
            if (res.success) {
                notify('Xóa sinh viên thành công!', 'success');
                fetchData();
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi xóa sinh viên.', 'danger');
        }
    };

    const handleResetPassword = async (userId, studentCode) => {
        if (!userId) {
            notify('Không tìm thấy thông tin tài khoản của sinh viên.');
            return;
        }
        if (!await confirm(`Đặt lại mật khẩu cho sinh viên ${studentCode} về mặc định (123456)?`)) return;
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
            notify(err.response?.data?.message || 'Lỗi thay đổi trạng thái.', 'danger');
        }
    };

    const handleExportExcel = async () => {
        try {
            await downloadFile('/reports/export-students-excel', 'Danh_sach_sinh_vien.xlsx');
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi tải file Excel: Vui lòng dùng nút làm mới để thử lại.', 'danger');
            notify('Không thể tải file Excel. Vui lòng kiểm tra lại server.');
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
            <RecordWorkspace heading={<>
                    <div>
                        <h1 className="fw-bold mb-1">
                            Hồ sơ sinh viên
                        </h1>
                        <p className="text-muted small mb-0">
                            Tra cứu, thêm mới, sửa đổi hồ sơ sinh viên, quản lý tài khoản và xuất danh sách
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={handleExportExcel}>
                            <i aria-hidden="true" className="bi bi-file-earmark-excel me-1"></i> Xuất Excel
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                            <i aria-hidden="true" className="bi bi-person-plus me-1"></i> Thêm sinh viên
                        </button>
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
                                aria-label="Tìm trong danh sách" placeholder="Tìm kiếm theo mã SV, họ tên hoặc lớp sinh hoạt..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <select aria-label="Lọc phạm vi danh sách"                             className="form-select"
                            value={filterProgram}
                            onChange={(e) => setFilterProgram(e.target.value)}
                        >
                            <option value="">-- Tất cả ngành đào tạo --</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.program_name} ({p.program_code})</option>
                            ))}
                        </select>
                    </div>
                </>} sheetTitle="Danh sách sinh viên" filterTitle="Tra cứu sinh viên" summary={<>
                    <span className="badge bg-light text-dark border px-3 py-2">
                        Hiển thị <b>{filteredStudents.length}</b> / <b>{students.length}</b> sinh viên
                    </span>
                </>}>
<div className="table-container-responsive">
                    <table className="table-modern directory-table text-center align-middle">
                        <thead>
                            <tr>
                                <th scope="col">STT</th>
                                <th scope="col">Mã SV</th>
                                <th scope="col" className="text-start">Họ và tên</th>
                                <th scope="col">Lớp SH</th>
                                <th scope="col">Chương trình đào tạo</th>
                                <th scope="col">Liên Hệ</th>
                                <th scope="col">Trạng thái</th>
                                <th scope="col">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-muted">
                                        <LoadingState compact />
                                        Đang tải dữ liệu sinh viên...
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-4 text-muted">
                                        <i aria-hidden="true" className="bi bi-inbox fs-3 d-block mb-1 text-secondary"></i>
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
                                            <div><i aria-hidden="true" className="bi bi-envelope me-1 text-muted"></i>{st.email || '---'}</div>
                                            <div><i aria-hidden="true" className="bi bi-telephone me-1 text-muted"></i>{st.phone || '---'}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${st.status === 1 ? 'bg-success' : 'bg-danger'}`}>
                                                {st.status === 1 ? 'Hoạt động' : 'Bị khóa'}
                                            </span>
                                        </td>
                                        <td>
                                            <RecordActions label={st.full_name || st.subject_name || st.username || st.class_code}>
                                                <button className="btn btn-outline-info btn-sm px-2 py-1" title="Xem thông tin sinh viên" aria-label={`Xem thông tin ${st.full_name}`} onClick={() => setDetailStudent(st)}><i className="bi bi-eye" aria-hidden="true" /></button>

                                                <button
                                                    className="btn btn-outline-warning btn-sm px-2 py-1"
                                                    title="Đặt lại mật khẩu về 123456" aria-label="Đặt lại mật khẩu về 123456"
                                                    onClick={() => handleResetPassword(st.user_id, st.student_code)}
                                                >
                                                    <i aria-hidden="true" className="bi bi-key"></i> Mật khẩu
                                                </button>
                                                <button
                                                    className={`btn btn-sm px-2 py-1 ${st.status === 1 ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                                                    title={st.status === 1 ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                    onClick={() => handleToggleStatus(st.user_id, st.status)}
                                                >
                                                    <i aria-hidden="true" className={`bi ${st.status === 1 ? 'bi-lock' : 'bi-unlock'}`}></i> {st.status === 1 ? 'Khóa' : 'Mở khóa'}
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm px-2 py-1"
                                                    title="Xóa hồ sơ sinh viên" aria-label="Xóa hồ sơ sinh viên"
                                                    onClick={() => handleDelete(st.id, st.student_code, st.full_name)}
                                                >
                                                    <i aria-hidden="true" className="bi bi-trash"></i> Xóa
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

            {detailStudent && <StudentDetails key={detailStudent.id} student={detailStudent} onClose={() => setDetailStudent(null)} onEdit={st => { setDetailStudent(null); handleOpenEdit(st); }} />}
            {showModal && (
                <AccessibleDialog className="record-editor" onClose={() => setShowModal(false)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i aria-hidden="true" className={`bi ${isEditing ? 'bi-pencil-square text-warning' : 'bi-person-plus text-primary'} me-2`}></i>
                                    {isEditing ? 'Chỉnh Sửa Hồ Sơ Sinh Viên' : 'Thêm sinh viên'}
                                </h5>
                                <button type="button" className="btn-close" aria-label="Đóng cửa sổ" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-1">Mã sinh viên *</label>
                                            <input id="ManageStudents-field-1"
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
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-2">Họ và tên *</label>
                                            <input id="ManageStudents-field-2"
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: Nguyễn Văn An"
                                                required
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-3">Giới tính</label>
                                            <select id="ManageStudents-field-3"
                                                className="form-select"
                                                value={formData.gender}
                                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            >
                                                <option value="Nam">Nam</option>
                                                <option value="Nữ">Nữ</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-4">Ngày sinh</label>
                                            <input id="ManageStudents-field-4"
                                                type="date"
                                                className="form-control"
                                                value={formData.birth_date}
                                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-5">Số điện thoại</label>
                                            <input id="ManageStudents-field-5"
                                                type="text"
                                                className="form-control"
                                                placeholder="09..."
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-6">Lớp sinh hoạt *</label>
                                            <input id="ManageStudents-field-6"
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: 2DCTT745"
                                                required
                                                value={formData.class_name}
                                                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-7">Chương trình / ngành</label>
                                            <select id="ManageStudents-field-7"
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
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-8">Khóa học</label>
                                            <input id="ManageStudents-field-8"
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: K74"
                                                value={formData.academic_year}
                                                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageStudents-field-9">Địa chỉ</label>
                                            <input id="ManageStudents-field-9"
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
                                                    <i aria-hidden="true" className="bi bi-info-circle text-primary me-1"></i>
                                                    Tài khoản đăng nhập hệ thống sẽ tự động được tạo với <b>Username = Mã sinh viên</b> và <b>Mật khẩu mặc định: 123456</b>.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary btn-sm px-4">
                                        <i aria-hidden="true" className="bi bi-check-circle me-1"></i> {isEditing ? 'Lưu thay đổi' : 'Tạo hồ sơ sinh viên'}
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

export default ManageStudents;
