// Mock purchase orders for MOCK_DATA=true.
// Status lifecycle: draft -> approved -> received (receiving updates stock).
export const purchaseOrders = [
  {
    id: 'po-1001',
    supplierId: 'sup-1',
    supplierName: 'Acme Distributors',
    status: 'approved',
    items: [{ productId: 'sku-1003', name: 'USB-C Hub', quantity: 40, unitCost: 30 }],
    total: 1200,
    createdAt: '2026-07-01T09:00:00Z',
    approvedAt: '2026-07-01T10:00:00Z',
    receivedAt: null,
  },
  {
    id: 'po-1002',
    supplierId: 'sup-2',
    supplierName: 'Global Components',
    status: 'draft',
    items: [{ productId: 'sku-1002', name: 'Mechanical Keyboard', quantity: 25, unitCost: 55 }],
    total: 1375,
    createdAt: '2026-07-02T14:30:00Z',
    approvedAt: null,
    receivedAt: null,
  },
];

export default purchaseOrders;
