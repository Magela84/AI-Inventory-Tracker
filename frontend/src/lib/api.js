// Frontend API client for the AI Inventory Tracker backend
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const API_KEY = import.meta.env.VITE_API_KEY;

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    // Surface the server's error message + validation details when present.
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) {
        message = body.error.message;
        if (Array.isArray(body.error.details)) {
          message += `: ${body.error.details.join('; ')}`;
        }
      }
    } catch {
      /* non-JSON error body — keep the default message */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Inventory
export const getInventory = () => request('/inventory');
export const getProduct = (id) => request(`/inventory/${id}`);
export const createProduct = (product) =>
  request('/inventory', { method: 'POST', body: JSON.stringify(product) });
export const updateProduct = (id, product) =>
  request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(product) });
export const deleteProduct = (id) =>
  request(`/inventory/${id}`, { method: 'DELETE' });
export const getForecast = (id) => request(`/inventory/${id}/forecast`);

// Alerts
export const getLowStock = () => request('/alerts/low-stock');
export const getAnomalies = (id) => request(`/alerts/anomalies/${id}`);

// AI
export const naturalLanguageSearch = (query) =>
  request('/ai/search', { method: 'POST', body: JSON.stringify({ query }) });
export const getReorderSuggestions = (context = {}) =>
  request('/ai/reorder-suggestions', {
    method: 'POST',
    body: JSON.stringify(context),
  });

// Copilot — send the full conversation, receive { reply, actions, changed }.
export const copilot = (messages) =>
  request('/ai/copilot', { method: 'POST', body: JSON.stringify({ messages }) });

// Photo intake — send a base64 data URL, receive { products: [...] } (GPT-4o Vision).
export const extractProducts = (imageDataUrl) =>
  request('/ai/extract', { method: 'POST', body: JSON.stringify({ imageDataUrl }) });

// Merge a forecast response ({ history, forecast }) into a single Recharts-ready
// series of { period, actual, forecast }. The last actual point is duplicated
// into the forecast line so the two segments connect visually.
export function toForecastChartData(forecastResponse) {
  const history = forecastResponse?.history ?? [];
  const forecast = forecastResponse?.forecast ?? [];
  const merged = history.map((h) => ({ period: h.period, actual: h.actual }));
  if (history.length > 0) {
    merged[merged.length - 1].forecast = history[history.length - 1].actual;
  }
  forecast.forEach((f) => merged.push({ period: f.period, forecast: f.forecast }));
  return merged;
}

export default {
  getInventory,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getForecast,
  getLowStock,
  getAnomalies,
  naturalLanguageSearch,
  getReorderSuggestions,
  copilot,
  extractProducts,
  toForecastChartData,
};
