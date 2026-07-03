// DemandForecastChart — demand history + forecast (Recharts)
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';

export default function DemandForecastChart({ data = [], title = '', anomalies = [] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        Demand Forecast{title ? ` — ${title}` : ''}
      </h2>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">No forecast data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#2563eb"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="#f59e0b"
              strokeDasharray="5 5"
              connectNulls
            />
            {anomalies.map((a) => (
              <ReferenceDot
                key={a.period}
                x={a.period}
                y={a.value}
                r={6}
                fill="#dc2626"
                stroke="#fff"
                strokeWidth={1.5}
                isFront
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
