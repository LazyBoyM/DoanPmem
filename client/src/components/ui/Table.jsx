import React from 'react';

const Table = ({
  children,
  className = '',
  wrapperClassName = '',
  maxHeight = 'none',
  style = {}
}) => {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: maxHeight !== 'none' ? 'auto' : 'visible',
        maxHeight: maxHeight,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-surface)'
      }}
      className={wrapperClassName}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--table-font-size)',
          lineHeight: 'var(--line-height-normal)',
          textAlign: 'left',
          ...style
        }}
        className={`tabular-nums ${className}`}
      >
        {children}
      </table>
    </div>
  );
};

const Thead = ({ children, className = '', ...props }) => (
  <thead
    style={{
      backgroundColor: 'var(--color-surface-hover)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 2
    }}
    className={className}
    {...props}
  >
    {children}
  </thead>
);

const Th = ({
  children,
  sortable = false,
  sortDirection = null,
  onSort,
  align = 'left',
  width,
  className = '',
  style = {},
  ...props
}) => {
  const alignStyle = {
    textAlign: align
  };

  return (
    <th
      scope="col"
      style={{
        padding: 'var(--table-py) var(--table-px)',
        fontWeight: '650',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        width: width,
        cursor: sortable ? 'pointer' : 'default',
        userSelect: sortable ? 'none' : 'auto',
        ...alignStyle,
        ...style
      }}
      onClick={sortable ? onSort : undefined}
      className={`keyboard-focus ${className}`}
      tabIndex={sortable ? 0 : undefined}
      onKeyDown={sortable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onSort) onSort();
        }
      } : undefined}
      {...props}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span>{children}</span>
        {sortable && (
          <span style={{ fontSize: '12px', color: sortDirection ? 'var(--color-accent)' : 'var(--color-text-muted)' }} aria-hidden="true">
            {sortDirection === 'asc' ? '▲' : sortDirection === 'desc' ? '▼' : '↕'}
          </span>
        )}
      </div>
    </th>
  );
};

const Tbody = ({ children, className = '', ...props }) => (
  <tbody className={className} {...props}>
    {children}
  </tbody>
);

const Tr = ({ children, onClick, active = false, className = '', style = {}, ...props }) => (
  <tr
    style={{
      borderBottom: '1px solid var(--color-border-subtle)',
      backgroundColor: active ? 'var(--color-accent-subtle)' : 'transparent',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background-color 100ms ease',
      ...style
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.backgroundColor = 'transparent';
    }}
    className={className}
    {...props}
  >
    {children}
  </tr>
);

const Td = ({ children, align = 'left', className = '', style = {}, ...props }) => (
  <td
    style={{
      padding: 'var(--table-py) var(--table-px)',
      color: 'var(--color-text-primary)',
      verticalAlign: 'middle',
      textAlign: align,
      ...style
    }}
    className={className}
    {...props}
  >
    {children}
  </td>
);

Table.Thead = Thead;
Table.Th = Th;
Table.Tbody = Tbody;
Table.Tr = Tr;
Table.Td = Td;

export default Table;
