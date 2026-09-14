import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import axios from 'axios';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        students: 0,
        lecturers: 0,
        classes: 0,
        subjects: 0,
        enrollments: 0
    });
    const [academicStats, setAcademicStats] = useState(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, reportRes] = await Promise.all([
                    axiosClient.get('/admin/stats'),
                    axiosClient.get('/reports/academic-stats')
                ]);

                if (statsRes.success) {
                    const s = statsRes.stats;
                    setStats({
                        students: s.total_students,
                        lecturers: s.total_lecturers,
                        subjects: s.total_subjects,
                        classes: s.total_classes,
                        enrollments: s.total_enrollments || 0
                    });
                }

                if (reportRes.success) {
                    setAcademicStats(reportRes.stats);
                }
            } catch (err) {
                console.error('Lỗi lấy dữ liệu admin dashboard:', err);
            }
        };

        fetchDashboardData();
    }, []);

    const handleExportExcel = async () => {
        setDownloading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/reports/export-students-excel', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Bao_cao_danh_sach_sinh_vien.xlsx');
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            console.error('Lỗi khi xuất file Excel:', err);
            alert('Lỗi khi xuất file Excel. Vui lòng kiểm tra lại server.');
        } finally {
            setDownloading(false);
        }
    };

    const renderGradeDistribution = () => {
        if (!academicStats || !academicStats.grade_distribution) {
            return <div className="text-muted small py-3">Đang cập nhật dữ liệu đánh giá...</div>;
        }

        const dist = academicStats.grade_distribution;
        const totalPass = (dist.A || 0) + (dist['B+'] || 0) + (dist.B || 0) + (dist['C+'] || 0) + (dist.C || 0) + (dist['D+'] || 0) + (dist.D || 0);
        const total = totalPass + (dist.F || 0);
        const passRate = total > 0 ? ((totalPass / total) * 100).toFixed(1) : '100';

        const gradeItems = [
            { grade: 'A (Giỏi/Xuất sắc)', count: dist.A || 0, color: '#10b981' },
            { grade: 'B+ & B (Khá)', count: (dist['B+'] || 0) + (dist.B || 0), color: '#3b82f6' },
            { grade: 'C+ & C (Trung bình)', count: (dist['C+'] || 0) + (dist.C || 0), color: '#64748b' },
            { grade: 'D+ & D (Trung bình yếu)', count: (dist['D+'] || 0) + (dist.D || 0), color: '#f59e0b' },
            { grade: 'F (Học lại)', count: dist.F || 0, color: '#ef4444' }
        ];

        return (
            <div>
                {/* Visual Progress Distribution */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between small text-muted mb-2">
                        <span>Phân bổ kết quả các học phần đã đánh giá:</span>
                        <span className="fw-bold text-dark">{total} bài thi</span>
                    </div>
                    <div className="progress" style={{ height: '14px', borderRadius: '10px' }}>
                        {gradeItems.map((item, idx) => {
                            const percent = total > 0 ? ((item.count / total) * 100) : 0;
                            return (
                                <div
                                    key={idx}
                                    className="progress-bar"
                                    style={{
                                        width: `${percent}%`,
                                        backgroundColor: item.color
                                    }}
                                    title={`${item.grade}: ${item.count} SV (${percent.toFixed(0)}%)`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Grade Detail Chips */}
                <div className="row g-2 mb-4">
                    {gradeItems.map((item, idx) => (
                        <div key={idx} className="col-sm-6">
                            <div className="d-flex align-items-center justify-content-between p-2 rounded-3 border bg-light">
                                <div className="d-flex align-items-center gap-2">
                                    <span 
                                        className="rounded-circle d-inline-block" 
                                        style={{ width: '10px', height: '10px', backgroundColor: item.color }}
                                    />
                                    <span className="small fw-semibold text-dark">{item.grade}</span>
                                </div>
                                <span className="badge bg-white text-dark border fw-bold">{item.count} SV</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Summary Stats */}
                <div className="d-flex justify-content-around text-center pt-3 border-top">
                    <div>
                        <span className="text-muted small">Tỷ lệ qua môn:</span>
                        <h3 className="fw-extrabold text-success mb-0">{passRate}%</h3>
                    </div>
                    <div className="vr"></div>
                    <div>
                        <span className="text-muted small">Tổng bài thi:</span>
                        <h3 className="fw-extrabold text-primary mb-0">{total}</h3>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-pane">
            {/* KPI Metric Cards */}
            <div className="row g-3 mb-4">
                <div className="col-sm-6 col-xl-3">
                    <div className="kpi-card kpi-card-blue shadow-sm">
                        <div className="d-flex justify-content-between align-items-start">
                            <span className="kpi-title">Tổng Sinh Viên</span>
                            <i className="bi bi-people kpi-icon"></i>
                        </div>
                        <div className="kpi-value">{stats.students}</div>
                        <small className="opacity-75">
                            <i className="bi bi-check-circle me-1"></i>Hồ sơ đang theo học
                        </small>
                    </div>
                </div>

                <div className="col-sm-6 col-xl-3">
                    <div className="kpi-card kpi-card-amber shadow-sm">
                        <div className="d-flex justify-content-between align-items-start">
                            <span className="kpi-title">Đội Ngũ Giảng Viên</span>
                            <i className="bi bi-person-workspace kpi-icon"></i>
                        </div>
                        <div className="kpi-value">{stats.lecturers}</div>
                        <small className="opacity-75">
                            <i className="bi bi-mortarboard me-1"></i>GS / PGS / TS / ThS
                        </small>
                    </div>
                </div>

                <div className="col-sm-6 col-xl-3">
                    <div className="kpi-card kpi-card-teal shadow-sm">
                        <div className="d-flex justify-content-between align-items-start">
                            <span className="kpi-title">Danh Mục Môn Học</span>
                            <i className="bi bi-journal-bookmark kpi-icon"></i>
                        </div>
                        <div className="kpi-value">{stats.subjects}</div>
                        <small className="opacity-75">
                            <i className="bi bi-book me-1"></i>Đã ban hành đề cương
                        </small>
                    </div>
                </div>

                <div className="col-sm-6 col-xl-3">
                    <div className="kpi-card kpi-card-purple shadow-sm">
                        <div className="d-flex justify-content-between align-items-start">
                            <span className="kpi-title">Lớp Học Phần Mở</span>
                            <i className="bi bi-collection-play kpi-icon"></i>
                        </div>
                        <div className="kpi-value">{stats.classes}</div>
                        <small className="opacity-75">
                            <i className="bi bi-calendar2-check me-1"></i>Học kỳ hiện tại
                        </small>
                    </div>
                </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="card shadow-sm border-0 p-4 mb-4">
                <h6 className="fw-bold mb-3 text-secondary text-uppercase" style={{ letterSpacing: '0.05em' }}>
                    <i className="bi bi-lightning-charge-fill text-warning me-2"></i>Thao Tác Nhanh (Quick Actions)
                </h6>
                <div className="row g-3">
                    <div className="col-md-3">
                        <Link to="/admin/students" className="btn btn-outline-primary w-100 py-3 text-start d-flex align-items-center gap-3 rounded-3 shadow-xs">
                            <div className="p-2 bg-primary-subtle text-primary rounded-3">
                                <i className="bi bi-person-plus fs-4"></i>
                            </div>
                            <div>
                                <div className="fw-bold text-dark">Thêm Sinh Viên</div>
                                <div className="text-muted small">Cấp mới hồ sơ</div>
                            </div>
                        </Link>
                    </div>
                    <div className="col-md-3">
                        <Link to="/admin/classes" className="btn btn-outline-success w-100 py-3 text-start d-flex align-items-center gap-3 rounded-3 shadow-xs">
                            <div className="p-2 bg-success-subtle text-success rounded-3">
                                <i className="bi bi-plus-circle fs-4"></i>
                            </div>
                            <div>
                                <div className="fw-bold text-dark">Mở Lớp Học Phần</div>
                                <div className="text-muted small">Phân công giảng viên</div>
                            </div>
                        </Link>
                    </div>
                    <div className="col-md-3">
                        <Link to="/admin/semesters" className="btn btn-outline-info w-100 py-3 text-start d-flex align-items-center gap-3 rounded-3 shadow-xs">
                            <div className="p-2 bg-info-subtle text-info-emphasis rounded-3">
                                <i className="bi bi-toggle-on fs-4"></i>
                            </div>
                            <div>
                                <div className="fw-bold text-dark">Mở Cổng ĐKHP</div>
                                <div className="text-muted small">Cấu hình thời gian</div>
                            </div>
                        </Link>
                    </div>
                    <div className="col-md-3">
                        <button 
                            className="btn btn-outline-secondary w-100 py-3 text-start d-flex align-items-center gap-3 rounded-3 shadow-xs"
                            onClick={handleExportExcel}
                            disabled={downloading}
                        >
                            <div className="p-2 bg-secondary-subtle text-secondary rounded-3">
                                <i className="bi bi-file-earmark-excel fs-4"></i>
                            </div>
                            <div>
                                <div className="fw-bold text-dark">{downloading ? 'Đang xuất...' : 'Xuất Excel DSSV'}</div>
                                <div className="text-muted small">Báo cáo toàn trường</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Academic Charts & Excel Reports */}
            <div className="row g-4">
                <div className="col-lg-7">
                    <div className="card p-4 shadow-sm border-0 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold mb-0">
                                <i className="bi bi-pie-chart text-primary me-2"></i>Thống Kê Phổ Điểm Toàn Trường
                            </h5>
                            <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill">
                                Chuẩn tín chỉ (A - F)
                            </span>
                        </div>
                        <p className="text-muted small mb-4">
                            Tỷ lệ phân bố phổ điểm học tập của sinh viên theo chuẩn quy chế đào tạo
                        </p>
                        
                        {renderGradeDistribution()}
                    </div>
                </div>

                <div className="col-lg-5">
                    <div className="card p-4 shadow-sm border-0 h-100">
                        <h5 className="fw-bold mb-2">
                            <i className="bi bi-file-earmark-spreadsheet text-success me-2"></i>Báo Cáo & Dữ Liệu Đào Tạo
                        </h5>
                        <p className="text-muted small mb-4">
                            Trích xuất báo cáo tổng hợp phục vụ thanh tra, kiểm định chất lượng và báo cáo định kỳ
                        </p>
                        
                        <div className="d-grid gap-3">
                            <button 
                                className="btn btn-success py-3 d-flex align-items-center justify-content-center gap-2 fw-bold shadow-sm"
                                onClick={handleExportExcel}
                                disabled={downloading}
                            >
                                <i className="bi bi-file-earmark-excel fs-5"></i>
                                <span>{downloading ? 'Đang tạo file Excel...' : 'Tải File Excel Toàn Bộ Sinh Viên'}</span>
                            </button>

                            <div className="p-3 bg-light rounded-3 border small text-muted">
                                <div className="fw-bold text-dark mb-1">
                                    <i className="bi bi-info-circle text-primary me-1"></i> Nội dung báo cáo xuất ra:
                                </div>
                                <ul className="mb-0 ps-3">
                                    <li>Mã sinh viên, Họ và tên, Ngày sinh, Giới tính</li>
                                    <li>Lớp sinh hoạt, Khóa học, Chuyên ngành đào tạo</li>
                                    <li>Thông tin liên lạc: Số điện thoại, Email UTT</li>
                                    <li>Trạng thái tài khoản người dùng</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
