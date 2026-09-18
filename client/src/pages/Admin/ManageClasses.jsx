import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import ClassSchedule from '../../components/ClassSchedule';

const ManageClasses = () => {
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
            alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái lớp');
        }
    };

    const cancelClass = async (id) => {
        if (!window.confirm('Hủy lớp sẽ hủy mọi đăng ký chưa có điểm và gỡ lịch học. Tiếp tục?')) return;
        try {
            await axiosClient.put(`/admin/classes/${id}/status`, { status: 'CANCELLED' });
            fetchClasses();
        } catch (err) { alert(err.response?.data?.message || 'Không thể hủy lớp.'); }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!formData.class_code || !formData.subject_id) {
            alert('Vui lòng nhập mã lớp và chọn môn học!');
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
                alert('Mở lớp học phần mới thành công!');
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
            alert(err.response?.data?.message || 'Lỗi mở lớp học phần');
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
            console.error('Lỗi lấy danh sách sinh viên của lớp:', err);
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
            <div className="card shadow-sm border-0 p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">
                            <i className="bi bi-collection-play text-primary me-2"></i>Quản Trị Lớp Học Phần
                        </h4>
                        <p className="text-muted small mb-0">
                            Mở lớp mới, phân công giảng viên, cấu hình lịch học và đóng/mở đăng ký tín chỉ
                        </p>
                    </div>
                    <button className="btn btn-primary btn-sm shadow-sm" onClick={() => setShowCreateModal(true)}>
                        <i className="bi bi-plus-circle me-1"></i> Mở Lớp Học Phần Mới
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
                                placeholder="Tìm kiếm theo mã lớp, tên môn học hoặc giảng viên..."
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
                </div>

                <div className="table-container-responsive">
                    <table className="table-modern text-center">
                        <thead>
                            <tr>
                                <th>Mã Lớp HP</th>
                                <th className="text-start">Môn Học</th>
                                <th className="text-start">Giảng Viên Phụ Trách</th>
                                <th>Lịch Học</th>
                                <th>Sĩ Số / Slot</th>
                                <th>Trạng Thái</th>
                                <th>Thao Tác</th>
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
                                            <div className="d-flex justify-content-center gap-1">
                                                <button
                                                    className={`btn btn-sm ${c.status === 'OPEN' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                    disabled={c.status === 'CANCELLED'} onClick={() => toggleStatus(c.id, c.status)}
                                                    title={c.status === 'OPEN' ? 'Đóng đăng ký lớp' : 'Mở lại đăng ký lớp'}
                                                >
                                                    <i className={`bi ${c.status === 'OPEN' ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-info"
                                                    onClick={() => handleViewStudents(c)}
                                                    title="Xem danh sách sinh viên đã đăng ký"
                                                >
                                                    <i className="bi bi-people"></i>
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" title="Hủy lớp" disabled={c.status === 'CANCELLED'} onClick={() => cancelClass(c.id)}><i className="bi bi-x-circle"></i></button>
                                            </div>
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
            </div>

            {/* Modal Mở Lớp Học Phần Mới */}
            {showCreateModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-plus-circle text-primary me-2"></i>Mở Lớp Học Phần Mới
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateClass}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Mã Lớp Học Phần *</label>
                                            <input
                                                type="text"
                                                className="form-control font-monospace text-uppercase"
                                                placeholder="VD: CNTT101_01"
                                                required
                                                value={formData.class_code}
                                                onChange={(e) => setFormData({ ...formData, class_code: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Môn Học *</label>
                                            <select
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
                                            <label className="form-label small fw-bold">Học kỳ *</label>
                                            <select required className="form-select" value={formData.semester_id} onChange={e => setFormData({ ...formData, semester_id: e.target.value })}>
                                                <option value="">Chọn học kỳ</option>
                                                {semesters.map(s => <option key={s.id} value={s.id}>{s.semester_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Giảng Viên Phụ Trách</label>
                                            <select
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
                                            <label className="form-label small fw-bold">Sĩ Số Tối Đa (Slots)</label>
                                            <input
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
                                                <i className="bi bi-clock me-1"></i> Thiết Lập Thời Khóa Biểu Lớp Học
                                            </h6>
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold">Thứ trong tuần</label>
                                            <select
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
                                            <label className="form-label small fw-bold">Tiết Bắt Đầu</label>
                                            <select
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
                                            <label className="form-label small fw-bold">Số Tiết Học</label>
                                            <select
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
                                            <label className="form-label">Từ tuần</label>
                                            <input type="number" min="1" max="53" required className="form-control" value={formData.week_from} onChange={e => setFormData({ ...formData, week_from: e.target.value })} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Đến tuần</label>
                                            <input type="number" min={formData.week_from} max="53" required className="form-control" value={formData.week_to} onChange={e => setFormData({ ...formData, week_to: e.target.value })} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold">Phòng Học</label>
                                            <input
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
                                        <i className="bi bi-check-circle me-1"></i> Xác Nhận Mở Lớp
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Danh Sách Sinh Viên Của Lớp */}
            {showStudentsModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <div>
                                    <h5 className="modal-title fw-bold mb-0">
                                        <i className="bi bi-people text-primary me-2"></i>Sinh Viên Lớp: {selectedClass?.class_code}
                                    </h5>
                                    <small className="text-muted">{selectedClass?.subject_name} - Sĩ số hiện tại: {selectedClass?.current_students}/{selectedClass?.max_students}</small>
                                </div>
                                <button type="button" className="btn-close" onClick={() => setShowStudentsModal(false)}></button>
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
                                                    <th>STT</th>
                                                    <th>Mã Sinh Viên</th>
                                                    <th>Họ và Tên</th>
                                                    <th>Lớp Sinh Hoạt</th>
                                                    <th>Thời Gian ĐK</th>
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
                                        <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
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
                </div>
            )}
        </div>
    );
};

export default ManageClasses;
