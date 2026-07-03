// Mock alerts data — used when MOCK_DATA=true
export const lowStock = [
  {
    id: 'sku-1002',
    name: 'Mechanical Keyboard',
    quantity: 12,
    reorderThreshold: 15,
    severity: 'warning',
  },
  {
    id: 'sku-1003',
    name: 'USB-C Hub',
    quantity: 8,
    reorderThreshold: 10,
    severity: 'critical',
  },
];

// Anomalies keyed by product id
export const anomalies = {
  'sku-1002': {
    productId: 'sku-1002',
    anomalies: [
      { timestamp: '2026-06-29', value: 30, expectedValue: 3, isAnomaly: true },
    ],
  },
};

export default { lowStock, anomalies };
