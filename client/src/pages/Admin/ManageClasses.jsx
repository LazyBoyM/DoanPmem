import TrainingEditor from '../../components/TrainingEditor';
import RecordActions from '../../components/RecordActions';
import RecordWorkspace from '../../components/RecordWorkspace';
import AccessibleDialog from '../../components/AccessibleDialog';
import { useFeedback } from '../../context/feedback-context';
import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import ClassSchedule from '../../components/ClassSchedule';
import ClassScheduleEditor from '../../components/ClassScheduleEditor';

const ManageClasses = () => {
    const { notify, confirm } = useFeedback();
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [scheduleClass, setScheduleClass] = useState(null);
    const [editingClass, setEditingClass] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showStudentsModal, setShowStudentsModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchTargetClass, setBatchTargetClass] = useState(null);
    const [adminClasses, setAdminClasses] = useState([]);
    const [loadingAdminClasses, setLoadingAdminClasses] = useState(false);
    const [batchMode, setBatchMode] = useState('class');
    const [selectedAdminClass, setSelectedAdminClass] = useState('');
    const [manualCodesInput, setManualCodesInput] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [batchSubmitting, setBatchSubmitting] = useState(false);
    const [batchResult, setBatchResult] = useState(null);

    const [formData, setFormData] = useState({
        class_code: '',
        subject_id: '',
        semester_id: '',
        lecturer_id: '',
        max_students: 50,
        day_of_week: '2',
        start_period: '1',
        total_periods: '3',
        room_id: '',
        week_from: 1,
        week_to: 16
    });


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

    const fetchOptions = useCallback(async () => {
        try {
            const [subjRes, lectRes, semRes, roomRes] = await Promise.all([
                axiosClient.get('/admin/subjects'),
                axiosClient.get('/admin/lecturers'),
                axiosClient.get('/admin/semesters'),
                axiosClient.get('/admin/rooms')
            ]);
            if (subjRes.success) setSubjects(subjRes.data);
            if (roomRes.success) setRooms(roomRes.data);
            if (lectRes.success) setLecturers(lectRes.data);
            if (semRes.success) {
                setSemesters(semRes.data);
                setFormData(prev => ({ ...prev, semester_id: String(semRes.data.find(s => s.is_active)?.id || semRes.data[0]?.id || '') }));
            }
            if (subjRes.data && subjRes.data.length > 0) {
                setFormData(prev => ({ ...prev, subject_id: subjRes.data[0].id }));
            }
        } catch (err) {
            notify(err.response?.data?.message || "Không tải được danh mục mở lớp. Hãy tải lại trang.", "danger");
        }
    }, [notify]);

    useEffect(() => { Promise.resolve().then(() => { fetchClasses(); fetchOptions(); }); }, [fetchOptions]);

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
        if (creating) return;
        if (!formData.class_code || !formData.subject_id || !formData.room_id) {
            notify('Vui lòng nhập mã lớp, chọn môn học và phòng học!');
            return;
        }

        setCreating(true);
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
                        room_id: Number(formData.room_id),
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
                    room_id: '',
        week_from: 1,
        week_to: 16
                });
                fetchClasses();
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi mở lớp học phần', 'danger');
        } finally { setCreating(false); }
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

    const handleOpenBatchEnroll = async (c) => {
        setBatchTargetClass(c);
        setShowBatchModal(true);
        setBatchResult(null);
        setSelectedStudentIds([]);
        setSelectedAdminClass('');
        setManualCodesInput('');
        setBatchMode('class');
        setLoadingAdminClasses(true);
        try {
            const res = await axiosClient.get('/admin/administrative-classes');
            if (res.success && Array.isArray(res.data)) {
                setAdminClasses(res.data);
                if (res.data.length > 0) {
                    const firstClass = res.data[0];
                    setSelectedAdminClass(firstClass.class_name);
                    setSelectedStudentIds(firstClass.students.map(s => s.id));
                }
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Không thể tải danh sách lớp sinh hoạt.', 'danger');
        } finally {
            setLoadingAdminClasses(false);
        }
    };

    const handleSelectAdminClass = (className) => {
        setSelectedAdminClass(className);
        const found = adminClasses.find(c => c.class_name === className);
        if (found) {
            setSelectedStudentIds(found.students.map(s => s.id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleToggleStudent = (studentId) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleToggleAllStudents = (currentClassStudents) => {
        if (!currentClassStudents || currentClassStudents.length === 0) return;
        const allIds = currentClassStudents.map(s => s.id);
        const allSelected = allIds.every(id => selectedStudentIds.includes(id));
        if (allSelected) {
            setSelectedStudentIds(prev => prev.filter(id => !allIds.includes(id)));
        } else {
            setSelectedStudentIds(prev => Array.from(new Set([...prev, ...allIds])));
        }
    };

    const handleBatchSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!batchTargetClass) return;

        let payload = {};
        if (batchMode === 'class') {
            if (selectedStudentIds.length === 0) {
                notify('Vui lòng chọn ít nhất 1 sinh viên để đăng ký.', 'warning');
                return;
            }
            payload = { student_ids: selectedStudentIds };
        } else {
            const codes = manualCodesInput
                .split(/[\s,;\n\r]+/)
                .map(s => s.trim().toUpperCase())
                .filter(Boolean);
            if (codes.length === 0) {
                notify('Vui lòng nhập danh sách mã sinh viên.', 'warning');
                return;
            }
            payload = { student_codes: codes };
        }

        setBatchSubmitting(true);
        try {
            const res = await axiosClient.post(`/admin/classes/${batchTargetClass.id}/batch-enroll`, payload);
            if (res.success) {
                setBatchResult(res.data);
                notify(res.message || 'Đăng ký thành công.', 'success');
                fetchClasses();
                if (batchTargetClass) {
                    setBatchTargetClass(prev => ({
                        ...prev,
                        current_students: res.data.current_students
                    }));
                }
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi khi đăng ký hàng loạt.', 'danger');
        } finally {
            setBatchSubmitting(false);
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
                                            <RecordActions label={c.full_name || c.subject_name || c.username || c.class_code}><button disabled={c.status === 'CANCELLED' || Boolean(c.grades_locked)} onClick={() => setEditingClass(c)}>Sửa thông tin lớp</button>
                                                <button className="btn btn-sm btn-outline-primary" disabled={c.status === 'CANCELLED' || Boolean(c.grades_locked)} onClick={() => { fetchOptions(); setScheduleClass(c); }}>Đổi lịch & phòng</button>
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
                                                <button
                                                    className="btn btn-sm btn-outline-success"
                                                    onClick={() => handleOpenBatchEnroll(c)}
                                                    title="Đăng ký theo lớp sinh hoạt"
                                                    aria-label="Đăng ký theo lớp sinh hoạt"
                                                    disabled={c.status === 'CANCELLED' || Boolean(c.grades_locked) || c.current_students >= c.max_students}
                                                >
                                                    <i aria-hidden="true" className="bi bi-person-plus-fill"></i>
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

            {showCreateModal && (
                <AccessibleDialog className="record-editor" onClose={() => { if (!creating) setShowCreateModal(false); }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i aria-hidden="true" className="bi bi-plus-circle text-primary me-2"></i>Mở lớp học phần
                                </h5>
                                <button type="button" className="btn-close" aria-label="Đóng cửa sổ" disabled={creating} onClick={() => setShowCreateModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateClass}>
                                <div className="modal-body p-4"><fieldset disabled={creating}>
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
                                                onChange={(e) => setFormData({ ...formData, max_students: e.target.value, room_id: '' })}
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
                                            <select id="ManageClasses-field-11" className="form-select" required value={formData.room_id} onChange={e => setFormData({ ...formData, room_id: e.target.value })}>
                                                <option value="">Chọn phòng đủ sức chứa</option>
                                                {rooms.filter(r => r.status === 'ACTIVE' && r.building_status === 'ACTIVE' && r.capacity >= Number(formData.max_students)).map(r => <option key={r.id} value={r.id}>{r.label} · {r.capacity} chỗ</option>)}
                                            </select>
                                            <small className="text-secondary">Danh mục tại Tòa nhà & phòng học.</small>
                                        </div>
                                    </div>
                                </fieldset></div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" disabled={creating} onClick={() => setShowCreateModal(false)}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm px-3" disabled={creating}>
                                        {creating ? 'Đang mở lớp…' : <><i aria-hidden="true" className="bi bi-check-circle me-1"></i> Xác nhận mở lớp</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </AccessibleDialog>
            )}

            {editingClass && <TrainingEditor resource="classes" record={editingClass} lecturers={lecturers} onClose={() => setEditingClass(null)} onSaved={fetchClasses} />}
            {scheduleClass && <ClassScheduleEditor courseClass={scheduleClass} rooms={rooms} onClose={() => setScheduleClass(null)} onSaved={fetchClasses} />}
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

            {showBatchModal && (
                <AccessibleDialog className="record-editor" onClose={() => { if (!batchSubmitting) setShowBatchModal(false); }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <div>
                                    <h5 className="modal-title fw-bold mb-0">
                                        <i aria-hidden="true" className="bi bi-person-plus-fill text-primary me-2"></i>Đăng Ký Theo Lớp / DSSV
                                    </h5>
                                    <small className="text-muted">
                                        Lớp HP: <strong className="text-primary">{batchTargetClass?.class_code}</strong> ({batchTargetClass?.subject_name}) · Sĩ số: <strong className={batchTargetClass?.current_students >= batchTargetClass?.max_students ? 'text-danger' : 'text-success'}>{batchTargetClass?.current_students}/{batchTargetClass?.max_students}</strong> (Còn trống: {Math.max(0, (batchTargetClass?.max_students || 0) - (batchTargetClass?.current_students || 0))} chỗ)
                                    </small>
                                </div>
                                <button type="button" className="btn-close" aria-label="Đóng cửa sổ" disabled={batchSubmitting} onClick={() => setShowBatchModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                {batchResult ? (
                                    <div className="d-flex flex-column gap-3">
                                        <div className={`alert ${batchResult.enrolledCount > 0 ? 'alert-success' : 'alert-warning'} d-flex align-items-center mb-0`}>
                                            <i aria-hidden="true" className={`bi ${batchResult.enrolledCount > 0 ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-4 me-3`}></i>
                                            <div>
                                                <div className="fw-bold">Kết quả xử lý đăng ký</div>
                                                <div className="small">
                                                    Đã thêm thành công: <strong className="text-success">{batchResult.enrolledCount}</strong> sinh viên · Bỏ qua: <strong className="text-danger">{batchResult.skippedCount}</strong> sinh viên.
                                                </div>
                                            </div>
                                        </div>

                                        {batchResult.skippedList && batchResult.skippedList.length > 0 && (
                                            <div>
                                                <h6 className="fw-bold small text-danger mb-2">
                                                    <i aria-hidden="true" className="bi bi-x-circle me-1"></i> Danh sách sinh viên không thể đăng ký ({batchResult.skippedList.length}):
                                                </h6>
                                                <div className="table-responsive border rounded" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                                    <table className="table table-sm table-hover align-middle mb-0">
                                                        <thead className="table-light sticky-top">
                                                            <tr>
                                                                <th scope="col">MSSV</th>
                                                                <th scope="col">Họ và tên</th>
                                                                <th scope="col">Lý do</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {batchResult.skippedList.map((item, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="font-monospace fw-bold text-primary">{item.student_code}</td>
                                                                    <td>{item.full_name}</td>
                                                                    <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">{item.reason}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {batchResult.successList && batchResult.successList.length > 0 && (
                                            <div>
                                                <h6 className="fw-bold small text-success mb-2">
                                                    <i aria-hidden="true" className="bi bi-check-circle me-1"></i> Sinh viên đã đăng ký thành công ({batchResult.successList.length}):
                                                </h6>
                                                <div className="table-responsive border rounded" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                                    <table className="table table-sm table-hover align-middle mb-0">
                                                        <thead className="table-light sticky-top">
                                                            <tr>
                                                                <th scope="col">STT</th>
                                                                <th scope="col">MSSV</th>
                                                                <th scope="col">Họ và tên</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {batchResult.successList.map((item, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{idx + 1}</td>
                                                                    <td className="font-monospace fw-bold text-success">{item.student_code}</td>
                                                                    <td>{item.full_name}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        <div className="d-flex justify-content-end gap-2 pt-2">
                                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setBatchResult(null)}>
                                                <i aria-hidden="true" className="bi bi-arrow-repeat me-1"></i>Đăng ký tiếp
                                            </button>
                                            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowBatchModal(false)}>
                                                Hoàn tất
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <ul className="nav nav-pills mb-3" role="tablist">
                                            <li className="nav-item" role="presentation">
                                                <button
                                                    type="button"
                                                    className={`nav-link py-1 px-3 btn-sm ${batchMode === 'class' ? 'active' : ''}`}
                                                    onClick={() => setBatchMode('class')}
                                                >
                                                    <i aria-hidden="true" className="bi bi-collection me-1"></i> Theo Lớp Sinh Hoạt
                                                </button>
                                            </li>
                                            <li className="nav-item" role="presentation">
                                                <button
                                                    type="button"
                                                    className={`nav-link py-1 px-3 btn-sm ${batchMode === 'manual' ? 'active' : ''}`}
                                                    onClick={() => setBatchMode('manual')}
                                                >
                                                    <i aria-hidden="true" className="bi bi-card-text me-1"></i> Nhập Danh Sách MSSV
                                                </button>
                                            </li>
                                        </ul>

                                        {batchMode === 'class' ? (
                                            <div>
                                                {loadingAdminClasses ? (
                                                    <div className="text-center py-4">
                                                        <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                                        <span className="ms-2 small text-muted">Đang tải danh sách lớp sinh hoạt...</span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="mb-3">
                                                            <label htmlFor="batch-select-class" className="form-label small fw-bold">Chọn Lớp Sinh Hoạt</label>
                                                            <select
                                                                id="batch-select-class"
                                                                className="form-select"
                                                                value={selectedAdminClass}
                                                                onChange={(e) => handleSelectAdminClass(e.target.value)}
                                                            >
                                                                <option value="">-- Chọn một lớp sinh hoạt --</option>
                                                                {adminClasses.map(ac => (
                                                                    <option key={ac.class_name} value={ac.class_name}>
                                                                        {ac.class_name} ({ac.student_count} sinh viên)
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {selectedAdminClass && (() => {
                                                            const currentClass = adminClasses.find(c => c.class_name === selectedAdminClass);
                                                            const currentStudents = currentClass ? currentClass.students : [];
                                                            const allSelected = currentStudents.length > 0 && currentStudents.every(s => selectedStudentIds.includes(s.id));
                                                            const remainingSlots = Math.max(0, (batchTargetClass?.max_students || 0) - (batchTargetClass?.current_students || 0));

                                                            return (
                                                                <div>
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <span className="small text-muted">
                                                                            Đang chọn: <strong className="text-primary">{selectedStudentIds.length}</strong> / {currentStudents.length} SV
                                                                            {selectedStudentIds.length > remainingSlots && (
                                                                                <span className="text-danger ms-2 fw-semibold">
                                                                                    (Vượt quá số chỗ trống: {remainingSlots})
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-link p-0 text-decoration-none"
                                                                            onClick={() => handleToggleAllStudents(currentStudents)}
                                                                        >
                                                                            {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="table-responsive border rounded" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                                                                        <table className="table table-sm table-hover align-middle mb-0">
                                                                            <thead className="table-light sticky-top">
                                                                                <tr>
                                                                                    <th scope="col" style={{ width: '40px' }}>
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="form-check-input"
                                                                                            checked={allSelected}
                                                                                            onChange={() => handleToggleAllStudents(currentStudents)}
                                                                                            aria-label="Chọn tất cả sinh viên lớp này"
                                                                                        />
                                                                                    </th>
                                                                                    <th scope="col">MSSV</th>
                                                                                    <th scope="col">Họ và tên</th>
                                                                                    <th scope="col">Khóa / Năm</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {currentStudents.map(s => {
                                                                                    const isChecked = selectedStudentIds.includes(s.id);
                                                                                    return (
                                                                                        <tr key={s.id} onClick={() => handleToggleStudent(s.id)} style={{ cursor: 'pointer' }}>
                                                                                            <td>
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    className="form-check-input"
                                                                                                    checked={isChecked}
                                                                                                    onChange={() => handleToggleStudent(s.id)}
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                    aria-label={`Chọn sinh viên ${s.full_name}`}
                                                                                                />
                                                                                            </td>
                                                                                            <td className="font-monospace fw-bold text-primary">{s.student_code}</td>
                                                                                            <td>{s.full_name}</td>
                                                                                            <td className="small text-muted">{s.academic_year || '—'}</td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="mb-3">
                                                    <label htmlFor="batch-manual-codes" className="form-label small fw-bold">Danh Sách Mã Sinh Viên (MSSV)</label>
                                                    <textarea
                                                        id="batch-manual-codes"
                                                        className="form-control font-monospace"
                                                        rows="6"
                                                        placeholder="Dán mã sinh viên cách nhau bằng dấu phẩy, khoảng trắng hoặc xuống dòng.&#10;VD:&#10;SV001&#10;SV002&#10;SV003"
                                                        value={manualCodesInput}
                                                        onChange={(e) => setManualCodesInput(e.target.value)}
                                                    ></textarea>
                                                    <div className="form-text small">
                                                        Hệ thống sẽ tự động tách mã, tìm sinh viên tương ứng và kiểm tra điều kiện đăng ký.
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="modal-footer bg-light px-0 pb-0 mt-4">
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                disabled={batchSubmitting}
                                                onClick={() => setShowBatchModal(false)}
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm px-3"
                                                disabled={batchSubmitting || (batchMode === 'class' && selectedStudentIds.length === 0) || (batchMode === 'manual' && !manualCodesInput.trim())}
                                                onClick={handleBatchSubmit}
                                            >
                                                {batchSubmitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                                        Đang xử lý...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i aria-hidden="true" className="bi bi-check-circle me-1"></i>
                                                        Đăng ký cho {batchMode === 'class' ? `${selectedStudentIds.length} sinh viên` : 'danh sách'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </AccessibleDialog>
            )}
        </div>
    );
};

export default ManageClasses;
