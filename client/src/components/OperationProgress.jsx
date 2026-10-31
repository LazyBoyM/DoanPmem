import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { getPendingActions, subscribeLoading } from '../api/loadingStore';
import './OperationProgress.css';

export default function OperationProgress() {
    const pending = useSyncExternalStore(subscribeLoading, getPendingActions);
    const ref = useRef(null);
    const busy = pending > 0;

    useEffect(() => {
        if (!busy) return;
        const popup = ref.current;
        popup.showPopover?.();
        return () => { popup.hidePopover?.(); };
    }, [busy]);

    if (!busy) return null;
    return createPortal(<div ref={ref} popover="manual" className="operation-progress" role="status" aria-live="polite" aria-atomic="true">
        <div className="operation-progress-copy">
            <strong>Đang thực hiện thao tác...</strong>
            <span>{pending > 1 ? `${pending} yêu cầu đang được xử lý. Vui lòng chờ.` : 'Vui lòng chờ phản hồi, tránh bấm lại.'}</span>
        </div>
        <div className="operation-progress-track" aria-hidden="true"><span /></div>
    </div>, document.body);
}
