// LowStockAlerts — list of products below reorder threshold
import React from 'react';

const severityStyles = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
};

export default function LowStockAlerts({ alerts = [] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Low Stock Alerts</h2>
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-400">All products above threshold.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`rounded-md border px-3 py-2 text-sm ${
                severityStyles[a.severity] ?? severityStyles.warning
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{a.name}</span>
                <span className="text-xs uppercase tracking-wide">{a.severity}</span>
              </div>
              <div className="text-xs opacity-80">
                {a.quantity} in stock · threshold {a.reorderThreshold}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
