import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PageGuide from '../components/PageGuide';
import AcademicProvider from '../context/AcademicProvider';
import { useAuth } from '../context/auth-context';

export default function MainLayout() {
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const shell = useRef(null);
    useEffect(() => {
        if (!menuOpen) return;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const sidebar = shell.current.querySelector('#app-navigation');
        const focusFrame = requestAnimationFrame(() => sidebar.querySelector('.sidebar-close').focus());
        const onKey = event => {
            if (event.key === 'Escape') setMenuOpen(false);
            if (event.key === 'Tab') {
                const focusable = [...sidebar.querySelectorAll('a, button')].filter(el => el.getClientRects().length);
                const first = focusable[0], last = focusable.at(-1);
                if (!sidebar.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
                else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        const media = window.matchMedia('(min-width: 992px)');
        const onResize = () => { if (media.matches) setMenuOpen(false); };
        document.addEventListener('keydown', onKey);
        media.addEventListener('change', onResize);
        return () => {
            document.body.style.overflow = previousOverflow;
            cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', onKey);
            media.removeEventListener('change', onResize);
            previousFocus?.focus();
        };
    }, [menuOpen]);
    return <AcademicProvider key={user?.id || 'guest'}>
        <div className="app-container" ref={shell}>
            <a className="skip-link" href="#main-content">Đến nội dung chính</a>
            <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
            {menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Đóng menu điều hướng" tabIndex={-1} />}
            <main className="app-main" inert={menuOpen}>
                <Topbar menuOpen={menuOpen} onMenuToggle={() => setMenuOpen(previous => !previous)} />
                <div id="main-content" className="app-content-body" tabIndex={-1}><PageGuide /><Outlet /></div>
                <footer className="app-footer"><span>EduPortal · Hệ thống quản lý đào tạo</span><span>Học tập. Kết nối. Phát triển.</span></footer>
            </main>
        </div>
    </AcademicProvider>;
}
