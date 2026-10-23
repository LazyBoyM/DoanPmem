import { useState } from 'react';
import { useAcademic } from '../../context/academic-context';
import useAcademicReport from '../../hooks/useAcademicReport';
import AcademicTranscript from '../../components/AcademicTranscript';
export default function StudentGrades() {
    const { semesters } = useAcademic();
    const [semester, setSemester] = useState('');
    const { report: current, error, refresh } = useAcademicReport('/registration/grades', semester);
    return <div><div className="academic-page-header"><div><h1>Kết quả học tập</h1></div><label className="semester-choice">Xem kết quả<select className="form-select" value={semester} onChange={e => { setSemester(e.target.value); }}><option value="">Tất cả học kỳ</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.semester_name}</option>)}</select></label></div>
        {error && <div className="alert alert-danger" role="alert">{error}<button className="btn btn-sm btn-outline-danger ms-3" onClick={refresh}>Thử lại</button></div>}
        {current ? <AcademicTranscript key={semester} report={current} studentView semesterLabel={semesters.find(s => String(s.id) === semester)?.semester_name} onRefresh={refresh} /> : !error && <div className="empty-state" role="status"><span className="spinner-border text-primary" /> Đang tải bảng điểm…</div>}
    </div>;
}
