export default function LoadingState({ label = 'Đang tải dữ liệu', compact = false }) {
    return <div className={`loading-state ${compact ? 'compact' : ''}`} role="status" aria-live="polite"><span className="visually-hidden">{label}</span><div className="skeleton-line skeleton-heading" /><div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line skeleton-short" /></div>;
}
