import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MOCK_DATA = 'true';

const authService = await import('../services/authService.js');

test('register creates a local user and can then authenticate by email', async () => {
  const user = await authService.register({
    name: 'Pat',
    email: 'Pat@Gmail.com',
    password: 'secret1',
  });
  assert.equal(user.provider, 'local');
  assert.equal(user.email, 'pat@gmail.com'); // normalized to lowercase
  assert.equal(user.role, 'staff');

  const ok = await authService.authenticate('pat@gmail.com', 'secret1');
  assert.ok(ok, 'should authenticate with the registered email');
  const bad = await authService.authenticate('pat@gmail.com', 'wrong');
  assert.equal(bad, null);
});

test('register rejects a duplicate email', async () => {
  await authService.register({ name: 'A', email: 'dup@gmail.com', password: 'secret1' });
  await assert.rejects(
    () => authService.register({ name: 'B', email: 'dup@gmail.com', password: 'secret2' }),
    /already exists/i
  );
});

test('existing seeded user can log in with username or email', async () => {
  assert.ok(await authService.authenticate('admin', 'admin123'));
  assert.ok(await authService.authenticate('admin@example.com', 'admin123'));
});

test('provisionGoogleUser creates a passwordless google user, idempotently', async () => {
  const first = await authService.provisionGoogleUser({ email: 'g@gmail.com', name: 'Gee' });
  assert.equal(first.provider, 'google');
  assert.equal(first.passwordHash, null);

  const second = await authService.provisionGoogleUser({ email: 'g@gmail.com', name: 'Gee' });
  assert.equal(second.id, first.id, 'should return the existing user, not a duplicate');

  // A google (passwordless) user cannot log in via password.
  assert.equal(await authService.authenticate('g@gmail.com', 'anything'), null);
});
