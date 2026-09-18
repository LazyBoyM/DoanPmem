import React, { useEffect, useState, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAcademic } from '../../context/academic-context';
import SemesterSelect from '../../components/SemesterSelect';
import ClassSchedule from '../../components/ClassSchedule';
import { useNavigate } from 'react-router-dom';

const StudentRegistration = () => {
    const { semesterId, period, refresh } = useAcademic();
    const [result, setResult] = useState({ semesterId: '', classes: [], enrollments: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();
    const fetchData = useCallback(async (signal) => {
        if (!semesterId) return;
        try {
            const [classesRes, enrollmentsRes] = await Promise.all([
                axiosClient.get('/registration/open-classes', { params: { semester_id: semesterId }, signal }),
                axiosClient.get('/registration/my-enrollments', { params: { semester_id: semesterId }, signal })
            ]);
            if (!signal?.aborted) {
                setResult({ semesterId, classes: classesRes.data, enrollments: enrollmentsRes.data });
                setError('');
            }
        } catch (err) { if (!signal?.aborted) setError(err.response?.data?.message || 'Không tải được dữ liệu đăng ký.'); }
    }, [semesterId]);
    useEffect(() => {
        const controller = new AbortController();
        // State updates occur after the HTTP response, not synchronously in this effect.
        // eslint-disable-next-line react/set-state-in-effect
        fetchData(controller.signal);
        return () => controller.abort();
    }, [fetchData]);
    const openClasses = result.semesterId === semesterId ? result.classes : [];
    const myEnrollments = result.semesterId === semesterId ? result.enrollments : [];
    const filteredClasses = openClasses.filter(c => [c.class_code, c.subject_name, c.lecturer_name].some(value => (value || '').toLowerCase().includes(searchTerm.toLowerCase())));
    const handleSearch = e => setSearchTerm(e.target.value);
    const handleEnroll = async classId => {
        setBusy(true);
        try {
            await axiosClient.post('/registration/enroll', { course_class_id: classId });
            await fetchData();
        } catch (err) { alert(err.response?.data?.message || 'Lỗi đăng ký học phần'); }
        finally { setBusy(false); refresh(); }
    };
    const handleCancelEnrollment = async enrollmentId => {
        if (!window.confirm('Hủy đăng ký lớp học phần này?')) return;
        setBusy(true);
        try {
            await axiosClient.post('/registration/cancel', { enrollment_id: enrollmentId });
            await fetchData();
        } catch (err) { alert(err.response?.data?.message || 'Lỗi hủy đăng ký'); }
        finally { setBusy(false); refresh(); }
    };
    const totalCredits = myEnrollments.reduce((sum, item) => sum + Number(item.credits || 0), 0);
    const minCredits = period?.min_credits ?? 0;
    const maxCredits = period?.max_credits ?? 0;
    const progressPercent = maxCredits ? Math.min(totalCredits / maxCredits * 100, 100) : 0;

    return (
        <div className="student-pane">
            <SemesterSelect />
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {!period && <div className="alert alert-info">Học kỳ đã chọn chưa có đợt đăng ký đang mở.</div>}
            {/* Page Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h4 className="fw-bold mb-1">
                        <i className="bi bi-card-checklist text-primary me-2"></i>Cổng Đăng Ký Học Phần Trực Tuyến
                    </h4>
                    <p className="text-muted small mb-0">
                        Đăng ký học phần theo kế hoạch đào tạo, kiểm tra trùng lịch và quản lý tín chỉ tích lũy
                    </p>
                </div>
            </div>

            <div className="row g-4">
                {/* Cột danh sách lớp mở */}
                <div className="col-lg-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-header-styled">
                            <h5><i className="bi bi-collection-play text-primary"></i> Các Lớp Học Phần Đang Mở Đăng Ký</h5>
                            <span className="badge-soft-primary">{filteredClasses.length} Lớp</span>
                        </div>
                        <div className="p-3">
                            <div className="input-group mb-3">
                                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Tìm theo mã lớp, tên môn học, giảng viên phụ trách..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>

                            <div className="table-container-responsive">
                                <table className="table-modern">
                                    <thead>
                                        <tr>
                                            <th>Mã Lớp HP</th>
                                            <th>Tên Học Phần</th>
                                            <th>Số TC</th>
                                            <th>Giảng Viên</th>
                                            <th>Lịch Học</th>
                                            <th>Sĩ Số / Slot</th>
                                            <th className="text-center">Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClasses.length > 0 ? filteredClasses.map(c => {
                                            const isEnrolled = myEnrollments.some(e => e.id === c.id);
                                            const isFull = c.current_students >= c.max_students;

                                            let btnClass = 'btn-outline-primary';
                                            let btnText = 'Đăng Ký';
                                            let disabled = false;

                                            if (isEnrolled) {
                                                btnClass = 'btn-success disabled';
                                                btnText = 'Đã ĐK';
                                                disabled = true;
                                            } else if (isFull) {
                                                btnClass = 'btn-secondary disabled';
                                                btnText = 'Hết Chỗ';
                                                disabled = true;
                                            }

                                            return (
                                                <tr key={c.id}>
                                                    <td className="fw-bold text-primary">{c.class_code}</td>
                                                    <td className="fw-semibold">{c.subject_name}</td>
                                                    <td>{c.credits}</td>
                                                    <td>{c.lecturer_name || 'Chưa xếp'}</td>
                                                    <td><ClassSchedule schedules={c.schedules} /></td>
                                                    <td><span className={isFull ? 'text-danger fw-bold' : ''}>{c.current_students} / {c.max_students}</span></td>
                                                    <td className="text-center">
                                                        <button
                                                            className={`btn btn-sm px-3 fw-semibold ${btnClass}`}
                                                            disabled={disabled || busy || !period || c.grades_locked === 1}
                                                            onClick={() => handleEnroll(c.id)}
                                                        >
                                                            {btnText}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted py-4">Không tìm thấy lớp học phần nào.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cột giỏ môn học đã đăng ký */}
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 sticky-top" style={{ top: '90px' }}>
                        <div className="card-header-styled">
                            <h5><i className="bi bi-cart-check text-success"></i> Giỏ Môn Đã Đăng Ký</h5>
                            <span className="badge bg-primary">{totalCredits} / {maxCredits || "—"} TC</span>
                        </div>
                        <div className="p-3">
                            <div className="d-flex justify-content-between small text-muted mb-2">
                                <span>Giới hạn: Tối thiểu {minCredits} TC</span>
                                <span>Tối đa: {maxCredits || "—"} TC</span>
                            </div>
                            <div className="progress mb-3" style={{ height: '8px' }}>
                                <div className={`progress-bar ${totalCredits >= minCredits ? 'bg-success' : 'bg-warning'}`} style={{ width: `${progressPercent}%` }}></div>
                            </div>

                            <div className="list-group list-group-flush mb-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {myEnrollments.length > 0 ? myEnrollments.map(e => (
                                    <div className="list-group-item px-0 py-3 border-bottom" key={e.enrollment_id}>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h6 className="mb-1 fw-bold text-dark">{e.subject_name}</h6>
                                                <div className="small text-muted mb-1">
                                                    Mã Lớp: <span className="text-primary">{e.class_code}</span> • {e.credits} TC
                                                </div>
                                                <div className="small text-muted">
                                                    <ClassSchedule schedules={e.schedules} />
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-outline-danger btn-sm rounded-circle p-1"
                                                title="Chỉ hủy trong đợt mở và khi chưa có điểm"
                                                disabled={busy || !period || Boolean(e.grades_locked) || Boolean(e.grade && (e.grade.is_locked || [e.grade.attendance_score, e.grade.midterm_score, e.grade.final_score].some(v => v != null)))}
                                                onClick={() => handleCancelEnrollment(e.enrollment_id)}
                                            >
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-muted py-4">Giỏ môn học trống.</div>
                                )}
                            </div>

                            <div className="d-grid gap-2">
                                <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/student/timetable')}>
                                    <i className="bi bi-calendar3-week me-1"></i> Xem Thời Khóa Biểu Tuần
                                </button>
                                <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/student/grades')}>
                                    <i className="bi bi-award me-1"></i> Xem Kết Quả Học Tập
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentRegistration;
