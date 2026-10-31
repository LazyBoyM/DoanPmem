import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { getPendingRequests, subscribeLoading } from '../api/loadingStore';
import './LoadingPopup.css';

export function LoadingPopup({ label = 'Đang tải dữ liệu...' }) {
    const ref = useRef(null);
    useEffect(() => {
        const popup = ref.current;
        popup.showPopover?.();
        return () => { popup.hidePopover?.(); };
    }, []);

    return createPortal(<div ref={ref} popover="manual" className="loading-popup" role="status" aria-live="polite" aria-atomic="true">
        <div className="loading-popup-content">
            <span className="spinner-border loading-popup-spinner" aria-hidden="true" />
            <strong>{label}</strong>
            <span>Vui lòng chờ trong giây lát.</span>
        </div>
    </div>, document.body);
}

export default function DataLoadingPopup() {
    const pending = useSyncExternalStore(subscribeLoading, getPendingRequests);
    const busy = pending > 0;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!busy) return;
        const timer = setTimeout(() => setVisible(true), 180);
        return () => { clearTimeout(timer); setVisible(false); };
    }, [busy]);

    return busy && visible ? <LoadingPopup /> : null;
}
