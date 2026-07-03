// Forecast service — simple exponential smoothing (in-service, no ML infra)
//
// Exponential smoothing:
//   S_0 = X_0
//   S_t = alpha * X_t + (1 - alpha) * S_{t-1}
//
// The h-step-ahead forecast for simple exponential smoothing is flat and equal
// to the most recent smoothed level.

// Normalize a history entry into a numeric value.
function toValue(point) {
  if (typeof point === 'number') return point;
  if (point && typeof point.value === 'number') return point.value;
  return Number(point) || 0;
}

// Add `days` to an ISO date string (YYYY-MM-DD). Falls back to a synthetic
// "t+n" label when the input isn't a parseable date.
function nextLabel(lastTimestamp, offset) {
  const date = new Date(lastTimestamp);
  if (Number.isNaN(date.getTime())) return `t+${offset}`;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

// Compute the smoothed series for a set of observations.
export function smooth(values = [], alpha = 0.5) {
  if (values.length === 0) return [];
  const nums = values.map(toValue);
  const result = [nums[0]];
  for (let i = 1; i < nums.length; i += 1) {
    result.push(alpha * nums[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// Forecast the next `horizon` periods from a historical demand series.
// history: [{ timestamp, value }] or [number]
// Returns [{ period, value }].
export function forecast(history = [], horizon = 7, alpha = 0.5) {
  if (history.length === 0) return [];

  const smoothed = smooth(history, alpha);
  const level = Math.round(smoothed[smoothed.length - 1] * 100) / 100;

  const last = history[history.length - 1];
  const lastTimestamp =
    last && last.timestamp ? last.timestamp : new Date().toISOString().slice(0, 10);

  const out = [];
  for (let h = 1; h <= horizon; h += 1) {
    out.push({ period: nextLabel(lastTimestamp, h), value: level });
  }
  return out;
}

// Projected next-period (daily) demand — the smoothed level.
export function dailyDemand(history = [], alpha = 0.5) {
  return forecast(history, 1, alpha)[0]?.value ?? 0;
}

// Estimated whole periods of stock remaining at the projected demand rate.
// Returns null when there's no demand signal to project from.
export function runwayDays(quantity, history = [], alpha = 0.5) {
  const level = dailyDemand(history, alpha);
  if (!level) return null;
  return Math.floor((quantity ?? 0) / level);
}

export default { smooth, forecast, dailyDemand, runwayDays };
