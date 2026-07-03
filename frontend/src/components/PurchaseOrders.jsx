// PurchaseOrders — modal to view POs, drive the draft→approved→received
// lifecycle, and create new POs. Receiving a PO updates stock (onChanged).
import React, { useEffect, useState } from 'react';

import {
  getPurchaseOrders,
  getSuppliers,
  createPurchaseOrder,
  approvePurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder,
} from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
};

export default function PurchaseOrders({ products = [], onChanged, onClose }) {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  // New-PO builder state
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState([]);
  const [pick, setPick] = useState({ productId: '', quantity: '', unitCost: '' });

  async function load() {
    try {
      const [po, sup] = await Promise.all([getPurchaseOrders(), getSuppliers()]);
      setOrders(po);
      setSuppliers(sup);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(fn, id, changesStock = false) {
    setError(null);
    try {
      await fn(id);
      await load();
      if (changesStock) onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  function addLine() {
    const product = products.find((p) => p.id === pick.productId);
    if (!product || !(Number(pick.quantity) > 0)) return;
    setLines((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        quantity: Number(pick.quantity),
        unitCost: Number(pick.unitCost) || product.unitPrice || 0,
      },
    ]);
    setPick({ productId: '', quantity: '', unitCost: '' });
  }

  async function submitPO() {
    if (!supplierId || lines.length === 0) {
      setError('Pick a supplier and add at least one line item.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createPurchaseOrder({ supplierId, items: lines });
      setSupplierId('');
      setLines([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const field =
    'rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none';
  const linesTotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Purchase Orders</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          {/* Existing POs */}
          <table className="mb-6 w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2">PO</th>
                <th className="py-2">Supplier</th>
                <th className="py-2">Items</th>
                <th className="py-2">Total</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">No purchase orders.</td>
                </tr>
              )}
              {orders.map((po) => (
                <tr key={po.id} className="border-b align-top last:border-0">
                  <td className="py-2 font-medium text-gray-800">{po.id}</td>
                  <td className="py-2 text-gray-600">{po.supplierName}</td>
                  <td className="py-2 text-gray-600">
                    {po.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                  </td>
                  <td className="py-2 text-gray-700">${Number(po.total).toFixed(2)}</td>
                  <td className="py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[po.status]}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1">
                      {po.status === 'draft' && isAdmin && (
                        <button onClick={() => act(approvePurchaseOrder, po.id)} className="rounded-md border border-blue-200 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                          Approve
                        </button>
                      )}
                      {po.status === 'approved' && (
                        <button onClick={() => act(receivePurchaseOrder, po.id, true)} className="rounded-md border border-green-200 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">
                          Receive
                        </button>
                      )}
                      {po.status !== 'received' && isAdmin && (
                        <button onClick={() => act(deletePurchaseOrder, po.id)} className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* New PO builder */}
          <h3 className="mb-2 text-sm font-semibold text-gray-700">New purchase order</h3>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="mb-3 flex items-center gap-2">
              <label className="text-sm text-gray-600">Supplier:</label>
              <select className={field} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Line item picker */}
            <div className="mb-2 flex flex-wrap items-end gap-2">
              <select className={field} value={pick.productId} onChange={(e) => setPick({ ...pick, productId: e.target.value })}>
                <option value="">Product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input className={`${field} w-20`} type="number" min="1" placeholder="qty" value={pick.quantity} onChange={(e) => setPick({ ...pick, quantity: e.target.value })} />
              <input className={`${field} w-24`} type="number" min="0" step="0.01" placeholder="unit cost" value={pick.unitCost} onChange={(e) => setPick({ ...pick, unitCost: e.target.value })} />
              <button onClick={addLine} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                Add line
              </button>
            </div>

            {lines.length > 0 && (
              <ul className="mb-2 space-y-1 text-sm">
                {lines.map((l, i) => (
                  <li key={i} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1">
                    <span>{l.name} × {l.quantity} @ ${l.unitCost.toFixed(2)}</span>
                    <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">✕</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total: ${linesTotal.toFixed(2)}</span>
              <button onClick={submitPO} disabled={creating || !supplierId || lines.length === 0} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {creating ? 'Creating…' : 'Create draft PO'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
