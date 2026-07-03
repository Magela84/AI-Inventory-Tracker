// MovementsLedger — modal showing the recent stock-movement audit trail.
import React, { useEffect, useState } from 'react';

import { getMovements } from '../lib/api.js';

const SOURCE_LABEL = {
  seed: 'Seed',
  manual: 'Manual',
  purchase_order: 'Purchase order',
};

export default function MovementsLedger({ onClose }) {
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMovements(100)
      .then(setMovements)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Stock Movement Ledger</h2>
            <p className="text-xs text-gray-500">Audit trail of every stock change.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {movements.length === 0 ? (
            <p className="text-sm text-gray-400">No movements recorded.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2">When</th>
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Change</th>
                  <th className="py-2 text-right">After</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-1.5 text-gray-600">{m.createdAt?.slice(0, 10)}</td>
                    <td className="py-1.5 font-medium text-gray-800">{m.productName}</td>
                    <td
                      className={`py-1.5 text-right font-medium ${
                        m.type === 'in' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="py-1.5 text-right text-gray-700">{m.quantityAfter}</td>
                    <td className="py-1.5 text-gray-600">{SOURCE_LABEL[m.source] ?? m.source}</td>
                    <td className="py-1.5 text-gray-600">{m.reason}</td>
                    <td className="py-1.5 text-gray-500">{m.username}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
