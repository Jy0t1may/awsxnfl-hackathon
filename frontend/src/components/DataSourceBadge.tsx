import React from 'react';

export type DataSourceOrigin = 'NGS 10Hz' | 'nflverse' | 'PFR';

interface DataSourceBadgeProps {
  source: DataSourceOrigin;
  className?: string;
  visible?: boolean;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  source,
  className = '',
  visible = true,
}) => {
  if (!visible) return null;

  const styles = {
    'NGS 10Hz': 'text-emerald-400 bg-emerald-950/70 border-emerald-500/40 hover:bg-emerald-900/80',
    'nflverse': 'text-sky-400 bg-sky-950/70 border-sky-500/40 hover:bg-sky-900/80',
    'PFR': 'text-amber-400 bg-amber-950/70 border-amber-500/40 hover:bg-amber-900/80',
  }[source];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-tight border transition-colors ${styles} ${className}`}
      title={`Data verified directly from ${source}`}
    >
      [{source}]
    </span>
  );
};
