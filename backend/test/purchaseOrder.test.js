import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MOCK_DATA = 'true';

const poService = await import('../services/purchaseOrderService.js');
const { products: mockProducts } = await import('../mocks/inventory.js');
const { validatePurchaseOrder } = await import('../middleware/validate.js');

test('create makes a draft with a computed total', async () => {
  const po = await poService.create({
    supplierId: 'sup-1',
    items: [{ productId: 'sku-1001', name: 'Wireless Mouse', quantity: 10, unitCost: 20 }],
  });
  assert.equal(po.status, 'draft');
  assert.equal(po.total, 200);
  assert.equal(po.supplierName, 'Acme Distributors');
});

test('draft cannot be received (must be approved first)', async () => {
  const po = await poService.create({
    supplierId: 'sup-1',
    items: [{ productId: 'sku-1001', name: 'Wireless Mouse', quantity: 5, unitCost: 20 }],
  });
  await assert.rejects(() => poService.receive(po.id), /approved/i);
});

test('approve then receive increments product stock', async () => {
  const product = mockProducts.find((p) => p.id === 'sku-1001');
  const before = product.quantity;

  const po = await poService.create({
    supplierId: 'sup-1',
    items: [{ productId: 'sku-1001', name: 'Wireless Mouse', quantity: 15, unitCost: 20 }],
  });
  await poService.approve(po.id);
  const received = await poService.receive(po.id);

  assert.equal(received.status, 'received');
  assert.ok(received.receivedAt);
  assert.equal(mockProducts.find((p) => p.id === 'sku-1001').quantity, before + 15);
});

test('cannot approve an already-approved PO', async () => {
  const po = await poService.create({
    supplierId: 'sup-1',
    items: [{ productId: 'sku-1001', name: 'Wireless Mouse', quantity: 1, unitCost: 1 }],
  });
  await poService.approve(po.id);
  await assert.rejects(() => poService.approve(po.id), /draft/i);
});

test('validatePurchaseOrder rejects empty items and missing supplier', () => {
  assert.ok(validatePurchaseOrder({ items: [] }).length > 0);
  assert.ok(validatePurchaseOrder({ supplierId: 's', items: [{ productId: 'p', quantity: 0 }] }).length > 0);
  assert.deepEqual(
    validatePurchaseOrder({ supplierId: 's', items: [{ productId: 'p', quantity: 3 }] }),
    []
  );
});
