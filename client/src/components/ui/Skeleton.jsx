import React from 'react';

const Skeleton = ({
  variant = 'text',
  width = '100%',
  height,
  className = '',
  style = {}
}) => {
  const heights = {
    text: '14px',
    title: '22px',
    circular: width,
    rectangular: '60px'
  };

  const borderRadiuses = {
    text: 'var(--radius-xs)',
    title: 'var(--radius-xs)',
    circular: '50%',
    rectangular: 'var(--radius-sm)'
  };

  return (
    <div
      style={{
        width: width,
        height: height || heights[variant],
        borderRadius: borderRadiuses[variant],
        backgroundColor: 'var(--color-border-subtle)',
        animation: 'skeleton-pulse 1.4s ease-in-out infinite alternate',
        ...style
      }}
      className={className}
      aria-hidden="true"
    />
  );
};

const TableSkeleton = ({ rows = 5, cols = 4, className = '' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }} className={className}>
      <Skeleton variant="rectangular" height="34px" />
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <Skeleton key={cIdx} variant="text" width={cIdx === 0 ? '70%' : '50%'} />
          ))}
        </div>
      ))}
    </div>
  );
};

Skeleton.Table = TableSkeleton;

export default Skeleton;
