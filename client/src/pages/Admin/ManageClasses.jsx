import RecordActions from '../../components/RecordActions';
import RecordWorkspace from '../../components/RecordWorkspace';
import AccessibleDialog from '../../components/AccessibleDialog';
import { useFeedback } from '../../context/feedback-context';
import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import ClassSchedule from '../../components/ClassSchedule';

const ManageClasses = () => {
    const { notify, confirm } = useFeedback();
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStudentsModal, setShowStudentsModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        class_code: '',
        subject_id: '',
        semester_id: '',
        lecturer_id: '',
        max_students: 50,
        day_of_week: '2',
        start_period: '1',
        total_periods: '3',
        room: 'P.301',
        week_from: 1,
        week_to: 16
    });

    useEffect(() => {
        fetchClasses();
        fetchOptions();
    }, []);

    async function fetchClasses() {
        try {
            const res = await axiosClient.get('/admin/classes');
            if (res.success) {
                setClasses(res.data);
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách lớp học phần:", err);
        }
    };

    async function fetchOptions() {
        try {
            const [subjRes, lectRes, semRes] = await Promise.all([
                axiosClient.get('/admin/subjects'),
                axiosClient.get('/admin/lecturers'),
                axiosClient.get('/admin/semesters')
            ]);
            if (subjRes.success) setSubjects(subjRes.data);
            if (lectRes.success) setLecturers(lectRes.data);
            if (semRes.success) {
                setSemesters(semRes.data);
                setFormData(prev => ({ ...prev, semester_id: String(semRes.data.find(s => s.is_active)?.id || semRes.data[0]?.id || '') }));
            }
            if (subjRes.data && subjRes.data.length > 0) {
                setFormData(prev => ({ ...prev, subject_id: subjRes.data[0].id }));
            }
        } catch (err) {
            console.error("Lỗi lấy danh mục mở lớp:", err);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
            const res = await axiosClient.put(`/admin/classes/${id}/status`, { status: newStatus });
            if (res.success) {
                fetchClasses();
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi cập nhật trạng thái lớp', 'danger');
        }
    };

    const cancelClass = async (id) => {
        if (!await confirm('Hủy lớp sẽ hủy mọi đăng ký chưa có điểm và gỡ lịch học. Tiếp tục?')) return;
        try {
            await axiosClient.put(`/admin/classes/${id}/status`, { status: 'CANCELLED' });
            fetchClasses();
        } catch (err) { notify(err.response?.data?.message || 'Không thể hủy lớp.', 'danger'); }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!formData.class_code || !formData.subject_id) {
            notify('Vui lòng nhập mã lớp và chọn môn học!');
            return;
        }

        try {
            const payload = {
                class_code: formData.class_code.trim(),
                subject_id: Number(formData.subject_id),
                semester_id: Number(formData.semester_id),
                lecturer_id: formData.lecturer_id ? Number(formData.lecturer_id) : null,
                max_students: Number(formData.max_students) || 50,
                schedules: [
                    {
                        day_of_week: Number(formData.day_of_week),
                        start_period: Number(formData.start_period),
                        total_periods: Number(formData.total_periods),
                        room: formData.room || 'P.301',
                        week_from: Number(formData.week_from),
                        week_to: Number(formData.week_to)
                    }
                ]
            };

            const res = await axiosClient.post('/admin/create-class', payload);
            if (res.success) {
                notify('Mở lớp học phần mới thành công!', 'success');
                setShowCreateModal(false);
                setFormData({
                    class_code: '',
                    subject_id: subjects[0]?.id || '',
                    semester_id: String(semesters.find(s => s.is_active)?.id || semesters[0]?.id || ''),
                    lecturer_id: '',
                    max_students: 50,
                    day_of_week: '2',
                    start_period: '1',
                    total_periods: '3',
                    room: 'P.301',
        week_from: 1,
        week_to: 16
                });
                fetchClasses();
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi mở lớp học phần', 'danger');
        }
    };

    const handleViewStudents = async (cls) => {
        setSelectedClass(cls);
        setShowStudentsModal(true);
        setLoadingStudents(true);
        try {
            const res = await axiosClient.get(`/admin/classes/${cls.id}/students`);
            if (res.success) {
                setEnrolledStudents(res.data);
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi lấy danh sách sinh viên của lớp: Vui lòng dùng nút làm mới để thử lại.', 'danger');
            setEnrolledStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    };

    const filteredClasses = classes.filter(c =>
        c.class_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.lecturer_name && c.lecturer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="admin-pane">
            <RecordWorkspace heading={<>
                    <div>
                        <h1 className="fw-bold mb-1">
                            Lớp học phần
                        </h1>
                        <p className="text-muted small mb-0">
                            Mở lớp mới, phân công giảng viên, cấu hình lịch học và đóng/mở đăng ký tín chỉ
                        </p>
                    </div>
                    <button className="btn btn-primary btn-sm shadow-sm" onClick={() => setShowCreateModal(true)}>
                        <i aria-hidden="true" className="bi bi-plus-circle me-1"></i> Mở lớp học phần
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
                                aria-label="Tìm trong danh sách" placeholder="Tìm kiếm theo mã lớp, tên môn học hoặc giảng viên..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5 d-flex justify-content-md-end align-items-center">
                        <span className="badge bg-light text-dark border px-3 py-2">
                            Tổng số: <strong className="text-primary">{filteredClasses.length}</strong> lớp học phần
                        </span>
                    </div>
                </>} sheetTitle="Danh sách lớp học phần" filterTitle="Tra cứu lớp" >
<div className="table-container-responsive">
                    <table className="table-modern class-directory-table text-center">
                        <thead>
                            <tr>
                                <th scope="col">Mã Lớp HP</th>
                                <th scope="col" className="text-start">Môn Học</th>
                                <th scope="col" className="text-start">Giảng Viên Phụ Trách</th>
                                <th scope="col">Lịch Học</th>
                                <th scope="col">Sĩ Số / Slot</th>
                                <th scope="col">Trạng thái</th>
                                <th scope="col">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClasses.length > 0 ? (
                                filteredClasses.map(c => (
                                    <tr key={c.id}>
                                        <td className="fw-bold text-primary">{c.class_code}</td>
                                        <td className="text-start fw-semibold">{c.subject_name}</td>
                                        <td className="text-start">{c.lecturer_name || 'Chưa xếp'}</td>
                                        <td className="small text-muted">
                                            <ClassSchedule schedules={c.schedules} />
                                            {c.room && <span className="d-block text-secondary">{c.room}</span>}
                                        </td>
                                        <td>
                                            <span className={c.current_students >= c.max_students ? 'badge bg-danger-subtle text-danger' : 'badge bg-primary-subtle text-primary'}>
                                                {c.current_students} / {c.max_students}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${c.status === 'OPEN' ? 'bg-success' : 'bg-danger'}`}>
                                                {c.status === 'OPEN' ? 'Đang Mở' : c.status === 'CANCELLED' ? 'Đã Hủy' : 'Đã Đóng'}
                                            </span>
                                        </td>
                                        <td>
                                            <RecordActions label={c.full_name || c.subject_name || c.username || c.class_code}>
                                                <button
                                                    className={`btn btn-sm ${c.status === 'OPEN' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                    disabled={c.status === 'CANCELLED'} onClick={() => toggleStatus(c.id, c.status)}
                                                    title={c.status === 'OPEN' ? 'Đóng đăng ký lớp' : 'Mở lại đăng ký lớp'}
                                                >
                                                    <i aria-hidden="true" className={`bi ${c.status === 'OPEN' ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-info"
                                                    onClick={() => handleViewStudents(c)}
                                                    title="Xem danh sách sinh viên đã đăng ký" aria-label="Xem danh sách sinh viên đã đăng ký"
                                                >
                                                    <i aria-hidden="true" className="bi bi-people"></i>
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" title="Hủy lớp" aria-label="Hủy lớp" disabled={c.status === 'CANCELLED'} onClick={() => cancelClass(c.id)}><i aria-hidden="true" className="bi bi-x-circle"></i></button>
                                            </RecordActions>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">
                                        Không tìm thấy lớp học phần phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

</RecordWorkspace>

            {/* Modal Mở lớp học phần */}
            {showCreateModal && (
                <AccessibleDialog className="record-editor" onClose={() => setShowCreateModal(false)}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i aria-hidden="true" className="bi bi-plus-circle text-primary me-2"></i>Mở lớp học phần
                                </h5>
                                <button type="button" className="btn-close" aria-label="Đóng cửa sổ" onClick={() => setShowCreateModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateClass}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-1">Mã Lớp Học Phần *</label>
                                            <input id="ManageClasses-field-1"
                                                type="text"
                                                className="form-control font-monospace text-uppercase"
                                                placeholder="VD: CNTT101_01"
                                                required
                                                value={formData.class_code}
                                                onChange={(e) => setFormData({ ...formData, class_code: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-2">Môn Học *</label>
                                            <select id="ManageClasses-field-2"
                                                className="form-select"
                                                required
                                                value={formData.subject_id}
                                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                            >
                                                <option value="">-- Chọn Môn Học --</option>
                                                {subjects.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.subject_code} - {s.subject_name} ({s.credits} TC)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-3">Học kỳ *</label>
                                            <select id="ManageClasses-field-3" required className="form-select" value={formData.semester_id} onChange={e => setFormData({ ...formData, semester_id: e.target.value })}>
                                                <option value="">Chọn học kỳ</option>
                                                {semesters.map(s => <option key={s.id} value={s.id}>{s.semester_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-4">Giảng Viên Phụ Trách</label>
                                            <select id="ManageClasses-field-4"
                                                className="form-select"
                                                value={formData.lecturer_id}
                                                onChange={(e) => setFormData({ ...formData, lecturer_id: e.target.value })}
                                            >
                                                <option value="">-- Chưa phân công giảng viên --</option>
                                                {lecturers.map(l => (
                                                    <option key={l.id} value={l.id}>
                                                        {l.full_name} ({l.degree || 'ThS'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-5">Sĩ Số Tối Đa (Slots)</label>
                                            <input id="ManageClasses-field-5"
                                                type="number"
                                                className="form-control"
                                                min="10"
                                                max="200"
                                                value={formData.max_students}
                                                onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-12"><hr className="my-2"/></div>
                                        <div className="col-12">
                                            <h6 className="fw-bold small text-primary mb-2">
                                                <i aria-hidden="true" className="bi bi-clock me-1"></i> Thiết Lập Thời Khóa Biểu Lớp Học
                                            </h6>
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-6">Thứ trong tuần</label>
                                            <select id="ManageClasses-field-6"
                                                className="form-select"
                                                value={formData.day_of_week}
                                                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                                            >
                                                <option value="2">Thứ Hai</option>
                                                <option value="3">Thứ Ba</option>
                                                <option value="4">Thứ Tư</option>
                                                <option value="5">Thứ Năm</option>
                                                <option value="6">Thứ Sáu</option>
                                                <option value="7">Thứ Bảy</option>
                                                <option value="8">Chủ Nhật</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-7">Tiết Bắt Đầu</label>
                                            <select id="ManageClasses-field-7"
                                                className="form-select"
                                                value={formData.start_period}
                                                onChange={(e) => setFormData({ ...formData, start_period: e.target.value })}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(p => (
                                                    <option key={p} value={p}>Tiết {p}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-8">Số Tiết Học</label>
                                            <select id="ManageClasses-field-8"
                                                className="form-select"
                                                value={formData.total_periods}
                                                onChange={(e) => setFormData({ ...formData, total_periods: e.target.value })}
                                            >
                                                <option value="1">1 Tiết</option>
                                                <option value="2">2 Tiết</option>
                                                <option value="3">3 Tiết</option>
                                                <option value="4">4 Tiết</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label" htmlFor="ManageClasses-field-9">Từ tuần</label>
                                            <input id="ManageClasses-field-9" type="number" min="1" max="53" required className="form-control" value={formData.week_from} onChange={e => setFormData({ ...formData, week_from: e.target.value })} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label" htmlFor="ManageClasses-field-10">Đến tuần</label>
                                            <input id="ManageClasses-field-10" type="number" min={formData.week_from} max="53" required className="form-control" value={formData.week_to} onChange={e => setFormData({ ...formData, week_to: e.target.value })} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold" htmlFor="ManageClasses-field-11">Phòng Học</label>
                                            <input id="ManageClasses-field-11"
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: P.302-A1"
                                                value={formData.room}
                                                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm px-3">
                                        <i aria-hidden="true" className="bi bi-check-circle me-1"></i> Xác Nhận Mở Lớp
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </AccessibleDialog>
            )}

            {/* Modal Danh Sách Sinh Viên Của Lớp */}
            {showStudentsModal && (
                <AccessibleDialog className="record-editor" onClose={() => setShowStudentsModal(false)}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <div>
                                    <h5 className="modal-title fw-bold mb-0">
                                        <i aria-hidden="true" className="bi bi-people text-primary me-2"></i>Sinh Viên Lớp: {selectedClass?.class_code}
                                    </h5>
                                    <small className="text-muted">{selectedClass?.subject_name} - Sĩ số hiện tại: {selectedClass?.current_students}/{selectedClass?.max_students}</small>
                                </div>
                                <button type="button" className="btn-close" aria-label="Đóng cửa sổ" onClick={() => setShowStudentsModal(false)}></button>
                            </div>
                            <div className="modal-body p-3">
                                {loadingStudents ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                        <span className="ms-2 small text-muted">Đang tải danh sách sinh viên...</span>
                                    </div>
                                ) : enrolledStudents.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th scope="col">STT</th>
                                                    <th scope="col">Mã sinh viên</th>
                                                    <th scope="col">Họ và tên</th>
                                                    <th scope="col">Lớp sinh hoạt</th>
                                                    <th scope="col">Thời Gian ĐK</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {enrolledStudents.map((s, idx) => (
                                                    <tr key={s.id || idx}>
                                                        <td>{idx + 1}</td>
                                                        <td className="fw-bold text-primary font-monospace">{s.student_code}</td>
                                                        <td className="fw-semibold">{s.full_name}</td>
                                                        <td><span className="badge bg-light text-dark border">{s.class_name || 'K74'}</span></td>
                                                        <td className="small text-muted">{s.enrollment_date ? new Date(s.enrollment_date).toLocaleDateString('vi-VN') : 'Mới đăng ký'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-muted">
                                        <i aria-hidden="true" className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                                        Chưa có sinh viên nào đăng ký vào lớp học phần này.
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowStudentsModal(false)}>
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </AccessibleDialog>
            )}
        </div>
    );
};

export default ManageClasses;
