import { Children, cloneElement, isValidElement, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function labelActions(children) {
    return Children.map(children, child => {
        if (!isValidElement(child)) return child;
        if (child.type === 'button') {
            const parts = Children.toArray(child.props.children);
            const icon = parts.find(part => isValidElement(part) && part.type === 'i');
            const label = child.props.title || child.props['aria-label'] || parts.filter(part => typeof part === 'string').join('').trim();
            return cloneElement(child, {}, <>{icon}<span>{label}</span></>);
        }
        return child.props.children ? cloneElement(child, {}, labelActions(child.props.children)) : child;
    });
}
export default function RecordActions({ label, children }) {
    const id = useId();
    const popover = useRef(null);
    const [position, setPosition] = useState({ left: 16, top: 16 });
    const [open, setOpen] = useState(false);
    return <><button className="btn btn-sm btn-outline-secondary record-action-trigger" popoverTarget={id} aria-expanded={open} aria-label={`Thao tác cho ${label}`} onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ left: Math.max(16, Math.min(rect.right - 260, window.innerWidth - 276)), top: Math.max(16, Math.min(rect.bottom + 6, window.innerHeight - 340)) });
    }}>Thao tác<i aria-hidden="true" className="bi bi-chevron-down" /></button>{createPortal(<div id={id} ref={popover} popover="auto" className="record-action-menu" style={position} role="group" aria-label={`Thao tác cho ${label}`} onToggle={event => {
        const isOpen = event.nativeEvent.newState === 'open';
        setOpen(isOpen);
        if (isOpen) requestAnimationFrame(() => popover.current?.querySelector('button:not(:disabled),a')?.focus());
    }} onClickCapture={event => { if (event.target.closest('button,a')) popover.current?.hidePopover(); }}><p>{label}</p>{labelActions(children)}</div>, document.body)}</>;
}
