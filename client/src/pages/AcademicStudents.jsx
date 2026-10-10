import { useEffect, useState } from 'react';
import useAcademicReport from '../hooks/useAcademicReport';
import { useAuth } from '../context/auth-context';
import { useAcademic } from '../context/academic-context';
import axiosClient from '../api/axiosClient';
import AcademicTranscript from '../components/AcademicTranscript';
export default function AcademicStudents() {
    const { user } = useAuth();
    const { semesters } = useAcademic();
    const [directory, setDirectory] = useState(null);
    const [search, setSearch] = useState('');
    const [studentId, setStudentId] = useState('');
    const [semester, setSemester] = useState('');
    const [directoryError, setDirectoryError] = useState('');
    const [directoryVersion, setDirectoryVersion] = useState(0);
    const { report: current, error: reportError, refresh } = useAcademicReport(
        studentId ? `/academic/students/${studentId}/transcript` : null, semester,
    );
    useEffect(() => {
        const controller = new AbortController();
        axiosClient.get('/academic/students', { signal: controller.signal }).then(response => {
            if (!controller.signal.aborted) {
                setDirectory(response.data);
                setDirectoryError('');
            }
        }).catch(error => {
            if (!controller.signal.aborted) setDirectoryError(error.response?.data?.message || 'Không tải được danh sách sinh viên.');
        });
        return () => controller.abort();
    }, [directoryVersion]);
    const error = directoryError || reportError;
    const retry = () => {
        if (directoryError) {
            setDirectoryError('');
            setDirectoryVersion(value => value + 1);
        } else refresh();
    };
    const filtered = (directory || []).filter(s => `${s.full_name} ${s.student_code} ${s.class_name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
    return <div><div className="academic-page-header"><div><h1>Theo dõi học tập</h1><p>{user.role === 'ADMIN' ? 'Tra cứu bảng điểm, GPA, tín chỉ và kết quả thi lại của từng sinh viên.' : 'Tra cứu kết quả toàn khóa của sinh viên thuộc các lớp bạn phụ trách.'}</p></div><span className="scope-chip"><i aria-hidden="true" className="bi bi-shield-check" />{user.role === 'ADMIN' ? 'Toàn hệ thống' : 'Sinh viên thuộc lớp phụ trách'}</span></div>
        <div className="academic-directory"><aside className="academic-directory-index"><h2>Hồ sơ sinh viên</h2><label className="search-field"><i aria-hidden="true" className="bi bi-search" /><input id="student-search" aria-label="Tìm sinh viên" placeholder="Tên, mã hoặc lớp…" value={search} onChange={e => { setSearch(e.target.value); setStudentId(''); }} /></label><div className="academic-directory-list">{filtered.map(s => <button key={s.id} aria-pressed={String(s.id) === studentId} onClick={() => setStudentId(String(s.id))}><strong>{s.full_name}</strong><small>{s.student_code} · {s.class_name}</small></button>)}{directory && !filtered.length && <p className="small text-muted mt-3">Không có hồ sơ phù hợp.</p>}</div><label className="academic-mobile-picker" htmlFor="student-selection">Chọn sinh viên ({filtered.length})</label><select id="student-selection" className="form-select academic-mobile-picker" value={filtered.some(s => String(s.id) === studentId) ? studentId : ''} onChange={e => setStudentId(e.target.value)}><option value="">Chọn hồ sơ để xem kết quả</option>{filtered.map(s => <option key={s.id} value={s.id}>{s.student_code} · {s.full_name}</option>)}</select></aside>
        <section className="academic-directory-main"><label className="semester-choice" htmlFor="academic-semester">Phạm vi kết quả<select id="academic-semester" className="form-select" value={semester} onChange={e => setSemester(e.target.value)}><option value="">Tất cả học kỳ</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.semester_name}</option>)}</select></label>
        {error && <div className="alert alert-danger" role="alert">{error}<button className="btn btn-sm btn-outline-danger ms-3" onClick={retry}>Thử lại</button></div>}
        {current ? <AcademicTranscript key={studentId + semester} report={current} semesterLabel={semesters.find(s => String(s.id) === semester)?.semester_name} onRefresh={refresh} /> : !error && <div className="card academic-welcome empty-state"><i aria-hidden="true" className="bi bi-person-lines-fill" /><h2>{!directory || studentId ? 'Đang tải dữ liệu…' : 'Chọn một hồ sơ để xem kết quả'}</h2><p>{!directory ? 'Đang tải danh sách sinh viên trong phạm vi được phép.' : studentId ? 'Đang tải bảng điểm và tiến độ tích lũy.' : directory.length ? 'Tra cứu GPA, tín chỉ, môn chưa đạt và kết quả thi lại của sinh viên trong mục lục.' : 'Chưa có sinh viên trong phạm vi được phép xem.'}</p></div>}
        </section></div>
    </div>;
}
