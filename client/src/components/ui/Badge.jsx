import React from 'react';

const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  style = {}
}) => {
  const variantStyles = {
    neutral: {
      backgroundColor: 'var(--color-surface-hover)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-text-secondary)'
    },
    gold: {
      backgroundColor: 'var(--color-gold-subtle)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-gold)'
    },
    accent: {
      backgroundColor: 'var(--color-gold-subtle)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-gold)'
    },
    success: {
      backgroundColor: 'var(--color-success-bg)',
      borderColor: 'var(--color-success-border)',
      color: 'var(--color-success-text)'
    },
    warning: {
      backgroundColor: 'var(--color-warning-bg)',
      borderColor: 'var(--color-warning-border)',
      color: 'var(--color-warning-text)'
    },
    danger: {
      backgroundColor: 'var(--color-danger-bg)',
      borderColor: 'var(--color-danger-border)',
      color: 'var(--color-danger-text)'
    },
    info: {
      backgroundColor: 'var(--color-info-bg)',
      borderColor: 'var(--color-info-border)',
      color: 'var(--color-info-text)'
    }
  };

  const dotColors = {
    neutral: 'var(--color-text-muted)',
    gold: 'var(--color-gold)',
    accent: 'var(--color-gold)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)'
  };

  const sizeStyles = {
    sm: {
      height: '22px',
      padding: '0 8px',
      fontSize: 'var(--font-size-xs)'
    },
    md: {
      height: '26px',
      padding: '0 10px',
      fontSize: 'var(--font-size-sm)'
    },
    lg: {
      height: '30px',
      padding: '0 12px',
      fontSize: 'var(--font-size-base)'
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontWeight: '600',
        lineHeight: 1,
        borderRadius: 'var(--radius-xs)',
        border: '1px solid',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style
      }}
      className={className}
    >
      {dot && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: dotColors[variant] || 'currentColor'
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
