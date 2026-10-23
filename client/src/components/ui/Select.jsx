import React from 'react';

const Select = React.forwardRef(({
  id,
  label,
  error,
  helperText,
  disabled = false,
  size = 'md',
  options = [],
  children,
  className = '',
  wrapperClassName = '',
  ...props
}, ref) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const heights = {
    sm: '36px',
    md: '42px',
    lg: '48px'
  };

  const fontSizes = {
    sm: 'var(--font-size-sm)',
    md: 'var(--font-size-base)',
    lg: 'var(--font-size-md)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }} className={wrapperClassName}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: '600',
            color: 'var(--color-text-secondary)',
            userSelect: 'none'
          }}
        >
          {label}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
        style={{
          width: '100%',
          height: heights[size],
          fontSize: fontSizes[size],
          paddingLeft: '10px',
          paddingRight: '28px',
          backgroundColor: disabled ? 'var(--color-surface-hover)' : 'var(--color-surface)',
          color: disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-sm)',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 140ms ease, box-shadow 140ms ease'
        }}
        className={`keyboard-focus ${className}`}
        {...props}
      >
        {children || options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <span
          id={`${selectId}-error`}
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-danger)',
            fontWeight: '500'
          }}
          role="alert"
        >
          {error}
        </span>
      ) : helperText ? (
        <span
          id={`${selectId}-helper`}
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)'
          }}
        >
          {helperText}
        </span>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
