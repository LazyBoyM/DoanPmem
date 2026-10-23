import React from 'react';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className = '',
  style = {}
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '24px 16px' : '48px 24px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--color-border)',
        margin: '0 auto',
        width: '100%',
        ...style
      }}
      className={className}
    >
      {Icon && (
        <div
          style={{
            width: compact ? '36px' : '44px',
            height: compact ? '36px' : '44px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            fontSize: compact ? '18px' : '22px',
            marginBottom: compact ? '8px' : '14px'
          }}
          aria-hidden="true"
        >
          <Icon />
        </div>
      )}

      {title && (
        <h3
          style={{
            fontSize: compact ? 'var(--font-size-base)' : 'var(--font-size-md)',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            margin: '0 0 4px 0'
          }}
        >
          {title}
        </h3>
      )}

      {description && (
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            margin: '0 0 16px 0',
            maxWidth: '42ch',
            lineHeight: 'var(--line-height-normal)'
          }}
        >
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
