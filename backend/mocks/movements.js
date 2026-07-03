// Mock stock-movement ledger for MOCK_DATA=true (newest first).
// type: 'in' | 'out'  ·  source: 'seed' | 'manual' | 'purchase_order'
export const movements = [
  {
    id: 'mv-seed-3',
    productId: 'sku-1003',
    productName: 'USB-C Hub',
    type: 'in',
    delta: 8,
    quantityAfter: 8,
    reason: 'Initial stock',
    source: 'seed',
    userId: null,
    username: 'system',
    createdAt: '2026-06-25T08:00:00Z',
  },
  {
    id: 'mv-seed-2',
    productId: 'sku-1002',
    productName: 'Mechanical Keyboard',
    type: 'in',
    delta: 12,
    quantityAfter: 12,
    reason: 'Initial stock',
    source: 'seed',
    userId: null,
    username: 'system',
    createdAt: '2026-06-25T08:00:00Z',
  },
  {
    id: 'mv-seed-1',
    productId: 'sku-1001',
    productName: 'Wireless Mouse',
    type: 'in',
    delta: 42,
    quantityAfter: 42,
    reason: 'Initial stock',
    source: 'seed',
    userId: null,
    username: 'system',
    createdAt: '2026-06-25T08:00:00Z',
  },
];

export default movements;
