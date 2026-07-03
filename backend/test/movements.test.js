import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MOCK_DATA = 'true';

const movementService = await import('../services/movementService.js');
const poService = await import('../services/purchaseOrderService.js');

test('record derives type from delta sign and lists by product', async () => {
  await movementService.record({
    productId: 'sku-test',
    productName: 'Test',
    delta: -3,
    quantityAfter: 5,
    reason: 'shrinkage',
    source: 'manual',
  });
  const moves = await movementService.listByProduct('sku-test');
  assert.equal(moves.length, 1);
  assert.equal(moves[0].type, 'out');
  assert.equal(moves[0].username, 'system');
});

test('record captures the acting user', async () => {
  const m = await movementService.record({
    productId: 'sku-test2',
    productName: 'Test2',
    delta: 5,
    quantityAfter: 5,
    actor: { sub: 'user-admin', username: 'admin' },
  });
  assert.equal(m.type, 'in');
  assert.equal(m.username, 'admin');
  assert.equal(m.userId, 'user-admin');
});

test('receiving a PO writes an in-movement from purchase_order', async () => {
  const po = await poService.create({
    supplierId: 'sup-1',
    items: [{ productId: 'sku-1001', name: 'Wireless Mouse', quantity: 7, unitCost: 10 }],
  });
  await poService.approve(po.id);
  await poService.receive(po.id, { sub: 'user-admin', username: 'admin' });

  const moves = await movementService.listByProduct('sku-1001');
  const poMove = moves.find((m) => m.source === 'purchase_order' && m.delta === 7);
  assert.ok(poMove, 'expected a purchase_order movement of +7');
  assert.equal(poMove.type, 'in');
  assert.equal(poMove.username, 'admin');
});

test('listRecent returns newest first', async () => {
  const recent = await movementService.listRecent(5);
  for (let i = 1; i < recent.length; i += 1) {
    assert.ok(recent[i - 1].createdAt >= recent[i].createdAt);
  }
});
