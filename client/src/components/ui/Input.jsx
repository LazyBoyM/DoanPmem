import React from 'react';

const Input = React.forwardRef(({
  id,
  label,
  error,
  helperText,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  disabled = false,
  tabular = false,
  size = 'md',
  className = '',
  wrapperClassName = '',
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

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
          htmlFor={inputId}
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

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {LeadingIcon && (
          <span
            style={{
              position: 'absolute',
              left: '10px',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-hidden="true"
          >
            <LeadingIcon />
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          style={{
            width: '100%',
            height: heights[size],
            fontSize: fontSizes[size],
            paddingLeft: LeadingIcon ? '32px' : '10px',
            paddingRight: TrailingIcon ? '32px' : '10px',
            backgroundColor: disabled ? 'var(--color-surface-hover)' : 'var(--color-surface)',
            color: disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            transition: 'border-color 140ms ease, box-shadow 140ms ease',
            fontVariantNumeric: tabular ? 'tabular-nums' : 'normal'
          }}
          className={`keyboard-focus ${className}`}
          {...props}
        />

        {TrailingIcon && (
          <span
            style={{
              position: 'absolute',
              right: '10px',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-hidden="true"
          >
            <TrailingIcon />
          </span>
        )}
      </div>

      {error ? (
        <span
          id={`${inputId}-error`}
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
          id={`${inputId}-helper`}
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

Input.displayName = 'Input';
export default Input;
