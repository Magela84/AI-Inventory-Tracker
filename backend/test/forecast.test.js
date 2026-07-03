import test from 'node:test';
import assert from 'node:assert/strict';

import { smooth, forecast, dailyDemand, runwayDays } from '../services/forecastService.js';

test('smooth: first value equals first observation', () => {
  assert.equal(smooth([5, 6, 4])[0], 5);
});

test('smooth: alpha=1 tracks the input exactly', () => {
  assert.deepEqual(smooth([5, 6, 4], 1), [5, 6, 4]);
});

test('smooth: alpha=0 stays at the first value', () => {
  assert.deepEqual(smooth([5, 6, 4], 0), [5, 5, 5]);
});

test('forecast: flat at the last smoothed level for the whole horizon', () => {
  const history = [
    { timestamp: '2026-06-25', value: 5 },
    { timestamp: '2026-06-26', value: 6 },
  ];
  const f = forecast(history, 3);
  assert.equal(f.length, 3); // S0=5, S1=5.5 -> level 5.5
  assert.equal(f[0].value, 5.5);
  assert.ok(f.every((p) => p.value === 5.5));
});

test('forecast: empty history returns empty', () => {
  assert.deepEqual(forecast([], 5), []);
});

test('dailyDemand: returns the smoothed level', () => {
  assert.equal(dailyDemand([{ timestamp: 'd', value: 10 }]), 10);
});

test('runwayDays: floor(quantity / daily demand)', () => {
  assert.equal(runwayDays(25, [{ timestamp: 'd', value: 10 }]), 2);
});

test('runwayDays: null when there is no demand signal', () => {
  assert.equal(runwayDays(25, [{ timestamp: 'd', value: 0 }]), null);
});
