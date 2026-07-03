// Mock AI data — used when MOCK_DATA=true
export const searchResults = [
  {
    id: 'sku-1003',
    name: 'USB-C Hub',
    category: 'Connectivity',
    quantity: 8,
    reason: 'Matched "low stock connectivity accessories".',
  },
];

export const reorderSuggestions = [
  {
    id: 'sku-1003',
    name: 'USB-C Hub',
    currentQuantity: 8,
    suggestedReorderQuantity: 40,
    rationale: 'Below threshold with steady upward demand trend.',
  },
  {
    id: 'sku-1002',
    name: 'Mechanical Keyboard',
    currentQuantity: 12,
    suggestedReorderQuantity: 25,
    rationale: 'Recent demand spike; approaching reorder threshold.',
  },
];

// Canned extraction returned by POST /api/ai/extract when MOCK_DATA=true —
// simulates GPT-4o Vision reading a supplier invoice.
export const extractedProducts = [
  { name: 'HDMI Cable 2m', category: 'Connectivity', quantity: 100, reorderThreshold: 25, unitPrice: 8.25 },
  { name: 'Laptop Stand', category: 'Accessories', quantity: 40, reorderThreshold: 10, unitPrice: 34.0 },
  { name: 'Webcam 1080p', category: 'Accessories', quantity: 25, reorderThreshold: 8, unitPrice: 59.99 },
];

export default { searchResults, reorderSuggestions, extractedProducts };
