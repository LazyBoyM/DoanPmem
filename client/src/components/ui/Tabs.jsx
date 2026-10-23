import React from 'react';

const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  style = {}
}) => {
  const handleKeyDown = (e, index) => {
    let nextIndex = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      onChange(tabs[nextIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '1px solid var(--color-border)',
        width: '100%',
        ...style
      }}
      className={className}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: 'var(--font-size-base)',
              fontWeight: isActive ? '600' : '500',
              color: isActive ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'color 120ms ease, border-color 120ms ease',
              whiteSpace: 'nowrap'
            }}
            className="keyboard-focus"
          >
            {tab.icon && (
              <span style={{ fontSize: '15px' }} aria-hidden="true">
                <tab.icon />
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'var(--color-surface-hover)',
                  color: isActive ? 'var(--color-accent-text)' : 'var(--color-text-muted)'
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
