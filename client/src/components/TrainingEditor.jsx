import { useState } from 'react';
import AccessibleDialog from './AccessibleDialog';
import axiosClient from '../api/axiosClient';
import { useFeedback } from '../context/feedback-context';

const definitions = {
    programs: [['program_code', 'Mã chương trình'], ['program_name', 'Tên chương trình'], ['department_id', 'Khoa', 'departments'], ['total_credits', 'Tổng tín chỉ', 'number', 1, 500], ['duration_years', 'Số năm đào tạo', 'number', 0.5, 10]],
    semesters: [['semester_code', 'Mã học kỳ'], ['semester_name', 'Tên học kỳ'], ['academic_year', 'Năm học'], ['start_date', 'Ngày bắt đầu', 'date'], ['end_date', 'Ngày kết thúc', 'date']],
    'registration-periods': [['name', 'Tên đợt'], ['start_time', 'Bắt đầu', 'datetime-local'], ['end_time', 'Kết thúc', 'datetime-local'], ['min_credits', 'Tín chỉ tối thiểu', 'number', 0, 100], ['max_credits', 'Tín chỉ tối đa', 'number', 1, 100]],
    classes: [['class_code', 'Mã lớp học phần'], ['lecturer_id', 'Giảng viên', 'lecturers'], ['max_students', 'Sĩ số tối đa', 'number', 1, 1000]],
    roles: [['role', 'Vai trò', 'roles']],
    accounts: [['username', 'Tên đăng nhập'], ['email', 'Email', 'email'], ['password', 'Mật khẩu', 'password']],
};
const titles = { roles: 'Phân quyền tài khoản', programs: 'Sửa chương trình đào tạo', semesters: 'Sửa học kỳ & năm học', 'registration-periods': 'Sửa đợt đăng ký', classes: 'Sửa thông tin lớp', accounts: 'Tạo tài khoản quản trị viên' };

export default function TrainingEditor({ resource, record, departments = [], lecturers = [], onClose, onSaved }) {
    const [form, setForm] = useState({ ...record });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const { notify } = useFeedback();
    async function save(event) {
        event.preventDefault(); setSaving(true); setError('');
        try {
            const response = resource === 'accounts' ? await axiosClient.post('/admin/admin-accounts', form) : await axiosClient.put(resource === 'roles' ? `/admin/users/${record.id}/role` : `/admin/${resource}/${record.id}`, form);
            notify(response.message, 'success'); await onSaved(); onClose();
        } catch (err) { setError(err.response?.data?.message || 'Không lưu được dữ liệu. Vui lòng thử lại.'); }
        finally { setSaving(false); }
    }
    return <AccessibleDialog className="record-editor" label={titles[resource]} onClose={() => { if (!saving) onClose(); }}><form onSubmit={save} className="modal-content border-0"><header className="modal-header"><h2 className="modal-title h5">{titles[resource]}</h2><button type="button" className="btn-close" aria-label="Đóng" disabled={saving} onClick={onClose} /></header><div className="modal-body">
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <fieldset disabled={saving}><div className="row g-3">{definitions[resource].map(([key, label, type = 'text', min, max]) => <div className="col-md-6" key={key}><label className="form-label d-block">{label}
            {['departments', 'lecturers', 'roles'].includes(type) ? <select className="form-select" required={type === 'departments'} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })}>{type === 'lecturers' && <option value="">Chưa phân công</option>}{(type === 'roles' ? [{ id: 'ADMIN', full_name: 'Quản trị viên' }, { id: 'LECTURER', full_name: 'Giảng viên' }, { id: 'STUDENT', full_name: 'Sinh viên' }] : type === 'departments' ? departments : lecturers).map(row => <option key={row.id} value={row.id}>{row.department_name || row.full_name}</option>)}</select> : <input className="form-control" required type={type} min={min} max={max} step={key === 'duration_years' ? '0.5' : undefined} minLength={type === 'password' ? 8 : undefined} value={type === 'date' ? String(form[key] || '').slice(0, 10) : type === 'datetime-local' ? String(form[key] || '').replace(' ', 'T').slice(0, 16) : form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />}
        </label></div>)}</div></fieldset>
        {resource === 'classes' && <p className="small text-muted mt-3">Sĩ số không được thấp hơn số người đã đăng ký hoặc vượt sức chứa phòng. Giảng viên được kiểm tra trùng lịch.</p>}
    </div><footer className="modal-footer"><button className="btn btn-outline-secondary" type="button" disabled={saving} onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></footer></form></AccessibleDialog>;
}

export function CurriculumEditor({ program, subjects, initial, onClose, onSaved }) {
    const [rows, setRows] = useState(initial.map(r => ({ subject_id: r.subject_id, recommended_semester: r.recommended_semester, is_required: Number(r.is_required) })));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const { notify } = useFeedback();
    const change = (index, key, value) => setRows(old => old.map((r, i) => i === index ? { ...r, [key]: Number(value) } : r));
    const total = rows.reduce((sum, r) => sum + Number(subjects.find(s => s.id === Number(r.subject_id))?.credits || 0), 0);
    async function save(e) {
        e.preventDefault(); setSaving(true); setError('');
        try {
            const result = await axiosClient.put(`/admin/programs/${program.id}/curriculum`, { subjects: rows });
            notify(result.message, 'success'); await onSaved(); onClose();
        } catch (err) { setError(err.response?.data?.message || 'Không lưu được chương trình môn học.'); }
        finally { setSaving(false); }
    }
    return <AccessibleDialog className="record-editor" label="Các môn trong chương trình" onClose={() => { if (!saving) onClose(); }}><form onSubmit={save} className="modal-content border-0"><header className="modal-header"><div><h2 className="modal-title h5">Môn học & phân bổ học kỳ</h2><p className="small mb-0">{program.program_name}</p></div><button type="button" className="btn-close" aria-label="Đóng" disabled={saving} onClick={onClose} /></header><div className="modal-body"><p>{total} / {program.total_credits} tín chỉ đã phân bổ. Chọn môn bắt buộc hoặc tự chọn và học kỳ gợi ý.</p>{error && <div className="alert alert-danger" role="alert">{error}</div>}<fieldset disabled={saving}>
        {rows.map((row, index) => <fieldset key={index} className="schedule-editor-session"><legend className="h6">Môn {index + 1}</legend><label className="form-label d-block">Môn học<select className="form-select" required value={row.subject_id} onChange={e => change(index, 'subject_id', e.target.value)}><option value="">Chọn môn học</option>{subjects.filter(s => s.id === Number(row.subject_id) || !rows.some(r => Number(r.subject_id) === s.id)).map(s => <option key={s.id} value={s.id}>{s.subject_code} · {s.subject_name} · {s.credits} TC</option>)}</select></label><div className="row g-3"><div className="col-6"><label className="form-label d-block">Học kỳ gợi ý<input className="form-control" type="number" min="1" max={Math.ceil(program.duration_years * 2)} required value={row.recommended_semester} onChange={e => change(index, 'recommended_semester', e.target.value)} /></label></div><div className="col-6"><label className="form-label d-block">Loại môn<select className="form-select" value={row.is_required} onChange={e => change(index, 'is_required', e.target.value)}><option value="1">Bắt buộc</option><option value="0">Tự chọn</option></select></label></div></div><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => setRows(old => old.filter((_, i) => i !== index))}>Bỏ môn {index + 1}</button></fieldset>)}
        {!rows.length && <p className="text-muted">Chưa có môn học trong chương trình.</p>}
        <button className="btn btn-outline-primary" type="button" disabled={rows.length >= subjects.length} onClick={() => setRows(old => [...old, { subject_id: '', recommended_semester: 1, is_required: 1 }])}>Thêm môn học</button>
    </fieldset></div><footer className="modal-footer"><button className="btn btn-outline-secondary" type="button" disabled={saving} onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu chương trình môn học'}</button></footer></form></AccessibleDialog>;
}
