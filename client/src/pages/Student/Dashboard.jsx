import { useFeedback } from '../../context/feedback-context';
import LoadingState from '../../components/LoadingState';
import { useEffect, useState, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAcademic } from '../../context/academic-context';
import SemesterSelect from '../../components/SemesterSelect';
import ClassSchedule from '../../components/ClassSchedule';
import { useNavigate } from 'react-router-dom';

const isLocked = value => value === true || Number(value) === 1;
const enrollmentRestriction = (enrollment, period) => {
    if (!period) return 'Đợt đăng ký đã đóng';
    if (isLocked(enrollment.grades_locked) || isLocked(enrollment.grade?.is_locked)) return 'Đã khóa điểm';
    if (enrollment.grade && [enrollment.grade.attendance_score, enrollment.grade.midterm_score, enrollment.grade.final_score].some(value => value != null)) return 'Đã có điểm';
    return '';
};

const StudentRegistration = () => {
    const { confirm } = useFeedback();
    const { semesterId, period, refresh } = useAcademic();
    const [result, setResult] = useState({ semesterId: '', classes: [], enrollments: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState(null);
    const [busy, setBusy] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
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
        setBusy(true); setNotice(null);
        try {
            await axiosClient.post('/registration/enroll', { course_class_id: classId });
            setNotice({ type: 'success', text: 'Đã đăng ký lớp. Kiểm tra danh sách đã đăng ký và thời khóa biểu.' });
            await fetchData();
        } catch (err) { setNotice({ type: 'danger', text: err.response?.data?.message || 'Không đăng ký được học phần.' }); }
        finally { setBusy(false); refresh(); }
    };
    const handleCancelEnrollment = async enrollmentId => {
        if (!await confirm('Hủy đăng ký lớp học phần này?')) return;
        setBusy(true); setNotice(null);
        try {
            await axiosClient.post('/registration/cancel', { enrollment_id: enrollmentId });
            setNotice({ type: 'success', text: 'Đã hủy đăng ký lớp học phần.' });
            await fetchData();
        } catch (err) { setNotice({ type: 'danger', text: err.response?.data?.message || 'Không hủy được đăng ký.' }); }
        finally { setBusy(false); refresh(); }
    };
    const totalCredits = myEnrollments.reduce((sum, item) => sum + Number(item.credits || 0), 0);
    const minCredits = period?.min_credits ?? 0;
    const maxCredits = period?.max_credits ?? 0;
    const progressPercent = maxCredits ? Math.min(totalCredits / maxCredits * 100, 100) : 0;

    const activeClass = filteredClasses.find(c => String(c.id) === selectedClassId) || filteredClasses[0];
    const activeEnrolled = activeClass && myEnrollments.some(e => e.id === activeClass.id);
    const activeFull = activeClass && activeClass.current_students >= activeClass.max_students;
    const activeRestriction = !period ? 'Đợt đăng ký đã đóng' : activeClass && isLocked(activeClass.grades_locked) ? 'Đã khóa điểm' : '';
    const activeLabel = activeEnrolled ? 'Đã đăng ký' : activeFull ? 'Hết chỗ' : activeRestriction || (busy ? 'Đang xử lý…' : 'Đăng ký lớp này');

    return <div className="student-pane">
        <div className="dashboard-heading"><div><h1>Đăng ký học phần</h1><p>Chọn lớp trong mục lục, kiểm tra lịch và hoàn tất kế hoạch học kỳ.</p></div><SemesterSelect /></div>
        {notice && <div className={`alert alert-${notice.type}`} role={notice.type === 'danger' ? 'alert' : 'status'}>{notice.text}</div>}
        {error && <div className="alert alert-danger" role="alert">{error}<button className="btn btn-sm btn-outline-danger ms-3" onClick={() => fetchData()}>Thử lại</button></div>}
        {!period && <div className="alert alert-info">Học kỳ đã chọn chưa có đợt đăng ký đang mở. Bạn vẫn có thể tra cứu lớp và các học phần đã đăng ký.</div>}
        <div className="registration-catalog-layout"><aside className="registration-catalog-index"><h2>Lớp mở đăng ký · {filteredClasses.length}</h2><label className="search-field"><i aria-hidden="true" className="bi bi-search" /><input aria-label="Tìm lớp đăng ký" placeholder="Môn, mã lớp hoặc giảng viên…" value={searchTerm} onChange={handleSearch} /></label><div className="registration-catalog-list">{filteredClasses.map(c => <button key={c.id} aria-pressed={c.id === activeClass?.id} disabled={busy} onClick={() => setSelectedClassId(String(c.id))}><strong>{c.subject_name}</strong><small>{c.class_code}</small><small>{c.credits} tín chỉ · {c.current_students}/{c.max_students} sinh viên</small></button>)}</div><label className="registration-mobile-picker" htmlFor="registration-class">Chọn lớp học phần</label><select id="registration-class" className="form-select registration-mobile-picker" disabled={busy || !filteredClasses.length} value={activeClass?.id || ''} onChange={e => setSelectedClassId(e.target.value)}>{!filteredClasses.length && <option value="">Không có lớp phù hợp</option>}{filteredClasses.map(c => <option key={c.id} value={c.id}>{c.subject_name} · {c.class_code}</option>)}</select></aside>
        <div className="registration-plan"><section className="registration-class-sheet" aria-label="Thông tin lớp đăng ký">
            {result.semesterId !== semesterId && !error ? <LoadingState label="Đang tải lớp đăng ký" /> : activeClass ? <><h2>{activeClass.subject_name}</h2><p className="registration-class-code">{activeClass.class_code}</p><dl className="registration-class-facts"><div><dt>Tín chỉ</dt><dd>{activeClass.credits}</dd></div><div><dt>Sĩ số / giới hạn</dt><dd>{activeClass.current_students} / {activeClass.max_students}</dd></div><div><dt>Giảng viên</dt><dd>{activeClass.lecturer_name || 'Chưa phân công'}</dd></div></dl><h3 className="h6">Lịch học</h3><ClassSchedule schedules={activeClass.schedules} /><div className="registration-class-action"><span>{activeRestriction || 'Kiểm tra lịch học trước khi đăng ký.'}</span><button className={`btn ${activeEnrolled ? 'btn-outline-secondary' : 'btn-primary'}`} disabled={busy || activeEnrolled || activeFull || Boolean(activeRestriction)} onClick={() => handleEnroll(activeClass.id)}>{activeLabel}</button></div></> : <div className="empty-state"><i aria-hidden="true" className="bi bi-journal" /><strong>{error ? 'Chưa tải được danh sách' : 'Không có lớp phù hợp'}</strong><span>Thử đổi học kỳ hoặc từ khóa tìm kiếm.</span></div>}
        </section><section className="card enrollment-summary"><div className="card-header-styled"><h5>Học phần đã đăng ký</h5><span className="badge-soft-primary">{myEnrollments.length} lớp</span></div><div className="registration-progress"><div className="credit-count">{totalCredits}<small> / {maxCredits || '—'} tín chỉ</small></div><p>{period ? `Mục tiêu tối thiểu ${minCredits} TC · Tối đa ${maxCredits} TC` : 'Giới hạn được hiển thị khi đợt đăng ký mở.'}</p><div className="credit-track" role="progressbar" aria-label="Tín chỉ đã đăng ký so với giới hạn" aria-valuenow={Math.round(progressPercent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progressPercent}%` }} /></div></div>
        {myEnrollments.map(e => { const restriction = enrollmentRestriction(e, period); return <div key={e.enrollment_id} className="enrollment-row"><div className="d-flex justify-content-between gap-2 align-items-start"><h3>{e.subject_name}</h3><button className="icon-button" aria-label={`Hủy đăng ký ${e.subject_name}`} disabled={busy || Boolean(restriction)} title={restriction || 'Hủy đăng ký'} onClick={() => handleCancelEnrollment(e.enrollment_id)}><i className="bi bi-x-lg" aria-hidden="true" /></button></div><p>{e.class_code} · {e.credits} tín chỉ</p>{restriction && <small className="d-block text-muted mb-2">Không thể hủy: {restriction.toLowerCase()}.</small>}<ClassSchedule schedules={e.schedules} /></div>; })}
        {!myEnrollments.length && <div className="empty-state"><strong>Chưa có học phần</strong><span>Chọn lớp ở danh sách để bắt đầu kế hoạch học kỳ.</span></div>}
        <div className="enrollment-links"><button className="btn btn-outline-primary" onClick={() => navigate('/student/timetable')}><i aria-hidden="true" className="bi bi-calendar3 me-2" />Xem thời khóa biểu</button><button className="btn btn-outline-secondary" onClick={() => navigate('/student/grades')}>Kết quả & thi lại</button></div></section></div></div>
    </div>;
};
export default StudentRegistration;
