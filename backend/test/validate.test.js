import test from 'node:test';
import assert from 'node:assert/strict';

import { validateProduct } from '../middleware/validate.js';

test('valid product passes with no errors', () => {
  assert.deepEqual(
    validateProduct({ name: 'A', category: 'X', quantity: 1, reorderThreshold: 2, unitPrice: 3 }),
    []
  );
});

test('missing name fails when required', () => {
  const errors = validateProduct({ quantity: 1 });
  assert.ok(errors.some((m) => m.includes('name')));
});

test('missing name is allowed for partial updates', () => {
  assert.deepEqual(validateProduct({ quantity: 1 }, { requireName: false }), []);
});

test('negative quantity is rejected', () => {
  assert.ok(validateProduct({ name: 'A', quantity: -1 }).some((m) => m.includes('quantity')));
});

test('non-numeric price is rejected', () => {
  assert.ok(validateProduct({ name: 'A', unitPrice: 'free' }).some((m) => m.includes('unitPrice')));
});

test('non-object body is rejected', () => {
  assert.ok(validateProduct(null).length > 0);
  assert.ok(validateProduct([]).length > 0);
});
