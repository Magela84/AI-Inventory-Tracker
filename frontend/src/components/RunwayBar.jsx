// RunwayBar — visual "days of stock remaining" indicator (green → red).
import React from 'react';

export default function RunwayBar({ days, maxDays = 30 }) {
  if (days == null) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const pct = Math.max(4, Math.min(100, (days / maxDays) * 100));
  const color =
    days <= 3 ? 'bg-red-500' : days <= 7 ? 'bg-amber-500' : 'bg-green-500';
  const textColor =
    days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-gray-600';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`whitespace-nowrap text-xs font-medium ${textColor}`}>
        ~{days}d
      </span>
    </div>
  );
}
