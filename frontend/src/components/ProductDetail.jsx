// ProductDetail — slide-in side panel showing a product's full demand history,
// forecast chart, and anomaly highlights together.
import React, { useEffect, useMemo, useState } from 'react';

import DemandForecastChart from './DemandForecastChart.jsx';
import RunwayBar from './RunwayBar.jsx';
import { getForecast, getAnomalies, toForecastChartData } from '../lib/api.js';

export default function ProductDetail({ product, onClose }) {
  const [forecastData, setForecastData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) return undefined;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getForecast(product.id).catch(() => null),
      getAnomalies(product.id).catch(() => null),
    ]).then(([forecast, anomalyRes]) => {
      if (cancelled) return;
      setForecastData(forecast ? toForecastChartData(forecast) : []);
      setAnomalies(anomalyRes?.anomalies ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [product]);

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

  const low = product.quantity <= product.reorderThreshold;
  const history = product.demandHistory ?? [];

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
            <Stat label="Quantity" value={product.quantity} />
            <Stat label="Reorder threshold" value={product.reorderThreshold} />
            <Stat label="Stock runway" value={<RunwayBar days={product.runwayDays} />} />
            <Stat
              label="Unit price"
              value={product.unitPrice != null ? `$${Number(product.unitPrice).toFixed(2)}` : '—'}
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

          {/* Forecast chart with anomaly markers */}
          <DemandForecastChart
            data={forecastData}
            title={product.name}
            anomalies={chartAnomalies}
          />

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
