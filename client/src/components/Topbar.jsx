import React, { useState, useEffect } from 'react';
import { useAcademic } from '../context/academic-context';

const Topbar = () => {
    const { semester, period, loading, error } = useAcademic();
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
            setCurrentTime(`${dateStr} • ${timeStr}`);
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="app-topbar">
            <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary text-white rounded-pill px-3 py-1.5 fw-bold" style={{ fontSize: '0.8rem', letterSpacing: '0.02em' }}>
                    <i className="bi bi-mortarboard-fill me-1.5"></i> EDUPORTAL
                </span>
                <span className="text-secondary small fw-medium d-none d-md-inline">
                    Hệ Thống Đào Tạo & Đăng Ký Tín Chỉ
                </span>
            </div>

            <div className="topbar-right-controls">
                {currentTime && (
                    <span className="text-muted small fw-semibold d-none d-lg-inline-block">
                        <i className="bi bi-clock me-1 text-secondary"></i>{currentTime}
                    </span>
                )}
                <div className="academic-semester-pill">
                    <i className="bi bi-calendar3"></i>
                    <span>{semester?.semester_name || 'Chưa chọn học kỳ'}</span>
                </div>
                <div className={`d-flex align-items-center gap-2 px-3 py-1 border rounded-pill ${period ? 'bg-success-subtle' : 'bg-light'}`}>
                    {period && <span className="pulse-dot"></span>}
                    <span className={`fw-bold small ${period ? 'text-success' : 'text-secondary'}`}>{loading ? 'Đang tải...' : error ? 'Không rõ trạng thái ĐKHP' : period ? 'Cổng ĐKHP Mở' : 'Cổng ĐKHP Đóng'}</span>
                </div>
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => window.location.reload()}
                    title="Làm mới dữ liệu trang"
                >
                    <i className="bi bi-arrow-clockwise"></i>
                </button>
            </div>
        </header>
    );
};

export default Topbar;
