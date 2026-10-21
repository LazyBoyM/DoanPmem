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
    const [filterYear, setFilterYear] = useState('');
    const [filterEnrollStatus, setFilterEnrollStatus] = useState('');
    const [adminClasses, setAdminClasses] = useState([]);
    const [viewMode, setViewMode] = useState('classes');
    const [filterClass, setFilterClass] = useState('');
    const [selectedClassForModal, setSelectedClassForModal] = useState(null);
    const [enrollModalClass, setEnrollModalClass] = useState(null);
    const [availableCourseClasses, setAvailableCourseClasses] = useState([]);
    const [selectedCourseClassId, setSelectedCourseClassId] = useState('');
    const [selectedClassStudentIds, setSelectedClassStudentIds] = useState([]);
    const [enrollingClass, setEnrollingClass] = useState(false);
    const [enrollResult, setEnrollResult] = useState(null);

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
            const [studentsRes, programsRes, adminClassesRes] = await Promise.all([
                axiosClient.get('/admin/students'),
                axiosClient.get('/admin/programs'),
                axiosClient.get('/admin/administrative-classes')
            ]);
            if (studentsRes.success) setStudents(studentsRes.data);
            if (programsRes.success) setPrograms(programsRes.data);
            if (adminClassesRes.success && Array.isArray(adminClassesRes.data)) setAdminClasses(adminClassesRes.data);
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

    const handleOpenClassEnroll = async (ac) => {
        setEnrollModalClass(ac);
        setSelectedClassStudentIds(ac.students.map(s => s.id));
        setSelectedCourseClassId('');
        setEnrollResult(null);
        try {
            const res = await axiosClient.get('/admin/classes');
            if (res.success && Array.isArray(res.data)) {
                const openOnes = res.data.filter(c => c.status === 'OPEN' && !c.grades_locked && c.current_students < c.max_students);
                setAvailableCourseClasses(openOnes);
                if (openOnes.length > 0) {
                    setSelectedCourseClassId(String(openOnes[0].id));
                }
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Không thể tải danh sách lớp học phần.', 'danger');
        }
    };

    const handleToggleClassStudent = (id) => {
        setSelectedClassStudentIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleToggleAllClassStudents = (classStudents) => {
        if (!classStudents || classStudents.length === 0) return;
        const allIds = classStudents.map(s => s.id);
        const allSelected = allIds.every(id => selectedClassStudentIds.includes(id));
        if (allSelected) {
            setSelectedClassStudentIds(prev => prev.filter(id => !allIds.includes(id)));
        } else {
            setSelectedClassStudentIds(prev => Array.from(new Set([...prev, ...allIds])));
        }
    };

    const handleBatchEnrollSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!selectedCourseClassId || selectedClassStudentIds.length === 0) {
            notify('Vui lòng chọn lớp học phần và ít nhất một sinh viên.', 'warning');
            return;
        }
        setEnrollingClass(true);
        try {
            const res = await axiosClient.post(`/admin/classes/${selectedCourseClassId}/batch-enroll`, {
                student_ids: selectedClassStudentIds
            });
            if (res.success) {
                setEnrollResult(res.data);
                notify(res.message || 'Đăng ký thành công.', 'success');
                fetchData();
            }
        } catch (err) {
            notify(err.response?.data?.message || 'Lỗi khi đăng ký học phần cho lớp.', 'danger');
        } finally {
            setEnrollingClass(false);
        }
    };

    const filteredStudents = students.filter(st => {
        const query = searchTerm.toLowerCase();
        const matchSearch = !query ||
            (st.student_code || '').toLowerCase().includes(query) ||
            (st.full_name || '').toLowerCase().includes(query) ||
            (st.class_name || '').toLowerCase().includes(query);
        const matchProgram = filterProgram ? String(st.program_id) === filterProgram : true;
        const matchClass = filterClass ? st.class_name === filterClass : true;
        const matchYear = filterYear ? (st.academic_year || 'K74') === filterYear : true;
        let matchEnroll = true;
        if (filterEnrollStatus) {
            const classObj = adminClasses.find(c => c.class_name === st.class_name);
            const studentDetail = classObj?.students?.find(s => s.id === st.id);
            const credits = studentDetail?.total_credits || 0;
            if (filterEnrollStatus === 'ENROLLED') matchEnroll = credits > 0;
            else if (filterEnrollStatus === 'NOT_ENROLLED') matchEnroll = credits === 0;
        }
        return matchSearch && matchProgram && matchClass && matchYear && matchEnroll;
    });

    const filteredAdminClasses = adminClasses.filter(ac => {
        const query = searchTerm.toLowerCase();
        const matchSearch = !query ||
            ac.class_name.toLowerCase().includes(query) ||
            (ac.program_name || '').toLowerCase().includes(query) ||
            ac.students.some(s => s.student_code.toLowerCase().includes(query) || s.full_name.toLowerCase().includes(query));
        const matchClass = filterClass ? ac.class_name === filterClass : true;
        const matchProgram = filterProgram ? ac.students.some(s => String(s.program_id) === filterProgram) : true;
        const matchYear = filterYear ? (ac.academic_year === filterYear || ac.students.some(s => s.academic_year === filterYear)) : true;
        const matchEnroll = filterEnrollStatus === 'ENROLLED' ? ac.enrolled_count > 0 :
                            filterEnrollStatus === 'NOT_ENROLLED' ? ac.enrolled_count === 0 : true;
        return matchSearch && matchClass && matchProgram && matchYear && matchEnroll;
    });

    return (
        <div className="admin-pane">
            <RecordWorkspace heading={<>
                    <div>
                        <h1 className="fw-bold mb-1">
                            Hồ sơ sinh viên
                        </h1>
                        <p className="text-muted small mb-0">
                            Quản lý theo lớp sinh hoạt ({adminClasses.length} lớp), tra cứu hồ sơ cá nhân và xuất danh sách
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
                    <div>
                        <label className="form-label small fw-bold text-muted mb-1">Chế độ quản lý</label>
                        <ul className="nav nav-pills" role="tablist">
                            <li className="nav-item">
                                <button
                                    type="button"
                                    className={`nav-link ${viewMode === 'classes' ? 'active' : 'bg-light text-dark'}`}
                                    onClick={() => setViewMode('classes')}
                                >
                                    <i aria-hidden="true" className="bi bi-collection me-2"></i>Theo Lớp Sinh Hoạt ({adminClasses.length})
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    type="button"
                                    className={`nav-link ${viewMode === 'students' ? 'active' : 'bg-light text-dark'}`}
                                    onClick={() => setViewMode('students')}
                                >
                                    <i aria-hidden="true" className="bi bi-people me-2"></i>Danh Sách Sinh Viên ({students.length})
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <label htmlFor="students-search-input" className="form-label small fw-bold text-muted mb-1">Tìm kiếm</label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted">
                                <i aria-hidden="true" className="bi bi-search"></i>
                            </span>
                            <input
                                id="students-search-input"
                                type="text"
                                className="form-control border-start-0"
                                aria-label="Tìm kiếm trong danh sách"
                                placeholder={viewMode === 'classes' ? "Tên lớp (74DCTT24), SV..." : "Mã SV, họ tên, lớp..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="students-filter-class" className="form-label small fw-bold text-muted mb-1">Lớp sinh hoạt</label>
                        <select
                            id="students-filter-class"
                            aria-label="Lọc theo lớp sinh hoạt"
                            className="form-select"
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                        >
                            <option value="">-- Tất cả lớp sinh hoạt --</option>
                            {adminClasses.map(ac => (
                                <option key={ac.class_name} value={ac.class_name}>
                                    {ac.class_name} ({ac.student_count} SV)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="students-filter-program" className="form-label small fw-bold text-muted mb-1">Ngành đào tạo</label>
                        <select
                            id="students-filter-program"
                            aria-label="Lọc theo ngành đào tạo"
                            className="form-select"
                            value={filterProgram}
                            onChange={(e) => setFilterProgram(e.target.value)}
                        >
                            <option value="">-- Tất cả ngành --</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.program_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="students-filter-year" className="form-label small fw-bold text-muted mb-1">Khóa học</label>
                        <select
                            id="students-filter-year"
                            aria-label="Lọc theo khóa học"
                            className="form-select"
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                        >
                            <option value="">-- Tất cả khóa --</option>
                            {Array.from(new Set(students.map(s => s.academic_year || 'K74'))).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="students-filter-enroll" className="form-label small fw-bold text-muted mb-1">Tiến độ ĐK môn kỳ này</label>
                        <select
                            id="students-filter-enroll"
                            aria-label="Lọc theo tiến độ đăng ký môn"
                            className="form-select"
                            value={filterEnrollStatus}
                            onChange={(e) => setFilterEnrollStatus(e.target.value)}
                        >
                            <option value="">-- Tất cả tiến độ --</option>
                            <option value="ENROLLED">Đã đăng ký học phần</option>
                            <option value="NOT_ENROLLED">Chưa đăng ký học phần</option>
                        </select>
                    </div>
                    {(searchTerm || filterClass || filterProgram || filterYear || filterEnrollStatus) && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm w-100"
                            onClick={() => {
                                setSearchTerm('');
                                setFilterClass('');
                                setFilterProgram('');
                                setFilterYear('');
                                setFilterEnrollStatus('');
                            }}
                        >
                            <i aria-hidden="true" className="bi bi-x-circle me-1"></i> Xóa bộ lọc
                        </button>
                    )}
                </>} sheetTitle={viewMode === 'classes' ? "Danh sách lớp sinh hoạt" : "Danh sách sinh viên"} filterTitle="Bộ lọc & Tìm kiếm" summary={<>
                    {viewMode === 'classes' ? (
                        <span className="badge bg-light text-dark border px-3 py-2">
                            Hiển thị <b>{filteredAdminClasses.length}</b> / <b>{adminClasses.length}</b> lớp sinh hoạt
                        </span>
                    ) : (
                        <span className="badge bg-light text-dark border px-3 py-2">
                            Hiển thị <b>{filteredStudents.length}</b> / <b>{students.length}</b> sinh viên
                        </span>
                    )}
                </>}>
{viewMode === 'classes' ? (
    loading ? (
        <div className="text-center py-5 text-muted">
            <LoadingState compact />
            Đang nạp danh sách lớp sinh hoạt...
        </div>
    ) : filteredAdminClasses.length === 0 ? (
        <div className="text-center py-5 text-muted">
            <i aria-hidden="true" className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
            <div className="fw-semibold">Không tìm thấy lớp sinh hoạt nào phù hợp với bộ lọc.</div>
            <div className="small mb-3">Hãy thử thay đổi hoặc đặt lại tiêu chí lọc.</div>
            {(searchTerm || filterClass || filterProgram || filterYear || filterEnrollStatus) && (
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => {
                        setSearchTerm('');
                        setFilterClass('');
                        setFilterProgram('');
                        setFilterYear('');
                        setFilterEnrollStatus('');
                    }}
                >
                    <i aria-hidden="true" className="bi bi-arrow-counterclockwise me-1"></i> Đặt lại bộ lọc
                </button>
            )}
        </div>
    ) : (
        <div className="row g-3">
            {filteredAdminClasses.map(ac => {
                const percent = ac.student_count > 0 ? Math.round((ac.enrolled_count / ac.student_count) * 100) : 0;
                return (
                    <div key={ac.class_name} className="col-md-6 col-lg-4">
                        <div className="card h-100 shadow-sm border border-light-subtle rounded-3">
                            <div className="card-header bg-light d-flex justify-content-between align-items-center py-2 px-3 border-bottom">
                                <span className="badge bg-primary fs-6 font-monospace px-2 py-1">
                                    {ac.class_name}
                                </span>
                                <span className="badge bg-secondary-subtle text-secondary border px-2 py-1">
                                    {ac.academic_year || 'K74'}
                                </span>
                            </div>
                            <div className="card-body p-3 d-flex flex-column justify-content-between">
                                <div>
                                    <div className="small fw-bold text-dark mb-1">
                                        <i aria-hidden="true" className="bi bi-mortarboard me-1 text-primary"></i>
                                        {ac.program_name || 'Công nghệ Thông tin'}
                                    </div>
                                    <div className="d-flex justify-content-between small text-muted my-2">
                                        <span><i aria-hidden="true" className="bi bi-people me-1"></i>Sĩ số: <strong>{ac.student_count}</strong> SV</span>
                                        <span><i aria-hidden="true" className="bi bi-check2-circle me-1 text-success"></i>Đã ĐK kỳ này: <strong className="text-success">{ac.enrolled_count}</strong></span>
                                    </div>
                                    <div className="progress mb-3" style={{ height: '6px' }} role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
                                        <div className={`progress-bar ${percent === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                                <div className="d-flex gap-2 mt-2 pt-2 border-top">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-info flex-fill"
                                        onClick={() => setSelectedClassForModal(ac)}
                                    >
                                        <i aria-hidden="true" className="bi bi-people me-1"></i> Xem SV ({ac.student_count})
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-success flex-fill"
                                        onClick={() => handleOpenClassEnroll(ac)}
                                        title="Đăng ký môn học cho lớp này"
                                    >
                                        <i aria-hidden="true" className="bi bi-person-plus-fill me-1"></i> Đăng ký môn
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
) : (
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
                                    <td colSpan="8" className="py-5 text-center text-muted">
                                        <i aria-hidden="true" className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                                        <div className="fw-semibold">Không tìm thấy sinh viên nào phù hợp.</div>
                                        <div className="small mb-3">Hãy thử thay đổi từ khóa hoặc điều chỉnh bộ lọc.</div>
                                        {(searchTerm || filterClass || filterProgram || filterYear || filterEnrollStatus) && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setFilterClass('');
                                                    setFilterProgram('');
                                                    setFilterYear('');
                                                    setFilterEnrollStatus('');
                                                }}
                                            >
                                                <i aria-hidden="true" className="bi bi-arrow-counterclockwise me-1"></i> Đặt lại bộ lọc
                                            </button>
                                        )}
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
                                            <button
                                                type="button"
                                                className="btn btn-link p-0 text-decoration-none"
                                                onClick={() => setFilterClass(st.class_name)}
                                                title={`Lọc theo lớp ${st.class_name}`}
                                            >
                                                <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                                                    {st.class_name}
                                                </span>
                                            </button>
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
)}

</RecordWorkspace>

            {detailStudent && <StudentDetails key={detailStudent.id} student={detailStudent} onClose={() => setDetailStudent(null)} onEdit={st => { setDetailStudent(null); handleOpenEdit(st); }} />}

            {selectedClassForModal && (
                <AccessibleDialog className="dialog-xl" onClose={() => setSelectedClassForModal(null)}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <div>
                                    <h5 className="modal-title fw-bold mb-0">
                                        <i aria-hidden="true" className="bi bi-collection text-primary me-2"></i>
                                        Lớp Sinh Hoạt: <span className="font-monospace text-primary">{selectedClassForModal.class_name}</span>
                                    </h5>
                                    <small className="text-muted">
                                        {selectedClassForModal.program_name} · Khóa {selectedClassForModal.academic_year || 'K74'} · Sĩ số: <strong>{selectedClassForModal.student_count}</strong> sinh viên
                                    </small>
                                </div>
                                <button type="button" className="btn-close" aria-label="Đóng cửa sổ" onClick={() => setSelectedClassForModal(null)}></button>
                            </div>
                            <div className="modal-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover align-middle mb-0 text-center">
                                        <thead className="table-light">
                                            <tr>
                                                <th scope="col">STT</th>
                                                <th scope="col">Mã sinh viên</th>
                                                <th scope="col" className="text-start">Họ và tên</th>
                                                <th scope="col">Giới tính</th>
                                                <th scope="col">Liên hệ</th>
                                                <th scope="col">TC kỳ này</th>
                                                <th scope="col">Trạng thái ĐK</th>
                                                <th scope="col">Chi tiết</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedClassForModal.students.map((s, idx) => (
                                                <tr key={s.id}>
                                                    <td className="text-muted">{idx + 1}</td>
                                                    <td><span className="badge bg-primary-subtle text-primary border font-monospace">{s.student_code}</span></td>
                                                    <td className="text-start fw-semibold">{s.full_name}</td>
                                                    <td>{s.gender || '---'}</td>
                                                    <td className="small text-muted">{s.phone || s.email || '---'}</td>
                                                    <td>
                                                        <span className={`badge ${s.total_credits > 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'}`}>
                                                            {s.total_credits} TC
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${s.status === 'SUBMITTED' ? 'bg-success' : s.status === 'EMPTY' ? 'bg-secondary' : 'bg-warning text-dark'}`}>
                                                            {s.status_label || (s.total_credits > 0 ? 'Đã đăng ký' : 'Chưa đăng ký')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-info py-0 px-2"
                                                            onClick={() => {
                                                                const fullStudent = students.find(st => st.id === s.id) || s;
                                                                setDetailStudent(fullStudent);
                                                            }}
                                                            title="Xem hồ sơ cá nhân"
                                                        >
                                                            <i aria-hidden="true" className="bi bi-eye"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer bg-light justify-content-between">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedClassForModal(null)}>
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success btn-sm px-3"
                                    onClick={() => {
                                        const target = selectedClassForModal;
                                        setSelectedClassForModal(null);
                                        handleOpenClassEnroll(target);
                                    }}
                                >
                                    <i aria-hidden="true" className="bi bi-person-plus-fill me-1"></i>
                                    Đăng ký học phần cho lớp này
                                </button>
                            </div>
                        </div>
                    </div>
                </AccessibleDialog>
            )}

            {enrollModalClass && (
                <AccessibleDialog className="dialog-lg" onClose={() => { if (!enrollingClass) setEnrollModalClass(null); }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <div>
                                    <h5 className="modal-title fw-bold mb-0">
                                        <i aria-hidden="true" className="bi bi-person-plus-fill text-success me-2"></i>
                                        Đăng Ký Học Phần Cho Lớp: <span className="font-monospace text-primary">{enrollModalClass.class_name}</span>
                                    </h5>
                                    <small className="text-muted">
                                        Sĩ số: {enrollModalClass.student_count} sinh viên · Chọn lớp học phần và xác nhận đăng ký
                                    </small>
                                </div>
                                <button type="button" className="btn-close" aria-label="Đóng cửa sổ" disabled={enrollingClass} onClick={() => setEnrollModalClass(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                {enrollResult ? (
                                    <div className="d-flex flex-column gap-3">
                                        <div className={`alert ${enrollResult.enrolledCount > 0 ? 'alert-success' : 'alert-warning'} d-flex align-items-center mb-0`}>
                                            <i aria-hidden="true" className={`bi ${enrollResult.enrolledCount > 0 ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-4 me-3`}></i>
                                            <div>
                                                <div className="fw-bold">Kết quả xử lý đăng ký</div>
                                                <div className="small">
                                                    Đã thêm thành công: <strong className="text-success">{enrollResult.enrolledCount}</strong> sinh viên · Bỏ qua: <strong className="text-danger">{enrollResult.skippedCount}</strong> sinh viên.
                                                </div>
                                            </div>
                                        </div>

                                        {enrollResult.skippedList && enrollResult.skippedList.length > 0 && (
                                            <div>
                                                <h6 className="fw-bold small text-danger mb-2">
                                                    <i aria-hidden="true" className="bi bi-x-circle me-1"></i> Danh sách sinh viên không thể đăng ký ({enrollResult.skippedList.length}):
                                                </h6>
                                                <div className="table-responsive border rounded" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                                    <table className="table table-sm table-hover align-middle mb-0">
                                                        <thead className="table-light sticky-top">
                                                            <tr>
                                                                <th scope="col">MSSV</th>
                                                                <th scope="col">Họ và tên</th>
                                                                <th scope="col">Lý do</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {enrollResult.skippedList.map((item, idx) => (
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

                                        {enrollResult.successList && enrollResult.successList.length > 0 && (
                                            <div>
                                                <h6 className="fw-bold small text-success mb-2">
                                                    <i aria-hidden="true" className="bi bi-check-circle me-1"></i> Sinh viên đã đăng ký thành công ({enrollResult.successList.length}):
                                                </h6>
                                                <div className="table-responsive border rounded" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                    <table className="table table-sm table-hover align-middle mb-0">
                                                        <thead className="table-light sticky-top">
                                                            <tr>
                                                                <th scope="col">STT</th>
                                                                <th scope="col">MSSV</th>
                                                                <th scope="col">Họ và tên</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {enrollResult.successList.map((item, idx) => (
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
                                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEnrollResult(null)}>
                                                <i aria-hidden="true" className="bi bi-arrow-repeat me-1"></i> Đăng ký môn khác
                                            </button>
                                            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEnrollModalClass(null)}>
                                                Hoàn tất
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-3">
                                            <label htmlFor="select-course-class-for-admin-class" className="form-label small fw-bold">Chọn Lớp Học Phần Đang Mở *</label>
                                            <select
                                                id="select-course-class-for-admin-class"
                                                className="form-select"
                                                value={selectedCourseClassId}
                                                onChange={(e) => setSelectedCourseClassId(e.target.value)}
                                            >
                                                <option value="">-- Chọn một lớp học phần --</option>
                                                {availableCourseClasses.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.class_code} · {c.subject_name} ({c.credits} TC) — Sĩ số: {c.current_students}/{c.max_students}
                                                    </option>
                                                ))}
                                            </select>
                                            {availableCourseClasses.length === 0 && (
                                                <div className="text-danger small mt-1">
                                                    Hiện không có lớp học phần nào đang mở hoặc còn chỗ trống.
                                                </div>
                                            )}
                                        </div>

                                        {(() => {
                                            const currentClassStudents = enrollModalClass.students || [];
                                            const allSelected = currentClassStudents.length > 0 && currentClassStudents.every(s => selectedClassStudentIds.includes(s.id));
                                            const chosenCourseClass = availableCourseClasses.find(c => String(c.id) === String(selectedCourseClassId));
                                            const remainingSlots = chosenCourseClass ? Math.max(0, chosenCourseClass.max_students - chosenCourseClass.current_students) : 0;

                                            return (
                                                <div>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="small text-muted">
                                                            Đang chọn: <strong className="text-primary">{selectedClassStudentIds.length}</strong> / {currentClassStudents.length} SV
                                                            {chosenCourseClass && selectedClassStudentIds.length > remainingSlots && (
                                                                <span className="text-danger ms-2 fw-semibold">
                                                                    (Vượt số chỗ trống của lớp: {remainingSlots})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-link p-0 text-decoration-none"
                                                            onClick={() => handleToggleAllClassStudents(currentClassStudents)}
                                                        >
                                                            {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                                        </button>
                                                    </div>

                                                    <div className="table-responsive border rounded" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                                        <table className="table table-sm table-hover align-middle mb-0">
                                                            <thead className="table-light sticky-top">
                                                                <tr>
                                                                    <th scope="col" style={{ width: '40px' }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-check-input"
                                                                            checked={allSelected}
                                                                            onChange={() => handleToggleAllClassStudents(currentClassStudents)}
                                                                            aria-label="Chọn tất cả sinh viên"
                                                                        />
                                                                    </th>
                                                                    <th scope="col">MSSV</th>
                                                                    <th scope="col">Họ và tên</th>
                                                                    <th scope="col">TC kỳ này</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {currentClassStudents.map(s => {
                                                                    const isChecked = selectedClassStudentIds.includes(s.id);
                                                                    return (
                                                                        <tr key={s.id} onClick={() => handleToggleClassStudent(s.id)} style={{ cursor: 'pointer' }}>
                                                                            <td>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="form-check-input"
                                                                                    checked={isChecked}
                                                                                    onChange={() => handleToggleClassStudent(s.id)}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    aria-label={`Chọn sinh viên ${s.full_name}`}
                                                                                />
                                                                            </td>
                                                                            <td className="font-monospace fw-bold text-primary">{s.student_code}</td>
                                                                            <td>{s.full_name}</td>
                                                                            <td className="small text-muted">{s.total_credits} TC</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="modal-footer bg-light px-0 pb-0 mt-4">
                                            <button type="button" className="btn btn-secondary btn-sm" disabled={enrollingClass} onClick={() => setEnrollModalClass(null)}>
                                                Hủy
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-success btn-sm px-3"
                                                disabled={enrollingClass || !selectedCourseClassId || selectedClassStudentIds.length === 0}
                                                onClick={handleBatchEnrollSubmit}
                                            >
                                                {enrollingClass ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                                        Đang xử lý đăng ký...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i aria-hidden="true" className="bi bi-check-circle me-1"></i>
                                                        Đăng ký cho {selectedClassStudentIds.length} sinh viên
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
            {showModal && (
                <AccessibleDialog className="dialog-lg" onClose={() => setShowModal(false)}>
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
                                                className="form-control text-uppercase font-monospace"
                                                placeholder="VD: 74DCTT25"
                                                list="admin-class-options"
                                                required
                                                value={formData.class_name}
                                                onChange={(e) => setFormData({ ...formData, class_name: e.target.value.toUpperCase() })}
                                            />
                                            <datalist id="admin-class-options">
                                                {adminClasses.map(ac => (
                                                    <option key={ac.class_name} value={ac.class_name} />
                                                ))}
                                            </datalist>
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
