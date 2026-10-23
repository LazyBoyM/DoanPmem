import React, { useState, useEffect } from 'react';

const DensityToggle = ({ density: controlledDensity, onChange, className = '' }) => {
  const [internalDensity, setInternalDensity] = useState(() => {
    return localStorage.getItem('eduportal_table_density') || 'comfortable';
  });

  const activeDensity = controlledDensity || internalDensity;

  useEffect(() => {
    if (!controlledDensity) {
      document.documentElement.setAttribute('data-density', internalDensity);
    }
  }, [internalDensity, controlledDensity]);

  const handleToggle = (mode) => {
    if (onChange) {
      onChange(mode);
    } else {
      setInternalDensity(mode);
      localStorage.setItem('eduportal_table_density', mode);
      document.documentElement.setAttribute('data-density', mode);
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--color-surface-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '3px',
        gap: '3px',
        userSelect: 'none'
      }}
      className={className}
      role="group"
      aria-label="Độ giãn cách bảng"
    >
      <button
        type="button"
        aria-pressed={activeDensity === 'compact'}
        onClick={() => handleToggle('compact')}
        style={{
          border: 'none',
          outline: 'none',
          padding: '4px 10px',
          fontSize: 'var(--font-size-sm)',
          fontWeight: '550',
          borderRadius: 'var(--radius-xs)',
          backgroundColor: activeDensity === 'compact' ? 'var(--color-surface)' : 'transparent',
          color: activeDensity === 'compact' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          boxShadow: activeDensity === 'compact' ? 'var(--shadow-xs)' : 'none',
          cursor: 'pointer',
          transition: 'all 120ms ease'
        }}
        className="keyboard-focus"
      >
        Gọn
      </button>

      <button
        type="button"
        aria-pressed={activeDensity === 'comfortable'}
        onClick={() => handleToggle('comfortable')}
        style={{
          border: 'none',
          outline: 'none',
          padding: '4px 10px',
          fontSize: 'var(--font-size-sm)',
          fontWeight: '550',
          borderRadius: 'var(--radius-xs)',
          backgroundColor: activeDensity === 'comfortable' ? 'var(--color-surface)' : 'transparent',
          color: activeDensity === 'comfortable' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          boxShadow: activeDensity === 'comfortable' ? 'var(--shadow-xs)' : 'none',
          cursor: 'pointer',
          transition: 'all 120ms ease'
        }}
        className="keyboard-focus"
      >
        Vừa
      </button>
    </div>
  );
};

export default DensityToggle;
