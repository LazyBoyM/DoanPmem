import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';
import { useAuth } from '../../context/auth-context';

const formatNumber = value => Number(value || 0).toLocaleString('vi-VN');
const gradeGroups = [
    { label: 'A', detail: 'Giỏi / Xuất sắc', keys: ['A'], color: '#087f74' },
    { label: 'B+ / B', detail: 'Khá', keys: ['B+', 'B'], color: '#4b9f92' },
    { label: 'C+ / C', detail: 'Trung bình', keys: ['C+', 'C'], color: '#82b3ac' },
    { label: 'D+ / D', detail: 'Trung bình yếu', keys: ['D+', 'D'], color: '#d2a65c' },
    { label: 'F', detail: 'Chưa đạt', keys: ['F'], color: '#bc6870' },
];
export default function AdminDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [downloadError, setDownloadError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    useEffect(() => {
        const abort = new AbortController();
        Promise.all([axiosClient.get('/admin/stats', { signal: abort.signal }), axiosClient.get('/reports/academic-stats', { signal: abort.signal })])
            .then(([stats, reports]) => { if (!abort.signal.aborted) { setData({ stats: stats.stats, reports: reports.data }); setError(''); } })
            .catch(err => { if (!abort.signal.aborted) setError(err.response?.data?.message || 'Không tải được dữ liệu tổng quan. Vui lòng thử lại.'); });
        return () => abort.abort();
    }, [refreshKey]);
    const exportStudents = async () => {
        setDownloading(true); setDownloadError('');
        try { await downloadFile('/reports/export-students-excel', 'Danh_sach_sinh_vien.xlsx'); }
        catch { setDownloadError('Không thể xuất danh sách sinh viên. Vui lòng thử lại.'); }
        finally { setDownloading(false); }
    };
    const stats = data?.stats;
    const reports = data?.reports;
    const grades = gradeGroups.map(group => ({ ...group, count: group.keys.reduce((sum, key) => sum + (reports?.gradeDistribution[key] || 0), 0) }));
    const gradedCount = reports?.gradedCount || 0;
    const cards = [
        { label: 'Sinh viên', value: stats?.total_students, icon: 'bi-people', note: 'Hồ sơ trong hệ thống', path: '/admin/students', color: 'teal' },
        { label: 'Giảng viên', value: stats?.total_lecturers, icon: 'bi-person-workspace', note: 'Đội ngũ giảng dạy', path: '/admin/lecturers', color: 'blue' },
        { label: 'Môn học', value: stats?.total_subjects, icon: 'bi-journal-bookmark', note: 'Danh mục đào tạo', path: '/admin/subjects', color: 'amber' },
        { label: 'Lớp học phần', value: stats?.total_classes, icon: 'bi-collection', note: 'Tổng số lớp trong hệ thống', path: '/admin/classes', color: 'violet' },
    ];
    const actions = [
        { path: '/admin/students', icon: 'bi-person-plus', label: 'Hồ sơ sinh viên', note: 'Tra cứu & cập nhật hồ sơ' },
        { path: '/admin/classes', icon: 'bi-collection', label: 'Lớp học phần', note: 'Mở lớp & phân công giảng dạy' },
        { path: '/admin/semesters', icon: 'bi-calendar3', label: 'Đợt đăng ký', note: 'Thiết lập học kỳ & thời gian' },
    ];
    return <div className="admin-pane dashboard-page">
        <div className="dashboard-heading"><div><span className="eyebrow">TỔNG QUAN ĐÀO TẠO</span><h1>Xin chào, {user.full_name || user.username}<span className="welcome-dot">.</span></h1><p>Nắm bắt hoạt động đào tạo và quản lý công việc trong ngày.</p></div><button className="btn btn-primary" onClick={exportStudents} disabled={downloading}><i className={`bi ${downloading ? 'bi-hourglass-split' : 'bi-download'}`} />{downloading ? 'Đang xuất…' : 'Xuất danh sách sinh viên'}</button></div>
        {error && <div className="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert"><span>{error}</span><button className="btn btn-outline-danger btn-sm ms-auto" onClick={() => setRefreshKey(previous => previous + 1)}>Thử lại</button></div>}
        {downloadError && <div className="alert alert-danger" role="alert">{downloadError}</div>}
        <div className="dashboard-kpis">{cards.map(card => <Link to={card.path} key={card.label} className="metric-card"><div className="metric-top"><span>{card.label}</span><span className={`metric-icon ${card.color}`}><i className={`bi ${card.icon}`} /></span></div><strong className="metric-value">{stats ? formatNumber(card.value) : '—'}</strong><div className="metric-bottom"><span>{card.note}</span><i className="bi bi-arrow-up-right" aria-hidden="true" /></div></Link>)}</div>
        <div className="dashboard-grid">
            <section className="card dashboard-panel grade-panel"><div className="panel-heading"><div><span className="eyebrow">KẾT QUẢ HỌC TẬP</span><h2>Phân bố phổ điểm</h2></div><span className="badge-soft-primary">Thang điểm A – F</span></div><p className="panel-description">Kết quả học phần đã được đánh giá trên toàn trường.</p>
                {!data ? <div className="empty-state"><span className="spinner-border spinner-border-sm text-primary" /><span>{error ? 'Dữ liệu chưa khả dụng' : 'Đang tải kết quả…'}</span></div> : <>
                    <div className="grade-summary"><div><strong>{gradedCount ? `${reports.passRate}%` : '—'}</strong><span>Tỷ lệ đạt học phần</span></div><div><strong>{formatNumber(gradedCount)}</strong><span>Kết quả đã đánh giá</span></div></div>
                    <div className="grade-stacked" aria-hidden="true">{grades.map(grade => <span key={grade.label} style={{ width: `${gradedCount ? grade.count / gradedCount * 100 : 0}%`, background: grade.color }} />)}</div>
                    <div className="grade-rows">{grades.map(grade => <div className="grade-row" key={grade.label}><div className="grade-name"><span className="grade-dot" style={{ background: grade.color }} /><strong>{grade.label}</strong><span>{grade.detail}</span></div><div className="grade-track" aria-hidden="true"><span style={{ width: `${gradedCount ? grade.count / gradedCount * 100 : 0}%`, background: grade.color }} /></div><strong className="grade-count">{formatNumber(grade.count)}</strong></div>)}</div>
                    {!gradedCount && <p className="text-muted small mt-3 mb-0">Chưa có kết quả học tập được đánh giá.</p>}
                </>}
            </section>
            <section className="card dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">KHÔNG GIAN LÀM VIỆC</span><h2>Truy cập nhanh</h2></div><i className="bi bi-arrow-up-right text-muted" aria-hidden="true" /></div><p className="panel-description">Các công việc quản lý thường dùng.</p><div className="quick-action-list">{actions.map(action => <Link key={action.path} to={action.path} className="quick-action"><span className="action-icon"><i className={`bi ${action.icon}`} /></span><span><strong>{action.label}</strong><small>{action.note}</small></span><i className="bi bi-chevron-right" aria-hidden="true" /></Link>)}</div><div className="registration-summary"><span className="summary-icon"><i className="bi bi-journal-check" /></span><div><strong>{stats ? formatNumber(stats.total_enrollments) : '—'} lượt đăng ký</strong><span>Đăng ký học phần đang có hiệu lực</span></div></div></section>
        </div>
        <section className="card dashboard-panel occupancy-panel"><div className="panel-heading"><div><span className="eyebrow">LỚP HỌC PHẦN</span><h2>Tình hình sĩ số</h2></div><Link to="/admin/classes" className="text-link">Xem tất cả <i className="bi bi-arrow-right" /></Link></div><div className="table-container-responsive mt-3"><table className="table-modern occupancy-table"><thead><tr><th>Lớp học phần</th><th>Giảng viên</th><th>Sĩ số</th><th>Tỷ lệ lấp đầy</th></tr></thead><tbody>{(reports?.classOccupancy || []).slice(0, 5).map(cls => <tr key={cls.id}><td><strong>{cls.subject_name || cls.class_code}</strong><small className="d-block text-muted mt-1">{cls.class_code}</small></td><td>{cls.lecturer_name || 'Chưa phân công'}</td><td><strong>{cls.current_students}</strong><span className="text-muted"> / {cls.max_students}</span></td><td><div className="occupancy-value"><div className="grade-track"><span style={{ width: `${Math.min(100, Math.max(0, cls.occupancy_rate))}%` }} /></div><span>{cls.occupancy_rate}%</span></div></td></tr>)}{!reports?.classOccupancy?.length && <tr><td colSpan={4} className="text-center text-muted py-4">{data ? 'Chưa có lớp học phần.' : error ? 'Dữ liệu chưa khả dụng.' : 'Đang tải lớp học phần…'}</td></tr>}</tbody></table></div></section>
    </div>;
}
