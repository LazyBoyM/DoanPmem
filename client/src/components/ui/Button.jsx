import React from 'react';

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '600',
    letterSpacing: '0.01em',
    transition: 'all 140ms ease',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    border: '1px solid transparent',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    verticalAlign: 'middle',
    userSelect: 'none'
  };

  const sizeStyles = {
    sm: {
      height: '34px',
      padding: '0 12px',
      fontSize: 'var(--font-size-sm)'
    },
    md: {
      height: '40px',
      padding: '0 18px',
      fontSize: 'var(--font-size-base)'
    },
    lg: {
      height: '46px',
      padding: '0 22px',
      fontSize: 'var(--font-size-md)'
    }
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--color-gold)',
      borderColor: 'var(--color-gold)',
      color: '#070B19',
      boxShadow: 'var(--shadow-gold)',
      fontWeight: '700'
    },
    secondary: {
      backgroundColor: 'var(--color-surface)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-text-primary)'
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: 'var(--color-border-strong)',
      color: 'var(--color-text-primary)'
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: 'var(--color-text-secondary)'
    },
    danger: {
      backgroundColor: 'var(--color-danger)',
      borderColor: 'var(--color-danger)',
      color: '#ffffff'
    },
    'danger-subtle': {
      backgroundColor: 'var(--color-danger-bg)',
      borderColor: 'var(--color-danger-border)',
      color: 'var(--color-danger-text)'
    }
  };

  const appliedStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant]
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      style={appliedStyle}
      className={`keyboard-focus ${className}`}
      {...props}
    >
      {loading ? (
        <span
          className="spinner-border spinner-border-sm"
          style={{ width: '12px', height: '12px', borderWidth: '2px' }}
          role="status"
          aria-hidden="true"
        />
      ) : Icon ? (
        <Icon style={{ fontSize: '14px', flexShrink: 0 }} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
