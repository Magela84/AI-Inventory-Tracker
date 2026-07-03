// Dashboard — main page composing all inventory widgets
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import InventoryTable from '../components/InventoryTable.jsx';
import LowStockAlerts from '../components/LowStockAlerts.jsx';
import DemandForecastChart from '../components/DemandForecastChart.jsx';
import NaturalLanguageSearch from '../components/NaturalLanguageSearch.jsx';
import ReorderSuggestions from '../components/ReorderSuggestions.jsx';
import ProductForm from '../components/ProductForm.jsx';
import ProductDetail from '../components/ProductDetail.jsx';
import Copilot from '../components/Copilot.jsx';
import PhotoIntake from '../components/PhotoIntake.jsx';
import UsersManager from '../components/UsersManager.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getInventory,
  getLowStock,
  getReorderSuggestions,
  getForecast,
  getAnomalies,
  createProduct,
  updateProduct,
  deleteProduct,
  toForecastChartData,
} from '../lib/api.js';

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth();
  const [showUsers, setShowUsers] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [visibleProducts, setVisibleProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [anomalyIds, setAnomalyIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [searchNote, setSearchNote] = useState(null);
  const [error, setError] = useState(null);

  // Form state: null (closed) | { mode: 'new' } | { mode: 'edit', product }
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Detail side-panel: the product currently being inspected, or null.
  const [detailProduct, setDetailProduct] = useState(null);

  // Photo intake modal visibility.
  const [scanning, setScanning] = useState(false);

  // Load (or reload) all dashboard data.
  const loadAll = useCallback(async () => {
    try {
      const [products, lowStock, reorder] = await Promise.all([
        getInventory(),
        getLowStock(),
        getReorderSuggestions(),
      ]);
      setAllProducts(products);
      setVisibleProducts(products);
      setSearchNote(null);
      setAlerts(lowStock);
      setSuggestions(reorder.suggestions ?? []);
      setSelectedId((prev) =>
        prev && products.some((p) => p.id === prev)
          ? prev
          : products[0]?.id ?? null
      );

      // Build the set of products with detected anomalies.
      const anomalyResults = await Promise.all(
        products.map((p) => getAnomalies(p.id).catch(() => null))
      );
      const ids = new Set(
        anomalyResults
          .filter((r) => r && (r.anomalies?.length ?? 0) > 0)
          .map((r) => r.productId)
      );
      setAnomalyIds(ids);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Load the forecast whenever the selected product changes.
  useEffect(() => {
    if (!selectedId) {
      setForecastData([]);
      return;
    }
    let cancelled = false;
    getForecast(selectedId)
      .then((res) => {
        if (!cancelled) setForecastData(toForecastChartData(res));
      })
      .catch(() => {
        if (!cancelled) setForecastData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedName = useMemo(
    () => allProducts.find((p) => p.id === selectedId)?.name ?? '',
    [allProducts, selectedId]
  );

  function handleSearchResults(results, query) {
    setVisibleProducts(results);
    setSearchNote(`Showing ${results.length} result(s) for “${query}”.`);
  }

  function clearSearch() {
    setVisibleProducts(allProducts);
    setSearchNote(null);
  }

  async function handleSave(values) {
    setSaving(true);
    setError(null);
    try {
      if (form?.mode === 'edit') {
        await updateProduct(form.product.id, values);
      } else {
        await createProduct(values);
      }
      setForm(null);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setError(null);
    try {
      await deleteProduct(product.id);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Failed to delete product');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Inventory Tracker</h1>
          <p className="text-sm text-gray-500">
            Smart inventory monitoring with forecasting, anomaly detection, and AI search.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScanning(true)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            📷 Scan
          </button>
          <button
            onClick={() => setForm({ mode: 'new' })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Product
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowUsers(true)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Users
            </button>
          )}
          <div className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-800">{user?.name}</div>
              <div className="text-xs capitalize text-gray-400">{user?.role}</div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-2">
        <NaturalLanguageSearch onResults={handleSearchResults} />
      </div>
      {searchNote && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
          <span>{searchNote}</span>
          <button onClick={clearSearch} className="text-blue-600 hover:underline">
            Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InventoryTable
            products={visibleProducts}
            anomalyIds={anomalyIds}
            onSelect={setDetailProduct}
            onEdit={(product) => setForm({ mode: 'edit', product })}
            onDelete={isAdmin ? handleDelete : undefined}
          />
        </div>
        <div className="space-y-6">
          <LowStockAlerts alerts={alerts} />
          <ReorderSuggestions suggestions={suggestions} />
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center gap-2">
          <label htmlFor="forecast-product" className="text-sm text-gray-600">
            Forecast for:
          </label>
          <select
            id="forecast-product"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            {allProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <DemandForecastChart data={forecastData} title={selectedName} />
      </div>

      {form && (
        <ProductForm
          initial={form.mode === 'edit' ? form.product : null}
          onSave={handleSave}
          onCancel={() => setForm(null)}
          saving={saving}
        />
      )}

      {detailProduct && (
        <ProductDetail
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}

      {scanning && (
        <PhotoIntake onClose={() => setScanning(false)} onCreated={loadAll} />
      )}

      {showUsers && <UsersManager onClose={() => setShowUsers(false)} />}

      <Copilot onChanged={loadAll} />
    </div>
  );
}
