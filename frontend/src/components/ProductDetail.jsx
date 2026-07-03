// ProductDetail — slide-in side panel showing a product's full demand history,
// forecast chart, and anomaly highlights together.
import React, { useEffect, useMemo, useState } from 'react';

import DemandForecastChart from './DemandForecastChart.jsx';
import RunwayBar from './RunwayBar.jsx';
import {
  getForecast,
  getAnomalies,
  getProductMovements,
  adjustStock,
  toForecastChartData,
} from '../lib/api.js';

export default function ProductDetail({ product, onClose, onChanged }) {
  const [current, setCurrent] = useState(product);
  const [forecastData, setForecastData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState(null);

  const productId = product?.id;

  async function loadMovements() {
    try {
      setMovements(await getProductMovements(productId));
    } catch {
      setMovements([]);
    }
  }

  useEffect(() => {
    if (!product) return undefined;
    let cancelled = false;
    setCurrent(product);
    setLoading(true);
    Promise.all([
      getForecast(product.id).catch(() => null),
      getAnomalies(product.id).catch(() => null),
      getProductMovements(product.id).catch(() => []),
    ]).then(([forecast, anomalyRes, moves]) => {
      if (cancelled) return;
      setForecastData(forecast ? toForecastChartData(forecast) : []);
      setAnomalies(anomalyRes?.anomalies ?? []);
      setMovements(moves ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [product]);

  async function handleAdjust(e) {
    e.preventDefault();
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      setError('Enter a non-zero adjustment.');
      return;
    }
    setAdjusting(true);
    setError(null);
    try {
      const updated = await adjustStock(productId, d, reason.trim() || 'Manual adjustment');
      setCurrent((c) => ({ ...c, quantity: updated.quantity }));
      setDelta('');
      setReason('');
      await loadMovements();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  }

  // Anomalous timestamps -> quick lookup for highlighting the history rows.
  const anomalyByTs = useMemo(() => {
    const map = new Map();
    anomalies.forEach((a) => map.set(a.timestamp, a));
    return map;
  }, [anomalies]);

  // Map anomalies onto chart coordinates (period + actual value).
  const chartAnomalies = useMemo(
    () => anomalies.map((a) => ({ period: a.timestamp, value: a.value })),
    [anomalies]
  );

  if (!product) return null;

  const view = current ?? product;
  const low = view.quantity <= view.reorderThreshold;
  const history = view.demandHistory ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Overlay */}
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="flex-1 bg-black/30"
      />
      {/* Panel */}
      <aside className="h-full w-full max-w-md overflow-y-auto bg-gray-50 shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
            <p className="text-xs text-gray-500">
              {product.id} · {product.category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Key stats */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Quantity" value={view.quantity} />
            <Stat label="Reorder threshold" value={view.reorderThreshold} />
            <Stat label="Stock runway" value={<RunwayBar days={view.runwayDays} />} />
            <Stat
              label="Unit price"
              value={view.unitPrice != null ? `$${Number(view.unitPrice).toFixed(2)}` : '—'}
            />
            <Stat
              label="Status"
              value={
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    low ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {low ? 'Low stock' : 'OK'}
                </span>
              }
            />
          </div>

          {/* Anomaly summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Anomalies</h3>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : anomalies.length === 0 ? (
              <p className="text-sm text-gray-400">No anomalies detected.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {anomalies.map((a) => (
                  <li key={a.timestamp} className="flex justify-between">
                    <span className="text-red-600">{a.timestamp}</span>
                    <span className="text-gray-600">
                      {a.value}
                      {a.expectedValue != null && (
                        <span className="text-gray-400"> (expected ~{Math.round(a.expectedValue)})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Adjust stock */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Adjust stock</h3>
            <form onSubmit={handleAdjust} className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="+/- qty"
                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="reason (e.g. damaged, count)"
                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={adjusting}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>
            </form>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <p className="mt-1 text-xs text-gray-400">
              Use a negative number to remove stock. Every adjustment is logged below.
            </p>
          </div>

          {/* Forecast chart with anomaly markers */}
          <DemandForecastChart
            data={forecastData}
            title={view.name}
            anomalies={chartAnomalies}
          />

          {/* Stock movement ledger for this product */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Stock Movements</h3>
            {movements.length === 0 ? (
              <p className="text-sm text-gray-400">No movements recorded.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-1">When</th>
                    <th className="py-1 text-right">Change</th>
                    <th className="py-1 text-right">After</th>
                    <th className="py-1">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-1 text-gray-600">{m.createdAt?.slice(0, 10)}</td>
                      <td
                        className={`py-1 text-right font-medium ${
                          m.type === 'in' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </td>
                      <td className="py-1 text-right text-gray-700">{m.quantityAfter}</td>
                      <td className="py-1 text-gray-600">
                        {m.reason}
                        <span className="text-gray-400"> · {m.username}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Full demand history */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Demand History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">No demand history.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-1">Date</th>
                    <th className="py-1 text-right">Demand</th>
                    <th className="py-1 text-right">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => {
                    const flagged = anomalyByTs.has(h.timestamp);
                    return (
                      <tr
                        key={h.timestamp}
                        className={`border-b last:border-0 ${flagged ? 'bg-red-50' : ''}`}
                      >
                        <td className="py-1 text-gray-700">{h.timestamp}</td>
                        <td className="py-1 text-right text-gray-800">{h.value}</td>
                        <td className="py-1 text-right">
                          {flagged && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              anomaly
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}
