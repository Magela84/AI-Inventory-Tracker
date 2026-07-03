// InventoryTable — tabular view of all products
import React from 'react';

import AnomalyBadge from './AnomalyBadge.jsx';
import RunwayBar from './RunwayBar.jsx';

export default function InventoryTable({
  products = [],
  anomalyIds = new Set(),
  onEdit,
  onDelete,
  onSelect,
}) {
  const showActions = Boolean(onEdit || onDelete);
  const colCount = showActions ? 8 : 7;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Inventory</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Product</th>
            <th className="py-2">Category</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Threshold</th>
            <th className="py-2">Price</th>
            <th className="py-2">Runway</th>
            <th className="py-2">Status</th>
            {showActions && <th className="py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td colSpan={colCount} className="py-4 text-center text-gray-400">
                No products to display.
              </td>
            </tr>
          )}
          {products.map((p) => {
            const low = p.quantity <= p.reorderThreshold;
            return (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 font-medium text-gray-800">
                  {onSelect ? (
                    <button
                      onClick={() => onSelect(p)}
                      className="text-blue-600 hover:underline"
                    >
                      {p.name}
                    </button>
                  ) : (
                    p.name
                  )}
                </td>
                <td className="py-2 text-gray-600">{p.category}</td>
                <td className="py-2 text-gray-800">{p.quantity}</td>
                <td className="py-2 text-gray-600">{p.reorderThreshold}</td>
                <td className="py-2 text-gray-600">
                  {p.unitPrice != null ? `$${Number(p.unitPrice).toFixed(2)}` : '—'}
                </td>
                <td className="py-2">
                  <RunwayBar days={p.runwayDays} />
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        low ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {low ? 'Low' : 'OK'}
                    </span>
                    {anomalyIds.has(p.id) && <AnomalyBadge isAnomaly />}
                  </div>
                </td>
                {showActions && (
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(p)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(p)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
