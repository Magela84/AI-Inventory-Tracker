// AnomalyBadge — small indicator for anomalous demand
import React from 'react';

export default function AnomalyBadge({ isAnomaly = false }) {
  // TODO: refine styling / tooltip
  if (!isAnomaly) {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Normal
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      Anomaly
    </span>
  );
}
