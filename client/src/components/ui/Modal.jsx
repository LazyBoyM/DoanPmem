import React, { useEffect, useRef } from 'react';

const Modal = ({
  open = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  drawer = false,
  className = ''
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open && onClose) {
        onClose();
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthSizes = {
    sm: '420px',
    md: '560px',
    lg: '760px',
    xl: '980px',
    full: 'calc(100vw - 32px)'
  };

  const modalStyle = drawer ? {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(640px, 100vw)',
    height: '100%',
    backgroundColor: 'var(--color-surface)',
    boxShadow: 'var(--shadow-modal)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1050,
    borderLeft: '1px solid var(--color-border)'
  } : {
    position: 'relative',
    width: `min(${widthSizes[size] || widthSizes.md}, calc(100vw - 32px))`,
    maxHeight: 'calc(100vh - 64px)',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-modal)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1050,
    overflow: 'hidden'
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1040,
        display: 'flex',
        alignItems: drawer ? 'stretch' : 'center',
        justifyContent: drawer ? 'flex-end' : 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        padding: drawer ? 0 : '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-desc' : undefined}
        style={modalStyle}
        className={className}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            {title && (
              <h2
                id="modal-title"
                style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: '600',
                  margin: 0,
                  color: 'var(--color-text-primary)'
                }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-desc"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                  margin: '3px 0 0'
                }}
              >
                {description}
              </p>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              style={{
                background: 'transparent',
                border: 'none',
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                fontSize: '16px'
              }}
              className="keyboard-focus"
            >
              ✕
            </button>
          )}
        </div>

        <div
          style={{
            padding: '18px',
            overflowY: 'auto',
            flex: 1,
            fontSize: 'var(--font-size-base)'
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
