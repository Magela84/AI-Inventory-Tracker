// PhotoIntake — upload a photo/invoice; GPT-4o Vision extracts product rows to review + create.
import React, { useState } from 'react';

import { extractProducts, createProduct } from '../lib/api.js';

// step: 'upload' | 'review' | 'saving'
export default function PhotoIntake({ onClose, onCreated }) {
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [rows, setRows] = useState([]);
  const [step, setStep] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleExtract() {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    try {
      const { products } = await extractProducts(imageDataUrl);
      setRows(products ?? []);
      setStep('review');
    } catch (err) {
      setError(err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  }

  function updateRow(i, field, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreateAll() {
    if (rows.length === 0) return;
    setStep('saving');
    setError(null);
    try {
      for (const r of rows) {
        await createProduct({
          name: String(r.name ?? '').trim() || 'Unnamed',
          category: String(r.category ?? '').trim(),
          quantity: Number(r.quantity) || 0,
          reorderThreshold: Number(r.reorderThreshold) || 0,
          unitPrice: Number(r.unitPrice) || 0,
        });
      }
      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create products');
      setStep('review');
    }
  }

  const cell =
    'w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">📷 Scan products from a photo</h2>
            <p className="text-xs text-gray-500">
              Upload a shelf photo, product label, or invoice — GPT-4o Vision extracts the items.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Upload + preview */}
          <div className="mb-4 flex items-start gap-4">
            <div>
              <input type="file" accept="image/*" onChange={handleFile} className="text-sm" />
              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="preview"
                  className="mt-3 max-h-40 rounded-md border border-gray-200"
                />
              )}
            </div>
            {step === 'upload' && (
              <button
                onClick={handleExtract}
                disabled={!imageDataUrl || loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Extracting…' : 'Extract products'}
              </button>
            )}
          </div>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          {/* Review extracted rows */}
          {step !== 'upload' && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Extracted {rows.length} item(s) — review and edit before creating:
              </h3>
              {rows.length === 0 ? (
                <p className="text-sm text-gray-400">No products detected in the image.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-1">Name</th>
                      <th className="py-1">Category</th>
                      <th className="py-1">Qty</th>
                      <th className="py-1">Threshold</th>
                      <th className="py-1">Price</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-2">
                          <input className={cell} value={r.name ?? ''} onChange={(e) => updateRow(i, 'name', e.target.value)} />
                        </td>
                        <td className="py-1 pr-2">
                          <input className={cell} value={r.category ?? ''} onChange={(e) => updateRow(i, 'category', e.target.value)} />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="number" className={cell} value={r.quantity ?? 0} onChange={(e) => updateRow(i, 'quantity', e.target.value)} />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="number" className={cell} value={r.reorderThreshold ?? 0} onChange={(e) => updateRow(i, 'reorderThreshold', e.target.value)} />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="number" step="0.01" className={cell} value={r.unitPrice ?? 0} onChange={(e) => updateRow(i, 'unitPrice', e.target.value)} />
                        </td>
                        <td className="py-1">
                          <button onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {step !== 'upload' && (
            <button
              onClick={handleCreateAll}
              disabled={rows.length === 0 || step === 'saving'}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {step === 'saving' ? 'Creating…' : `Create ${rows.length} product(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
