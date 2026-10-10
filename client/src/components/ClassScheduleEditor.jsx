import { useState } from 'react';
import AccessibleDialog from './AccessibleDialog';
import axiosClient from '../api/axiosClient';
import { useFeedback } from '../context/feedback-context';

export default function ClassScheduleEditor({ courseClass, rooms, onClose, onSaved }) {
    const { notify } = useFeedback();
    const empty = { day_of_week: 2, start_period: 1, total_periods: 3, week_from: 1, week_to: 16, room_id: '' };
    const [schedules, setSchedules] = useState(courseClass.schedules.length ? courseClass.schedules.map(s => ({ ...s })) : [{ ...empty }]);
    const [saving, setSaving] = useState(false);
    const available = rooms.filter(r => r.status === 'ACTIVE' && r.building_status === 'ACTIVE' && r.capacity >= courseClass.max_students);
    const change = (index, key, value) => setSchedules(rows => rows.map((r, i) => i === index ? { ...r, [key]: value } : r));
    async function save(event) {
        event.preventDefault(); setSaving(true);
        try {
            const res = await axiosClient.put(`/admin/classes/${courseClass.id}/schedule`, { schedules });
            notify(res.message, 'success'); onSaved(); onClose();
        } catch (err) { notify(err.response?.data?.message || 'Không lưu được lịch học.', 'danger'); }
        finally { setSaving(false); }
    }
    return <AccessibleDialog className="record-editor" label="Đổi lịch và phòng học" onClose={() => { if (!saving) onClose(); }}><form onSubmit={save} className="modal-content border-0"><header className="modal-header"><div><h2 className="modal-title h5">Đổi lịch & phòng học</h2><p className="small text-secondary mb-0">{courseClass.class_code} · Sĩ số tối đa {courseClass.max_students}</p></div><button type="button" className="icon-button" disabled={saving} aria-label="Đóng biểu mẫu" onClick={onClose}><i className="bi bi-x-lg" aria-hidden="true" /></button></header><div className="modal-body"><p>Chỉ hiển thị phòng đang sử dụng và đủ sức chứa. Lịch mới được kiểm tra với giảng viên và sinh viên đã đăng ký.</p><fieldset disabled={saving}>
        {schedules.map((s, index) => <fieldset className="schedule-editor-session" key={index}><legend className="h6">Buổi {index + 1}</legend><label className="form-label d-block">Phòng học<select className="form-select mt-1" required value={s.room_id || ''} onChange={e => change(index, 'room_id', e.target.value)}><option value="">Chọn phòng học</option>{available.map(r => <option key={r.id} value={r.id}>{r.label} · {r.capacity} chỗ</option>)}</select></label><div className="row g-3"><div className="col-6"><label className="form-label d-block">Ngày học<select className="form-select" value={s.day_of_week} onChange={e => change(index, 'day_of_week', e.target.value)}>{Array.from({ length: 7 }, (_, i) => <option key={i} value={i + 2}>{i === 6 ? 'Chủ nhật' : `Thứ ${i + 2}`}</option>)}</select></label></div>{[['start_period', 'Tiết bắt đầu', 1, 12], ['total_periods', 'Số tiết', 1, 12], ['week_from', 'Tuần đầu', 1, 53], ['week_to', 'Tuần cuối', 1, 53]].map(([key, label, min, max]) => <div className="col-6" key={key}><label className="form-label d-block">{label}<input className="form-control" type="number" min={min} max={max} required value={s[key]} onChange={e => change(index, key, e.target.value)} /></label></div>)}</div><button className="btn btn-sm btn-outline-danger mt-2" type="button" disabled={schedules.length === 1} onClick={() => setSchedules(rows => rows.filter((_, i) => i !== index))}>Bỏ buổi {index + 1}</button></fieldset>)}
        <button type="button" className="btn btn-outline-primary" onClick={() => setSchedules(rows => [...rows, { ...empty }])}><i className="bi bi-plus-lg me-2" aria-hidden="true" />Thêm buổi học</button>
        {!available.length && <p className="text-danger mt-3" role="status">Chưa có phòng phù hợp. Thêm hoặc điều chỉnh phòng trong Tòa nhà & phòng học.</p>}
    </fieldset></div><footer className="modal-footer"><button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={onClose}>Hủy</button><button className="btn btn-primary" type="submit" disabled={saving || !available.length}>{saving ? 'Đang lưu…' : 'Lưu lịch học'}</button></footer></form></AccessibleDialog>;
}
