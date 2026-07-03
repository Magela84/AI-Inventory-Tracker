// ProductForm — modal form for creating / editing a product
import React, { useState } from 'react';

const EMPTY = {
  name: '',
  category: '',
  quantity: '',
  reorderThreshold: '',
  unitPrice: '',
};

export default function ProductForm({ initial = null, onSave, onCancel, saving = false }) {
  const isEdit = Boolean(initial);
  const [values, setValues] = useState(() =>
    initial
      ? {
          name: initial.name ?? '',
          category: initial.category ?? '',
          quantity: initial.quantity ?? '',
          reorderThreshold: initial.reorderThreshold ?? '',
          unitPrice: initial.unitPrice ?? '',
        }
      : EMPTY
  );
  const [error, setError] = useState(null);

  function update(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    onSave({
      name: values.name.trim(),
      category: values.category.trim(),
      quantity: Number(values.quantity) || 0,
      reorderThreshold: Number(values.reorderThreshold) || 0,
      unitPrice: Number(values.unitPrice) || 0,
      // Preserve demand history on edit so forecasts/anomalies still work.
      ...(initial?.demandHistory ? { demandHistory: initial.demandHistory } : {}),
    });
  }

  const field =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';
  const label = 'mb-1 block text-xs font-medium text-gray-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {isEdit ? `Edit ${initial.name}` : 'Add Product'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={label} htmlFor="pf-name">Name</label>
            <input
              id="pf-name"
              className={field}
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className={label} htmlFor="pf-category">Category</label>
            <input
              id="pf-category"
              className={field}
              value={values.category}
              onChange={(e) => update('category', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label} htmlFor="pf-qty">Quantity</label>
              <input
                id="pf-qty"
                type="number"
                min="0"
                className={field}
                value={values.quantity}
                onChange={(e) => update('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="pf-threshold">Threshold</label>
              <input
                id="pf-threshold"
                type="number"
                min="0"
                className={field}
                value={values.reorderThreshold}
                onChange={(e) => update('reorderThreshold', e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="pf-price">Price</label>
              <input
                id="pf-price"
                type="number"
                min="0"
                step="0.01"
                className={field}
                value={values.unitPrice}
                onChange={(e) => update('unitPrice', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
