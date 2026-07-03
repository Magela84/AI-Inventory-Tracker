// Mock inventory data — used when MOCK_DATA=true
export const products = [
  {
    id: 'sku-1001',
    name: 'Wireless Mouse',
    category: 'Accessories',
    quantity: 42,
    reorderThreshold: 20,
    unitPrice: 24.99,
    // Recent daily demand series (oldest -> newest)
    demandHistory: [
      { timestamp: '2026-06-25', value: 5 },
      { timestamp: '2026-06-26', value: 6 },
      { timestamp: '2026-06-27', value: 4 },
      { timestamp: '2026-06-28', value: 7 },
      { timestamp: '2026-06-29', value: 6 },
      { timestamp: '2026-06-30', value: 8 },
      { timestamp: '2026-07-01', value: 5 },
    ],
  },
  {
    id: 'sku-1002',
    name: 'Mechanical Keyboard',
    category: 'Accessories',
    quantity: 12,
    reorderThreshold: 15,
    unitPrice: 89.0,
    demandHistory: [
      { timestamp: '2026-06-25', value: 3 },
      { timestamp: '2026-06-26', value: 2 },
      { timestamp: '2026-06-27', value: 4 },
      { timestamp: '2026-06-28', value: 3 },
      { timestamp: '2026-06-29', value: 30 },
      { timestamp: '2026-06-30', value: 2 },
      { timestamp: '2026-07-01', value: 3 },
    ],
  },
  {
    id: 'sku-1003',
    name: 'USB-C Hub',
    category: 'Connectivity',
    quantity: 8,
    reorderThreshold: 10,
    unitPrice: 39.5,
    demandHistory: [
      { timestamp: '2026-06-25', value: 2 },
      { timestamp: '2026-06-26', value: 3 },
      { timestamp: '2026-06-27', value: 2 },
      { timestamp: '2026-06-28', value: 4 },
      { timestamp: '2026-06-29', value: 3 },
      { timestamp: '2026-06-30', value: 5 },
      { timestamp: '2026-07-01', value: 4 },
    ],
  },
];

export default products;
