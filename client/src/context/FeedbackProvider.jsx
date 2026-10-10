import { useCallback, useEffect, useRef, useState } from 'react';
import AccessibleDialog from '../components/AccessibleDialog';
import { FeedbackContext } from './feedback-context';

export default function FeedbackProvider({ children }) {
    const [notice, setNotice] = useState(null);
    const [request, setRequest] = useState(null);
    const resolver = useRef(null);
    const notify = useCallback((text, tone = 'info') => setNotice({ text, tone }), []);
    const dismissNotice = useCallback(() => setNotice(null), []);
    const confirm = useCallback(text => new Promise(resolve => {
        resolver.current?.(false);
        resolver.current = resolve;
        setRequest(text);
    }), []);
    const finish = choice => { resolver.current?.(choice); resolver.current = null; setRequest(null); };
    useEffect(() => () => resolver.current?.(false), []);
    return <FeedbackContext.Provider value={{ notify, confirm, notice, dismissNotice }}>
        {children}
        {notice && <div className={`feedback-notice alert alert-${notice.tone}`} role={notice.tone === 'danger' ? 'alert' : 'status'}><i className={`bi ${notice.tone === 'danger' ? 'bi-exclamation-circle' : notice.tone === 'success' ? 'bi-check-circle' : 'bi-info-circle'}`} aria-hidden="true" /><span>{notice.text}</span><button className="icon-button" aria-label="Đóng thông báo" onClick={() => setNotice(null)}><i aria-hidden="true" className="bi bi-x-lg" /></button></div>}
        {request && <AccessibleDialog onClose={() => finish(false)} label="Xác nhận thao tác"><div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h2 className="modal-title">Xác nhận thao tác</h2><button className="btn-close" aria-label="Đóng hộp xác nhận" onClick={() => finish(false)} /></div><div className="modal-body"><p className="mb-0">{request}</p></div><div className="modal-footer"><button className="btn btn-outline-secondary" autoFocus onClick={() => finish(false)}>Hủy</button><button className="btn btn-danger" onClick={() => finish(true)}>Xác nhận</button></div></div></div></AccessibleDialog>}
    </FeedbackContext.Provider>;
}
