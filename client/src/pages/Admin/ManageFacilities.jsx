import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import RecordWorkspace from '../../components/RecordWorkspace';
import RecordActions from '../../components/RecordActions';
import AccessibleDialog from '../../components/AccessibleDialog';
import LoadingState from '../../components/LoadingState';
import { useFeedback } from '../../context/feedback-context';

const types = { LECTURE: 'Lý thuyết', COMPUTER: 'Máy tính', LAB: 'Thí nghiệm' };
export default function ManageFacilities() {
    const { notify, confirm } = useFeedback();
    const [buildings, setBuildings] = useState([]), [rooms, setRooms] = useState([]);
    const [tab, setTab] = useState('rooms'), [buildingId, setBuildingId] = useState('');
    const [query, setQuery] = useState(''), [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [editor, setEditor] = useState(null), [form, setForm] = useState({}), [saving, setSaving] = useState(false);
    async function load(refresh = true) {
        if (refresh) { setLoading(true); setError(''); }
        try {
            const [b, r] = await Promise.all([axiosClient.get('/admin/buildings'), axiosClient.get('/admin/rooms')]);
            setBuildings(b.data); setRooms(r.data);
        } catch (err) { setError(err.response?.data?.message || 'Không tải được danh mục tòa và phòng.'); }
        finally { setLoading(false); }
    }
    useEffect(() => { Promise.resolve().then(() => load(false)); }, []);
    function open(resource, row) {
        setEditor({ resource, id: row?.id });
        setForm(row || (resource === 'rooms' ? { building_id: buildingId || buildings[0]?.id || '', room_code: '', room_name: '', capacity: 50, floor: 0, room_type: 'LECTURE', status: 'ACTIVE' } : { building_code: '', building_name: '', location: '', status: 'ACTIVE' }));
    }
    async function save(event) {
        event.preventDefault(); setSaving(true);
        try {
            const url = `/admin/${editor.resource}${editor.id ? `/${editor.id}` : ''}`;
            const res = await axiosClient[editor.id ? 'put' : 'post'](url, form);
            setEditor(null); notify(res.message, 'success'); await load();
        } catch (err) { notify(err.response?.data?.message || 'Không lưu được. Kiểm tra thông tin rồi thử lại.', 'danger'); }
        finally { setSaving(false); }
    }
    async function remove(resource, row) {
        if (!await confirm(`Xóa ${resource === 'rooms' ? 'phòng' : 'tòa'} ${row.label || row.building_code}? Dữ liệu đang được sử dụng sẽ được giữ lại.`)) return;
        try { const res = await axiosClient.delete(`/admin/${resource}/${row.id}`); notify(res.message, 'success'); await load(); }
        catch (err) { notify(err.response?.data?.message || 'Không thể xóa.', 'danger'); }
    }
    const visible = (tab === 'rooms' ? rooms : buildings).filter(row => (!status || row.status === status) &&
        (tab !== 'rooms' || !buildingId || String(row.building_id) === buildingId) &&
        `${row.label || row.building_code} ${row.room_name || row.building_name} ${row.location || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
    const field = (key, label, options = {}) => <label className="form-label d-block" key={key}>{label}<input className="form-control mt-1" value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} {...options} /></label>;
    return <RecordWorkspace filterTitle="Danh mục cơ sở vật chất" sheetTitle={tab === 'rooms' ? 'Danh sách phòng học' : 'Danh sách tòa nhà'} summary={`${visible.length} ${tab === 'rooms' ? 'phòng' : 'tòa'}`} heading={<div className="academic-page-header"><div><h1>Tòa nhà & phòng học</h1><p>Quản lý địa điểm, sức chứa và phòng phục vụ xếp lịch.</p></div><button className="btn btn-primary" disabled={loading || Boolean(error) || (tab === 'rooms' && !buildings.length)} onClick={() => open(tab)}><i className="bi bi-plus-lg me-2" aria-hidden="true" />{tab === 'rooms' ? 'Thêm phòng' : 'Thêm tòa nhà'}</button></div>} filters={<>
        <div className="d-flex gap-2" role="group" aria-label="Loại danh mục">{[['rooms', 'Phòng học'], ['buildings', 'Tòa nhà']].map(([key, label]) => <button key={key} className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={tab === key} onClick={() => { setTab(key); setQuery(''); }}>{label}</button>)}</div>
        <label className="form-label">Tìm mã hoặc tên<input className="form-control mt-1" type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
        {tab === 'rooms' && <label className="form-label">Tòa nhà<select className="form-select mt-1" value={buildingId} onChange={e => setBuildingId(e.target.value)}><option value="">Tất cả tòa nhà</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.building_code} · {b.building_name}</option>)}</select></label>}
        <label className="form-label">Trạng thái<select className="form-select mt-1" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Ngừng sử dụng</option></select></label>
        <details className="facility-rules"><summary>Quy tắc xếp phòng</summary><p>Sĩ số tối đa không vượt sức chứa. Phòng và tòa phải đang sử dụng. Không trùng ngày, tiết và tuần học trong cùng học kỳ.</p><p>Phòng còn lịch không thể xóa hoặc ngừng sử dụng. Đổi phòng cho lớp tại mục Lớp học phần.</p></details>
    </>}>
        {tab === 'rooms' && rooms.some(r => r.needs_review) && <p className="facility-import-note">Phòng chuyển đổi từ lịch cũ: sức chứa tạm lấy theo sĩ số tối đa đã xếp; loại phòng và tầng dùng giá trị mặc định. Hãy chỉnh sửa để xác nhận thông tin và gắn vào tòa nhà thực tế.</p>}
        {loading ? <div className="p-4"><LoadingState label="Đang tải danh mục" /></div> : error ? <div className="alert alert-danger m-3" role="alert">{error}<button className="btn btn-outline-danger ms-2" onClick={() => load()}>Thử lại</button></div> : <div className="table-responsive"><table className="table table-modern align-middle mb-0"><thead><tr><th scope="col">{tab === 'rooms' ? 'Phòng / tòa' : 'Tòa nhà'}</th><th scope="col">{tab === 'rooms' ? 'Sức chứa / loại' : 'Địa điểm'}</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><th scope="row"><strong>{row.label || row.building_code}</strong><small className="d-block text-secondary fw-normal">{row.room_name || row.building_name}</small>{tab === 'rooms' && <small className="d-block text-secondary fw-normal">{row.needs_review ? 'Chờ xác nhận tòa / tầng' : `${row.building_name} · Tầng ${row.floor}`}</small>}</th><td>{tab === 'rooms' ? <><strong>{row.capacity} chỗ</strong><small className="d-block text-secondary">{row.needs_review ? 'Thông tin chuyển đổi' : types[row.room_type]}</small></> : <>{row.location || 'Chưa ghi địa chỉ'}<small className="d-block text-secondary">{row.room_count} phòng</small></>}</td><td><span className={`badge ${row.status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>{row.status === 'ACTIVE' ? 'Đang sử dụng' : 'Ngừng sử dụng'}</span>{tab === 'rooms' && row.building_status !== 'ACTIVE' && <small className="d-block text-danger">Tòa ngừng sử dụng</small>}</td><td><RecordActions label={row.label || row.building_code}><button className="btn btn-sm btn-outline-primary" onClick={() => open(tab, row)}>Chỉnh sửa</button><button className="btn btn-sm btn-outline-danger" onClick={() => remove(tab, row)}>Xóa</button></RecordActions></td></tr>)}</tbody></table>{!visible.length && <div className="empty-state"><strong>{query || status || buildingId ? 'Không có kết quả phù hợp' : `Chưa có ${tab === 'rooms' ? 'phòng học' : 'tòa nhà'}`}</strong><span>{tab === 'rooms' && !buildings.length ? 'Thêm tòa nhà trước, sau đó tạo phòng trong tòa.' : 'Thêm bản ghi hoặc thay đổi bộ lọc để tiếp tục.'}</span></div>}</div>}
        {editor && <AccessibleDialog className="record-editor" onClose={() => { if (!saving) setEditor(null); }} label="Thông tin cơ sở vật chất"><form className="modal-content border-0" onSubmit={save}><div className="modal-header"><h2 className="modal-title h5">{editor.id ? 'Chỉnh sửa' : 'Thêm'} {editor.resource === 'rooms' ? 'phòng học' : 'tòa nhà'}</h2><button className="icon-button" type="button" disabled={saving} aria-label="Đóng biểu mẫu" onClick={() => setEditor(null)}><i className="bi bi-x-lg" aria-hidden="true" /></button></div><div className="modal-body"><fieldset disabled={saving}>
            {editor.resource === 'rooms' ? <>
                <label className="form-label d-block">Tòa nhà<select className="form-select mt-1" required value={form.building_id} onChange={e => setForm({ ...form, building_id: e.target.value })}><option value="">Chọn tòa nhà</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.building_code} · {b.building_name}{b.status !== 'ACTIVE' ? ' (ngừng sử dụng)' : ''}</option>)}</select></label>
                {field('room_code', 'Mã phòng', { required: true, maxLength: 30 })}{field('room_name', 'Tên phòng', { required: true, maxLength: 100 })}
                <div className="row"><div className="col-6">{field('capacity', 'Sức chứa (chỗ)', { type: 'number', required: true, min: 1, max: 1000 })}</div><div className="col-6">{field('floor', 'Tầng', { type: 'number', required: true, min: -5, max: 100 })}</div></div>
                <label className="form-label d-block">Loại phòng<select className="form-select mt-1" value={form.room_type} onChange={e => setForm({ ...form, room_type: e.target.value })}>{Object.entries(types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            </> : <>{field('building_code', 'Mã tòa nhà', { required: true, maxLength: 30 })}{field('building_name', 'Tên tòa nhà', { required: true, maxLength: 100 })}{field('location', 'Địa chỉ / khu vực', { maxLength: 200 })}</>}
            <label className="form-label d-block">Trạng thái<select className="form-select mt-1" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Ngừng sử dụng</option></select></label>
            <p className="small text-secondary mb-0">Mã dùng chữ Latin, số, dấu chấm, gạch ngang hoặc gạch dưới. {editor.resource === 'rooms' && 'Mã phòng không được trùng trong cùng tòa.'}</p>
        </fieldset></div><div className="modal-footer"><button className="btn btn-outline-secondary" type="button" disabled={saving} onClick={() => setEditor(null)}>Hủy</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thông tin'}</button></div></form></AccessibleDialog>}
    </RecordWorkspace>;
}
