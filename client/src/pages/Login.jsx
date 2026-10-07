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
        setError(''); setIsLoading(true);
        try {
            const result = await login(name, pass);
            if (result.success) navigate(({ ADMIN: '/admin', LECTURER: '/lecturer', STUDENT: '/student' })[result.role] || '/');
            else setError(result.message || 'Không thể đăng nhập. Vui lòng thử lại.');
        } catch { setError('Không thể kết nối. Vui lòng thử lại sau.'); }
        finally { setIsLoading(false); }
    };
    return <div className="login-page">
        <section className="login-story" aria-label="Giới thiệu EduPortal">
            <div className="brand-logo-wrapper"><span className="brand-icon"><i className="bi bi-mortarboard-fill" aria-hidden="true" /></span><span><span className="brand-name">EduPortal<span className="brand-dot">.</span></span><span className="brand-sub">Cổng quản lý đào tạo</span></span></div>
            <div className="login-story-content">
                <span className="eyebrow login-eyebrow"><span className="status-dot" /> KHÔNG GIAN ĐÀO TẠO SỐ</span>
                <h1>Một cổng kết nối.<br /><span>Trọn hành trình<br />học tập.</span></h1>
                <p>Quản lý đào tạo, đăng ký học phần và theo dõi kết quả học tập trong một không gian thống nhất.</p>
                <div className="login-journey" aria-label="Các chức năng đào tạo">
                    <div><span className="journey-icon"><i className="bi bi-journal-plus" /></span><span><strong>Chủ động kế hoạch học tập</strong><small>Đăng ký học phần & thời khóa biểu</small></span><i className="bi bi-arrow-up-right" aria-hidden="true" /></div>
                    <div><span className="journey-icon"><i className="bi bi-bar-chart" /></span><span><strong>Theo dõi từng bước tiến</strong><small>Bảng điểm & kết quả tích lũy</small></span><i className="bi bi-arrow-up-right" aria-hidden="true" /></div>
                    <div><span className="journey-icon"><i className="bi bi-buildings" /></span><span><strong>Kết nối công tác đào tạo</strong><small>Sinh viên, giảng viên & nhà trường</small></span><i className="bi bi-arrow-up-right" aria-hidden="true" /></div>
                </div>
            </div>
            <div className="login-story-footer"><span>Học tập. Kết nối. Phát triển.</span><span>EDUPORTAL / {new Date().getFullYear()}</span></div>
        </section>
        <main className="login-main">
            <div className="login-form-wrap">
                <span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
                <h2>Đăng nhập</h2><p className="login-intro">Sử dụng tài khoản được nhà trường cấp để truy cập cổng đào tạo.</p>
                {error && <div className="alert alert-danger" role="alert"><i className="bi bi-exclamation-circle me-2" />{error}</div>}
                <form onSubmit={event => { event.preventDefault(); signIn(username, password); }}>
                    <div className="mb-4"><label htmlFor="login-username" className="form-label">Tài khoản</label><div className="login-input"><i className="bi bi-person" aria-hidden="true" /><input id="login-username" className="form-control" placeholder="Mã sinh viên hoặc tên đăng nhập" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required disabled={isLoading} /></div></div>
                    <div className="mb-4"><label htmlFor="login-password" className="form-label">Mật khẩu</label><div className="login-input"><i className="bi bi-lock" aria-hidden="true" /><input id="login-password" className="form-control" type={showPassword ? 'text' : 'password'} placeholder="Nhập mật khẩu của bạn" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={isLoading} /><button type="button" className="password-toggle" onClick={() => setShowPassword(previous => !previous)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}><i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} /></button></div></div>
                    <button type="submit" className="btn btn-primary login-submit" disabled={isLoading}>{isLoading ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Đang xác thực…</> : <>Đăng nhập <i className="bi bi-arrow-right" aria-hidden="true" /></>}</button>
                </form>
                <div className="login-help"><i className="bi bi-info-circle" aria-hidden="true" /><span>Nếu bạn quên mật khẩu, vui lòng liên hệ phòng đào tạo để được hỗ trợ.</span></div>
                {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true' && <div className="demo-login"><span className="eyebrow">TÀI KHOẢN THỬ NGHIỆM</span><div className="d-flex gap-2 flex-wrap mt-2">{[['admin', 'Quản trị viên'], ['gv_thuan', 'Giảng viên'], ['74dctt25001', 'Sinh viên']].map(([name, label]) => <button key={name} className="btn btn-outline-secondary btn-sm" disabled={isLoading} onClick={() => { setUsername(name); setPassword('123456'); signIn(name, '123456'); }}>{label}</button>)}</div></div>}
            </div>
            <footer className="login-footer">© {new Date().getFullYear()} EduPortal · Cổng đào tạo trực tuyến</footer>
        </main>
    </div>;
}
