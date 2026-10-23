import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const signIn = async (name, pass) => {
        if (isLoading) return;
        setError('');
        setIsLoading(true);
        try {
            const result = await login(name, pass);
            if (result.success) {
                navigate(({ ADMIN: '/admin', LECTURER: '/lecturer', STUDENT: '/student' })[result.role] || '/');
            } else {
                setError(result.message || 'Không thể đăng nhập. Vui lòng thử lại.');
            }
        } catch {
            setError('Không thể kết nối máy chủ. Vui lòng kiểm tra lại đường truyền.');
        } finally {
            setIsLoading(false);
        }
    };

    return <div className="login-page">
        <section className="login-story" aria-label="Giới thiệu EduPortal">
            <div className="brand-logo-wrapper">
                <span className="brand-icon"><i className="bi bi-mortarboard-fill" aria-hidden="true" /></span>
                <span>
                    <span className="brand-name">EduPortal<span className="brand-dot">.</span></span>
                    <span className="brand-sub">Hệ thống Quản lý Đào tạo</span>
                </span>
            </div>
            <div className="login-story-content">
                <h1>Cổng thông tin đào tạo<br /><span>Đăng ký tín chỉ & Quản lý điểm</span></h1>
                <p>Nền tảng hỗ trợ sinh viên đăng ký học phần, theo dõi tiến độ đào tạo và quản lý kết quả học tập dành cho nhà trường.</p>
            </div>
        </section>
        <main className="login-main">
            <div className="login-form-wrap">
                <h2>Đăng nhập</h2>
                <p className="login-intro">Nhập thông tin tài khoản để tiếp tục.</p>
                {error && <div className="alert alert-danger" role="alert"><i aria-hidden="true" className="bi bi-exclamation-circle me-2" />{error}</div>}
                <form onSubmit={event => { event.preventDefault(); signIn(username, password); }}>
                    <div className="mb-4">
                        <label htmlFor="login-username" className="form-label">Tài khoản</label>
                        <div className="login-input">
                            <i className="bi bi-person" aria-hidden="true" />
                            <input id="login-username" className="form-control" placeholder="Tên đăng nhập hoặc mã sinh viên" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required disabled={isLoading} />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="login-password" className="form-label">Mật khẩu</label>
                        <div className="login-input">
                            <i className="bi bi-lock" aria-hidden="true" />
                            <input id="login-password" className="form-control" type={showPassword ? 'text' : 'password'} placeholder="Nhập mật khẩu" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={isLoading} />
                            <button type="button" className="password-toggle" onClick={() => setShowPassword(previous => !previous)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}>
                                <i aria-hidden="true" className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary login-submit" disabled={isLoading}>
                        {isLoading ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang đăng nhập…</> : <>Đăng nhập <i className="bi bi-arrow-right" aria-hidden="true" /></>}
                    </button>
                </form>
                {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true' && <div className="demo-login">
                    <div className="nav-section-title px-0 pt-0">Đăng nhập nhanh theo vai trò</div>
                    <div className="d-flex gap-2 flex-wrap mt-2">
                        {[['admin', 'Quản trị viên', 'bi-shield-check'], ['gv_thuan', 'Giảng viên', 'bi-person-workspace'], ['74dctt25001', 'Sinh viên', 'bi-mortarboard']].map(([name, label, icon]) => (
                            <button key={name} className="btn btn-outline-secondary btn-sm" disabled={isLoading} onClick={() => { setUsername(name); setPassword('123456'); signIn(name, '123456'); }}>
                                <i className={`bi ${icon} me-1`} aria-hidden="true" />{label}
                            </button>
                        ))}
                    </div>
                </div>}
            </div>
            <footer className="login-footer">© {new Date().getFullYear()} EduPortal</footer>
        </main>
    </div>;
}
