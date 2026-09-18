import React, { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setIsLoading(true);

        const res = await login(username, password);
        setIsLoading(false);

        if (res.success) {
            switch (res.role) {
                case 'ADMIN': navigate('/admin'); break;
                case 'LECTURER': navigate('/lecturer'); break;
                case 'STUDENT': navigate('/student'); break;
                default: navigate('/');
            }
        } else {
            setError(res.message);
        }
    };

    const handleQuickLogin = async (user, pass) => {
        setUsername(user);
        setPassword(pass);
        setError('');
        setIsLoading(true);
        const res = await login(user, pass);
        setIsLoading(false);
        if (res.success) {
            switch (res.role) {
                case 'ADMIN': navigate('/admin'); break;
                case 'LECTURER': navigate('/lecturer'); break;
                case 'STUDENT': navigate('/student'); break;
                default: navigate('/');
            }
        } else {
            setError(res.message);
        }
    };

    return (
        <div
            className="d-flex align-items-center justify-content-center min-vh-100 position-relative p-3"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
        >
            {/* Background Ambient Glows */}
            <div
                style={{
                    position: 'absolute',
                    top: '15%',
                    left: '20%',
                    width: '320px',
                    height: '320px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                    pointerEvents: 'none'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '15%',
                    right: '20%',
                    width: '350px',
                    height: '350px',
                    background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    pointerEvents: 'none'
                }}
            />

            <div className="container position-relative" style={{ maxWidth: '480px', zIndex: 1 }}>
                <div
                    className="card border-0 shadow-2xl rounded-4 overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.96)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* Brand Header */}
                    <div
                        className="text-white text-center pt-5 pb-4 px-4 position-relative"
                        style={{
                            background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #06b6d4 100%)'
                        }}
                    >
                        <div
                            className="d-inline-flex align-items-center justify-content-center mb-3 rounded-circle shadow"
                            style={{
                                width: '64px',
                                height: '64px',
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}
                        >
                            <i className="bi bi-mortarboard-fill fs-1 text-white"></i>
                        </div>
                        <h2 className="fw-extrabold mb-1" style={{ letterSpacing: '-0.03em' }}>EduPortal</h2>
                        <p className="small mb-0 text-white-70">Hệ Thống Quản Lý Đào Tạo & Đăng Ký Học Phần</p>
                    </div>

                    <div className="card-body p-4 p-md-5">
                        {error && (
                            <div className="alert alert-danger border-0 rounded-3 shadow-sm d-flex align-items-center gap-2 mb-4">
                                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-secondary">Tài Khoản Đăng Nhập</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0 text-muted px-3">
                                        <i className="bi bi-person fs-5"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control bg-light border-start-0 py-2 fs-6"
                                        placeholder="Mã SV, Mã GV hoặc Tên đăng nhập"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-bold text-secondary">Mật Khẩu</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0 text-muted px-3">
                                        <i className="bi bi-lock fs-5"></i>
                                    </span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-control bg-light border-start-0 border-end-0 py-2 fs-6"
                                        placeholder="Nhập mật khẩu..."
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="input-group-text bg-light border-start-0 text-muted px-3"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary w-100 py-3 fw-bold rounded-3 mb-4 shadow-sm text-uppercase"
                                type="submit"
                                disabled={isLoading}
                                style={{ letterSpacing: '0.04em' }}
                            >
                                {isLoading ? (
                                    <span>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Đang xác thực...
                                    </span>
                                ) : (
                                    <span>
                                        <i className="bi bi-box-arrow-in-right me-2"></i> Đăng Nhập Hệ Thống
                                    </span>
                                )}
                            </button>
                        </form>

                        {/* Quick Demo Test Buttons */}
                        {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true' && (
                        <div className="text-center pt-2 border-top">
                            <p className="text-muted small fw-semibold mb-2">
                                <i className="bi bi-lightning-charge-fill text-warning me-1"></i>
                                Đăng nhập nhanh 1-Click (Tài khoản thử nghiệm):
                            </p>
                            <div className="d-flex justify-content-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm px-3 py-2 d-flex align-items-center gap-2"
                                    onClick={() => handleQuickLogin('admin', '123456')}
                                >
                                    <i className="bi bi-shield-check"></i>
                                    <span>Admin</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-success btn-sm px-3 py-2 d-flex align-items-center gap-2"
                                    onClick={() => handleQuickLogin('gv_thuan', '123456')}
                                >
                                    <i className="bi bi-person-workspace"></i>
                                    <span>Giảng viên</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-info btn-sm px-3 py-2 d-flex align-items-center gap-2"
                                    onClick={() => handleQuickLogin('74dctt25001', '123456')}
                                >
                                    <i className="bi bi-backpack"></i>
                                    <span>Sinh viên</span>
                                </button>
                            </div>
                        </div>
                        )}
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="text-center mt-3 text-white-50 small">
                    © 2026 EduPortal • Cổng Quản Lý Đào Tạo Trực Tuyến
                </div>
            </div>
        </div>
    );
};

export default Login;
