// SuppliersManager — modal for listing, creating, and removing suppliers.
import React, { useEffect, useState } from 'react';

import { getSuppliers, createSupplier, deleteSupplier } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY = { name: '', contactName: '', email: '', phone: '', leadTimeDays: '' };

export default function SuppliersManager({ onClose }) {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setSuppliers(await getSuppliers());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSupplier({
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        leadTimeDays: Number(form.leadTimeDays) || 0,
      });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(s) {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    setError(null);
    try {
      await deleteSupplier(s.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const field =
    'rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Suppliers</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <table className="mb-6 w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2">Name</th>
                <th className="py-2">Contact</th>
                <th className="py-2">Email</th>
                <th className="py-2">Lead time</th>
                {isAdmin && <th className="py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-4 text-center text-gray-400">
                    No suppliers yet.
                  </td>
                </tr>
              )}
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2 font-medium text-gray-800">{s.name}</td>
                  <td className="py-2 text-gray-600">{s.contactName}</td>
                  <td className="py-2 text-gray-600">{s.email}</td>
                  <td className="py-2 text-gray-600">{s.leadTimeDays}d</td>
                  {isAdmin && (
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDelete(s)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="mb-2 text-sm font-semibold text-gray-700">Add supplier</h3>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
            <input className={field} placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={field} placeholder="contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <input className={field} placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={field} placeholder="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={`${field} w-24`} type="number" placeholder="lead days" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
            <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
