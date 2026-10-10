import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';
import ClassSchedule from '../../components/ClassSchedule';
import LoadingState from '../../components/LoadingState';

const count = value => Number(value || 0).toLocaleString('vi-VN');
const letters = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [downloadError, setDownloadError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [version, setVersion] = useState(0);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        Promise.all([axiosClient.get('/admin/stats', { signal: controller.signal }), axiosClient.get('/reports/academic-stats', { signal: controller.signal })])
            .then(([stats, report]) => { if (!controller.signal.aborted) { setData({ stats: stats.stats, report: report.data }); setError(''); } })
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Không tải được dữ liệu tổng quan. Vui lòng thử lại.'); });
        return () => controller.abort();
    }, [version]);
    async function exportStudents() {
        setDownloading(true); setDownloadError('');
        try { await downloadFile('/reports/export-students-excel', 'Danh_sach_sinh_vien.xlsx'); }
        catch { setDownloadError('Không thể xuất danh sách sinh viên. Vui lòng thử lại.'); }
        finally { setDownloading(false); }
    }
    const stats = data?.stats;
    const report = data?.report;
    const allClasses = report?.classOccupancy || [];
    const filtered = allClasses.filter(c => (!status || c.status === status) && `${c.subject_name} ${c.class_code} ${c.lecturer_name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
    const shown = filtered.slice(0, 8);
    return <div className="dashboard-page">
        <div className="dashboard-heading"><div><h1>Tổng quan đào tạo</h1><p>Lớp học phần, đăng ký và kết quả trong hệ thống.</p></div><button className="btn btn-primary" disabled={downloading} onClick={exportStudents}><i className={`bi ${downloading ? 'bi-hourglass-split' : 'bi-download'}`} aria-hidden="true" />{downloading ? 'Đang xuất…' : 'Xuất danh sách sinh viên'}</button></div>
        {error && <div className="alert alert-danger" role="alert">{error}<button className="btn btn-outline-danger btn-sm ms-3" onClick={() => setVersion(v => v + 1)}>Thử lại</button></div>}
        {downloadError && <div className="alert alert-danger" role="alert">{downloadError}</div>}
        <div className="overview-layout"><aside><div className="overview-stats" aria-label="Số liệu toàn hệ thống">{[['/admin/students','Sinh viên',stats?.total_students],['/admin/lecturers','Giảng viên',stats?.total_lecturers],['/admin/subjects','Môn học',stats?.total_subjects],['/admin/classes','Lớp học phần',stats?.total_classes]].map(([path,label,value]) => <Link key={path} to={path}><strong>{stats ? count(value) : '—'}</strong><span>{label}</span></Link>)}<div className="overview-registration">{stats ? count(stats.total_enrollments) : '—'} lượt đăng ký đang có hiệu lực</div></div></aside><div className="overview-sheet">
        <div className="dashboard-workspace"><section>
            <div className="section-heading"><h2>Lớp học phần</h2><Link className="text-link" to="/admin/classes">Quản lý lớp<i className="bi bi-arrow-right" aria-hidden="true" /></Link></div>
            <div className="d-flex gap-2 mb-3"><label className="search-field"><i className="bi bi-search" aria-hidden="true" /><input aria-label="Tìm lớp trong tổng quan" placeholder="Tìm lớp, môn học hoặc giảng viên…" value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Lọc trạng thái lớp" className="form-select w-auto" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="OPEN">Đang mở</option><option value="CLOSED">Đã đóng</option></select></div>
            {!data && !error ? <LoadingState label="Đang tải lớp học phần" /> : <div className="table-container-responsive"><table className="table-modern dashboard-table"><thead><tr><th scope="col">Môn học / mã lớp</th><th scope="col">Giảng viên</th><th scope="col">Lịch học</th><th scope="col">Sĩ số</th><th scope="col">Trạng thái</th></tr></thead><tbody>{shown.map(c => <tr key={c.id}><td><strong>{c.subject_name || c.class_code}</strong><small>{c.class_code} · {c.credits} tín chỉ</small></td><td>{c.lecturer_name || 'Chưa phân công'}</td><td><ClassSchedule schedules={c.schedules} /></td><td>{c.current_students} / {c.max_students}</td><td><span className={c.status === 'OPEN' ? 'badge-soft-success' : 'result-pill neutral'}>{c.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}</span></td></tr>)}{!shown.length && <tr><td colSpan={5}><div className="empty-state"><i className="bi bi-search" aria-hidden="true" /><strong>{error ? 'Dữ liệu chưa khả dụng' : 'Không có lớp phù hợp'}</strong><span>{error ? 'Dùng nút Thử lại phía trên để tải dữ liệu.' : 'Thử đổi từ khóa hoặc trạng thái lọc.'}</span></div></td></tr>}</tbody></table><div className="table-footnote"><span>Hiển thị {shown.length} / {filtered.length} lớp phù hợp</span><span>Phạm vi toàn hệ thống</span></div></div>}
        </section><section className="dashboard-results"><h2>Kết quả học tập</h2><p>{report ? `${count(report.gradedCount)} kết quả đã đánh giá` : error ? 'Chưa tải được kết quả' : 'Đang tải kết quả…'}</p>{!data && !error ? <LoadingState compact label="Đang tải phổ điểm" /> : <>{letters.map(letter => <div key={letter}><div className="distribution-row"><span>{letter}</span><strong>{count(report?.gradeDistribution[letter])}</strong></div><div className="distribution-track" aria-hidden="true"><span style={{width:`${report?.gradedCount ? report.gradeDistribution[letter] / report.gradedCount * 100 : 0}%`}} /></div></div>)}<div className="result-summary"><span>Tỷ lệ đạt học phần</span><strong>{report?.gradedCount ? `${Number(report.passRate).toLocaleString('vi-VN')}%` : 'Chưa có điểm'}</strong></div></>}<Link className="text-link" to="/admin/grades">Nhập & khóa điểm<i className="bi bi-arrow-right" aria-hidden="true" /></Link></section></div></div></div>
        <div className="dashboard-actions"><Link to="/admin/students"><h2>Hồ sơ sinh viên</h2><p>Tra cứu thông tin, bảng điểm và tiến độ tín chỉ của từng sinh viên.</p><span className="text-link">Mở danh sách<i aria-hidden="true" className="bi bi-arrow-right" /></span></Link><Link to="/admin/semesters"><h2>Học kỳ & đăng ký</h2><p>Thiết lập học kỳ, thời hạn và giới hạn tín chỉ của đợt đăng ký.</p><span className="text-link">Quản lý kế hoạch<i aria-hidden="true" className="bi bi-arrow-right" /></span></Link><Link to="/admin/lecturers"><h2>Đội ngũ giảng dạy</h2><p>Quản lý hồ sơ giảng viên và điều phối phân công lớp học phần.</p><span className="text-link">Xem giảng viên<i aria-hidden="true" className="bi bi-arrow-right" /></span></Link></div>
    </div>;
}
