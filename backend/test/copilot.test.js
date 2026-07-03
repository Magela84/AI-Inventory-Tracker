import test from 'node:test';
import assert from 'node:assert/strict';

// The copilot reads MOCK_DATA at call time; force the mock driver for tests.
process.env.MOCK_DATA = 'true';

const { run } = await import('../services/copilotService.js');

// These run in definition order and share the in-memory mock inventory, so the
// sequence mirrors a real conversation: query low stock -> reorder -> re-check.

test('low-stock query lists the low items without mutating', async () => {
  const r = await run([{ role: 'user', content: "what's low on stock?" }]);
  assert.equal(r.changed, false);
  assert.match(r.reply, /low/i);
});

test('reorder-below-threshold mutates inventory and reports actions', async () => {
  const r = await run([{ role: 'user', content: 'reorder everything below threshold' }]);
  assert.equal(r.changed, true);
  assert.ok(r.actions.length > 0);
  assert.ok(r.actions.every((a) => typeof a.summary === 'string'));
});

test('after reordering, nothing is below threshold', async () => {
  const r = await run([{ role: 'user', content: 'what is low on stock?' }]);
  assert.match(r.reply, /above/i);
});

test('unrecognized input returns the help fallback', async () => {
  const r = await run([{ role: 'user', content: 'hello there' }]);
  assert.equal(r.changed, false);
  assert.match(r.reply, /Copilot/);
});
