// Purchase order service — PO lifecycle (draft -> approved -> received).
//
// Receiving a PO increments the stock quantity of each line item's product,
// which is the link between purchasing and inventory.
import * as cosmosService from './cosmosService.js';
import * as supplierService from './supplierService.js';
import { purchaseOrders as mockPOs } from '../mocks/purchaseOrders.js';
import { products as mockProducts } from '../mocks/inventory.js';

const useMock = () => process.env.MOCK_DATA === 'true';

function computeTotal(items = []) {
  return items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);
}

function notFound() {
  const e = new Error('Purchase order not found');
  e.status = 404;
  return e;
}

function badState(message) {
  const e = new Error(message);
  e.status = 409;
  return e;
}

// Adjust a product's stock by `delta` (mock array or Cosmos).
async function adjustStock(productId, delta) {
  if (useMock()) {
    const product = mockProducts.find((p) => p.id === productId);
    if (product) product.quantity = (product.quantity || 0) + delta;
    return;
  }
  const product = await cosmosService.getProduct(productId);
  if (product) {
    await cosmosService.updateProduct(productId, {
      ...product,
      quantity: (product.quantity || 0) + delta,
    });
  }
}

async function save(po) {
  if (useMock()) {
    const idx = mockPOs.findIndex((p) => p.id === po.id);
    if (idx !== -1) mockPOs[idx] = po;
    return po;
  }
  return cosmosService.updatePurchaseOrder(po.id, po);
}

export async function list() {
  return useMock() ? mockPOs : cosmosService.listPurchaseOrders();
}

export async function get(id) {
  if (useMock()) return mockPOs.find((p) => p.id === id) ?? null;
  return cosmosService.getPurchaseOrder(id);
}

export async function create({ supplierId, items = [] }) {
  const supplier = await supplierService.get(supplierId);
  const resolvedItems = items.map((i) => ({
    productId: i.productId,
    name: i.name,
    quantity: Number(i.quantity) || 0,
    unitCost: Number(i.unitCost) || 0,
  }));
  const po = {
    id: `po-${Date.now()}`,
    supplierId,
    supplierName: supplier?.name ?? 'Unknown supplier',
    status: 'draft',
    items: resolvedItems,
    total: computeTotal(resolvedItems),
    createdAt: new Date().toISOString(),
    approvedAt: null,
    receivedAt: null,
  };
  if (useMock()) {
    mockPOs.push(po);
    return po;
  }
  return cosmosService.createPurchaseOrder(po);
}

// Edit a PO — only allowed while it's still a draft.
export async function update(id, fields = {}) {
  const po = await get(id);
  if (!po) throw notFound();
  if (po.status !== 'draft') throw badState('Only draft purchase orders can be edited');

  const items = fields.items
    ? fields.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: Number(i.quantity) || 0,
        unitCost: Number(i.unitCost) || 0,
      }))
    : po.items;

  const updated = { ...po, ...fields, items, total: computeTotal(items), id };
  return save(updated);
}

export async function approve(id) {
  const po = await get(id);
  if (!po) throw notFound();
  if (po.status !== 'draft') throw badState('Only draft purchase orders can be approved');
  return save({ ...po, status: 'approved', approvedAt: new Date().toISOString() });
}

// Receive a PO: mark received and increment stock for every line item.
export async function receive(id) {
  const po = await get(id);
  if (!po) throw notFound();
  if (po.status !== 'approved') throw badState('Only approved purchase orders can be received');

  for (const item of po.items) {
    await adjustStock(item.productId, Number(item.quantity) || 0);
  }
  return save({ ...po, status: 'received', receivedAt: new Date().toISOString() });
}

export async function remove(id) {
  if (useMock()) {
    const idx = mockPOs.findIndex((p) => p.id === id);
    if (idx !== -1) mockPOs.splice(idx, 1);
    return { id };
  }
  return cosmosService.deletePurchaseOrder(id);
}
