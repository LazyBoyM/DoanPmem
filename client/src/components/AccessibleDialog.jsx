import { useContext, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FeedbackContext } from '../context/feedback-context';

export default function AccessibleDialog({ children, onClose, label = 'Thông tin và thao tác', className = '' }) {
    const ref = useRef(null);
    const close = useRef(onClose);
    const titleId = useId();
    const feedback = useContext(FeedbackContext);
    useEffect(() => { close.current = onClose; }, [onClose]);
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        const title = dialog.querySelector('.modal-title');
        if (title) { title.id = titleId; dialog.setAttribute('aria-labelledby', titleId); }
        document.body.style.overflow = 'hidden';
        dialog.showModal();
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
            if (previous?.isConnected) previous.focus();
        };
    }, [titleId]);
    return createPortal(<dialog ref={ref} className={`portal-dialog ${className}`} aria-label={label} onCancel={event => { event.preventDefault(); close.current(); }}>{feedback?.notice && <div className={`dialog-feedback alert alert-${feedback.notice.tone}`} role={feedback.notice.tone === 'danger' ? 'alert' : 'status'}><span>{feedback.notice.text}</span><button type="button" className="icon-button" aria-label="Đóng thông báo" onClick={feedback.dismissNotice}><i className="bi bi-x-lg" aria-hidden="true" /></button></div>}{children}</dialog>, document.body);
}
