// UsersManager — admin-only modal for listing, creating, and removing users.
import React, { useEffect, useState } from 'react';

import { getUsers, createUser, updateUser, deleteUser } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY = { username: '', password: '', name: '', role: 'staff' };

export default function UsersManager({ onClose }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setUsers(await getUsers());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Username and password are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createUser({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        role: form.role,
      });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(u, role) {
    setError(null);
    try {
      await updateUser(u.id, { role });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete user "${u.username}"?`)) return;
    setError(null);
    try {
      await deleteUser(u.id);
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
          <h2 className="text-lg font-semibold text-gray-800">User Management</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          {/* Existing users */}
          <table className="mb-6 w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2">Username</th>
                <th className="py-2">Name</th>
                <th className="py-2">Role</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 font-medium text-gray-800">
                      {u.username}
                      {isSelf && <span className="ml-1 text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className="py-2 text-gray-600">{u.name}</td>
                    <td className="py-2">
                      <select
                        className={field}
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                      >
                        <option value="admin">admin</option>
                        <option value="staff">staff</option>
                      </select>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={isSelf}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add user */}
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Add user</h3>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
            <input
              className={field}
              placeholder="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <input
              className={field}
              type="password"
              placeholder="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <input
              className={field}
              placeholder="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className={field}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
