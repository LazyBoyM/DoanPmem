import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { useAcademic } from '../context/academic-context';
import useAcademicReport from '../hooks/useAcademicReport';
import AcademicTranscript from './AcademicTranscript';

export default function StudentDetails({ student, onClose, onEdit }) {
    const { semesters } = useAcademic();
    const [section, setSection] = useState('profile');
    const [semester, setSemester] = useState('');
    const { report, error, refresh } = useAcademicReport(`/academic/students/${student.id}/transcript`, semester);
    const fields = [
        ['Mã sinh viên', student.student_code], ['Họ và tên', student.full_name],
        ['Lớp sinh hoạt', student.class_name], ['Ngành / chương trình', student.program_name || report?.student.program_name],
        ['Khóa học', student.academic_year], ['Giới tính', student.gender],
        ['Ngày sinh', student.birth_date ? new Date(`${student.birth_date.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN') : null],
        ['Email', student.email], ['Điện thoại', student.phone], ['Địa chỉ', student.address],
        ['Tài khoản', Number(student.status) === 1 ? 'Đang hoạt động' : 'Đã khóa'],
    ];
    return <Modal show onHide={onClose} size="xl" centered scrollable aria-labelledby="student-detail-title" dialogClassName="student-details-dialog">
        <Modal.Header closeButton closeLabel="Đóng thông tin sinh viên"><span className="detail-avatar" aria-hidden="true">{student.full_name.split(/\s+/).slice(-2).map(n => n[0]).join('')}</span><div><span className="eyebrow">TRA CỨU TẠI DANH SÁCH SINH VIÊN</span><Modal.Title id="student-detail-title">{student.full_name}</Modal.Title><small className="text-muted">{student.student_code} · {student.class_name}</small><span className={`detail-account-status ${Number(student.status) === 1 ? 'active' : ''}`}>{Number(student.status) === 1 ? 'Tài khoản hoạt động' : 'Tài khoản đã khóa'}</span></div></Modal.Header>
        <Modal.Body><div className="details-navigation d-print-none"><div className="filter-tabs"><button aria-pressed={section === 'profile'} className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}><i className="bi bi-person-vcard me-2" />Thông tin sinh viên</button><button aria-pressed={section === 'academic'} className={section === 'academic' ? 'active' : ''} onClick={() => setSection('academic')}><i className="bi bi-graph-up me-2" />Điểm & tín chỉ</button></div>{section === 'academic' && <label className="semester-choice">Phạm vi bảng điểm<select className="form-select" value={semester} onChange={e => { setSemester(e.target.value); }}><option value="">Tất cả học kỳ</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.semester_name}</option>)}</select></label>}</div>
            {section === 'profile' ? <><dl className="student-detail-fields">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl><div className="profile-academic-summary"><div><span>GPA tích lũy · hệ 4</span><strong>{report?.cumulative.gpa4 ?? '—'}</strong></div><div><span>Tín chỉ đã đạt</span><strong>{report ? `${report.cumulative.passedCredits} / ${report.required_credits}` : '—'}</strong></div><div><span>Môn chưa đạt</span><strong>{report?.failed_subjects ?? '—'}</strong></div><button className="btn btn-outline-primary d-print-none" onClick={() => setSection('academic')}>Xem bảng điểm<i className="bi bi-arrow-right ms-2" /></button></div></> : report ? <AcademicTranscript key={semester} report={report} semesterLabel={semesters.find(s => String(s.id) === semester)?.semester_name} onRefresh={refresh} /> : !error && <div className="empty-state" role="status"><span className="spinner-border spinner-border-sm text-primary" />Đang tải điểm và tín chỉ…</div>}
            {error && <div className="alert alert-danger mt-3" role="alert">{error}<button className="btn btn-outline-danger btn-sm ms-3" onClick={refresh}>Thử lại</button></div>}
        </Modal.Body><Modal.Footer><button className="btn btn-outline-secondary" onClick={onClose}>Đóng</button><button className="btn btn-primary" onClick={() => onEdit(student)}><i className="bi bi-pencil-square me-2" />Chỉnh sửa hồ sơ</button></Modal.Footer>
    </Modal>;
}
