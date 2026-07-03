// Auth service — user authentication, JWT issuance, and user management.
//
// Shares the MOCK_DATA toggle used across the app: mock users live in
// backend/mocks/users.js; real users live in a Cosmos `users` container.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import * as cosmosService from './cosmosService.js';
import { users as mockUsers } from '../mocks/users.js';

const useMock = () => process.env.MOCK_DATA === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = process.env.JWT_TTL || '8h';

export const ROLES = ['admin', 'staff'];

// Strip the password hash before returning a user to callers.
export function sanitize(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

async function findByUsername(username) {
  if (useMock()) return mockUsers.find((u) => u.username === username) ?? null;
  return cosmosService.getUserByUsername(username);
}

async function findById(id) {
  if (useMock()) return mockUsers.find((u) => u.id === id) ?? null;
  return cosmosService.getUserByUsername
    ? (await cosmosService.listUsers()).find((u) => u.id === id) ?? null
    : null;
}

// Verify credentials; returns the (raw) user on success, else null.
export async function authenticate(username, password) {
  const user = await findByUsername(username);
  if (!user) return null;
  return bcrypt.compareSync(password, user.passwordHash) ? user : null;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Verify a JWT; throws if invalid/expired.
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ---------------------------------------------------------------------------
// User management (admin)
// ---------------------------------------------------------------------------

export async function listUsers() {
  const list = useMock() ? mockUsers : await cosmosService.listUsers();
  return list.map(sanitize);
}

export async function createUser({ username, password, name = '', role = 'staff' }) {
  if (!ROLES.includes(role)) {
    const e = new Error(`role must be one of: ${ROLES.join(', ')}`);
    e.status = 400;
    throw e;
  }
  if (await findByUsername(username)) {
    const e = new Error('Username already exists');
    e.status = 409;
    throw e;
  }
  const user = {
    id: `user-${Date.now()}`,
    username,
    name,
    role,
    passwordHash: bcrypt.hashSync(password, 8),
  };
  if (useMock()) {
    mockUsers.push(user);
    return sanitize(user);
  }
  return sanitize(await cosmosService.createUser(user));
}

export async function updateUser(id, { name, role, password } = {}) {
  const existing = await findById(id);
  if (!existing) {
    const e = new Error('User not found');
    e.status = 404;
    throw e;
  }
  if (role != null && !ROLES.includes(role)) {
    const e = new Error(`role must be one of: ${ROLES.join(', ')}`);
    e.status = 400;
    throw e;
  }
  const updated = {
    ...existing,
    ...(name != null ? { name } : {}),
    ...(role != null ? { role } : {}),
    ...(password ? { passwordHash: bcrypt.hashSync(password, 8) } : {}),
  };
  if (useMock()) {
    const idx = mockUsers.findIndex((u) => u.id === id);
    mockUsers[idx] = updated;
    return sanitize(updated);
  }
  return sanitize(await cosmosService.updateUser(id, updated));
}

export async function deleteUser(id) {
  if (useMock()) {
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx !== -1) mockUsers.splice(idx, 1);
    return { id };
  }
  return cosmosService.deleteUser(id);
}
