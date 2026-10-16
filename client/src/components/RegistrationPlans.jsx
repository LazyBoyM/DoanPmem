import { useEffect, useState } from 'react';
import AccessibleDialog from './AccessibleDialog';
import LoadingState from './LoadingState';
import axiosClient from '../api/axiosClient';
import { downloadFile } from '../api/download';

export default function RegistrationPlans({ semester, onClose }) {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [version, setVersion] = useState(0);
    const [downloading, setDownloading] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        axiosClient.get(`/admin/semesters/${semester.id}/registration-plans`, { signal: controller.signal })
            .then(result => { if (!controller.signal.aborted) { setRows(result.data); setError(''); } })
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Không tải được danh sách đăng ký.'); });
        return () => controller.abort();
    }, [semester.id, version]);
    async function download() {
        setDownloading(true);
        try { await downloadFile(`/reports/export-registration-plans/${semester.id}`, `Dang_ky_${semester.semester_code}.xlsx`); }
        catch (err) { setError(err.response?.data?.message || 'Không xuất được Excel.'); }
        finally { setDownloading(false); }
    }
    const shown = (rows || []).filter(r => (!filter || r.status === filter) && `${r.student_code} ${r.full_name} ${r.class_name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
    return <AccessibleDialog className="record-editor student-profile-dialog" label="Tình trạng chốt đăng ký" onClose={onClose}><div className="modal-content border-0"><header className="modal-header"><div><h2 className="modal-title h5">Tình trạng đăng ký học phần</h2><p className="small mb-0">{semester.semester_name}</p></div><button className="btn-close" type="button" aria-label="Đóng" onClick={onClose} /></header><div className="modal-body">
        {error && <div className="alert alert-danger" role="alert">{error}<button className="btn btn-sm btn-outline-danger ms-2" onClick={() => setVersion(v => v + 1)}>Thử lại</button></div>}
        <div className="row g-3 mb-3"><div className="col-md-7"><label className="form-label d-block">Tìm sinh viên<input className="form-control" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã, họ tên hoặc lớp sinh hoạt" /></label></div><div className="col-md-5"><label className="form-label d-block">Trạng thái<select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}><option value="">Tất cả</option><option value="SUBMITTED">Đã chốt</option><option value="PENDING">Chưa chốt</option><option value="BELOW_MINIMUM">Chưa đủ tín chỉ</option><option value="OVER_MAXIMUM">Vượt giới hạn</option><option value="EMPTY">Chưa đăng ký</option></select></label></div></div>
        {!rows && !error ? <LoadingState label="Đang tải tình trạng đăng ký" /> : <><p className="small text-muted">{shown.length} / {rows?.length || 0} sinh viên. Danh sách bao gồm cả sinh viên chưa đăng ký; file Excel chứa toàn bộ học kỳ.</p><div className="table-container-responsive"><table className="table-modern"><thead><tr><th scope="col">Mã sinh viên</th><th scope="col">Họ tên</th><th scope="col">Lớp</th><th scope="col">Tín chỉ</th><th scope="col">Giới hạn</th><th scope="col">Trạng thái</th></tr></thead><tbody>{shown.map(row => <tr key={row.student_id}><td>{row.student_code}</td><td>{row.full_name}</td><td>{row.class_name}</td><td>{row.total_credits}</td><td>{row.min_credits ?? '—'}–{row.max_credits ?? '—'}</td><td>{row.status_label}</td></tr>)}{!shown.length && <tr><td colSpan="6">Không có sinh viên phù hợp.</td></tr>}</tbody></table></div></>}
    </div><footer className="modal-footer"><button className="btn btn-outline-secondary" onClick={onClose}>Đóng</button><button className="btn btn-primary" disabled={downloading || !rows} onClick={download}>{downloading ? 'Đang xuất…' : 'Xuất Excel toàn học kỳ'}</button></footer></div></AccessibleDialog>;
}
