// Supplier service — CRUD over mock array or Cosmos `suppliers` container.
import * as cosmosService from './cosmosService.js';
import { suppliers as mockSuppliers } from '../mocks/suppliers.js';

const useMock = () => process.env.MOCK_DATA === 'true';

export async function list() {
  return useMock() ? mockSuppliers : cosmosService.listSuppliers();
}

export async function get(id) {
  if (useMock()) return mockSuppliers.find((s) => s.id === id) ?? null;
  return cosmosService.getSupplier(id);
}

export async function create(data) {
  const supplier = { id: `sup-${Date.now()}`, leadTimeDays: 0, ...data };
  if (useMock()) {
    mockSuppliers.push(supplier);
    return supplier;
  }
  return cosmosService.createSupplier(supplier);
}

export async function update(id, data) {
  if (useMock()) {
    const idx = mockSuppliers.findIndex((s) => s.id === id);
    if (idx === -1) {
      const e = new Error('Supplier not found');
      e.status = 404;
      throw e;
    }
    mockSuppliers[idx] = { ...mockSuppliers[idx], ...data, id };
    return mockSuppliers[idx];
  }
  const existing = await cosmosService.getSupplier(id);
  if (!existing) {
    const e = new Error('Supplier not found');
    e.status = 404;
    throw e;
  }
  return cosmosService.updateSupplier(id, { ...existing, ...data, id });
}

export async function remove(id) {
  if (useMock()) {
    const idx = mockSuppliers.findIndex((s) => s.id === id);
    if (idx !== -1) mockSuppliers.splice(idx, 1);
    return { id };
  }
  return cosmosService.deleteSupplier(id);
}
