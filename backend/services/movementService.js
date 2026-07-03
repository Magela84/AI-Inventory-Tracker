// Movement service — the stock-movement ledger (audit trail of every in/out).
import * as cosmosService from './cosmosService.js';
import { newId } from '../utils/id.js';
import { movements as mockMovements } from '../mocks/movements.js';

const useMock = () => process.env.MOCK_DATA === 'true';

// Record a movement. `delta` is signed (positive = in, negative = out).
// `actor` is the acting user ({ sub/id, username }) or omitted for system events.
export async function record({
  productId,
  productName,
  delta,
  quantityAfter,
  reason = '',
  source = 'manual',
  actor,
}) {
  const movement = {
    id: newId('mv'),
    productId,
    productName,
    type: delta >= 0 ? 'in' : 'out',
    delta,
    quantityAfter,
    reason,
    source,
    userId: actor?.sub ?? actor?.id ?? null,
    username: actor?.username ?? 'system',
    createdAt: new Date().toISOString(),
  };
  if (useMock()) {
    mockMovements.unshift(movement);
    return movement;
  }
  return cosmosService.createMovement(movement);
}

export async function listByProduct(productId) {
  if (useMock()) return mockMovements.filter((m) => m.productId === productId);
  return cosmosService.getMovementsByProduct(productId);
}

export async function listRecent(limit = 50) {
  const all = useMock() ? mockMovements : await cosmosService.listMovements();
  return [...all]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}
