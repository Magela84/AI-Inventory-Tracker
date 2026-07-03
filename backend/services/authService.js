// Auth service — user authentication, JWT issuance, and user management.
//
// Shares the MOCK_DATA toggle used across the app: mock users live in
// backend/mocks/users.js; real users live in a Cosmos `users` container.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

import * as cosmosService from './cosmosService.js';
import { newId } from '../utils/id.js';
import { users as mockUsers } from '../mocks/users.js';

const useMock = () => process.env.MOCK_DATA === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = process.env.JWT_TTL || '8h';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
// Emails that should be granted the admin role on first Google/self signup.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ROLES = ['admin', 'staff'];

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function defaultRoleFor(email) {
  return ADMIN_EMAILS.includes(String(email).toLowerCase()) ? 'admin' : 'staff';
}

// Strip the password hash before returning a user to callers.
export function sanitize(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

// Find a user by username OR email (used by login + provisioning).
async function findByIdentifier(identifier) {
  if (useMock()) {
    return mockUsers.find((u) => u.username === identifier || u.email === identifier) ?? null;
  }
  return cosmosService.getUserByIdentifier(identifier);
}

async function findById(id) {
  if (useMock()) return mockUsers.find((u) => u.id === id) ?? null;
  return cosmosService.getUserByUsername
    ? (await cosmosService.listUsers()).find((u) => u.id === id) ?? null
    : null;
}

// Verify credentials (identifier = username or email); returns the raw user
// on success, else null. Users without a password (e.g. Google) can't log in
// via password.
export async function authenticate(identifier, password) {
  const user = await findByIdentifier(identifier);
  if (!user || !user.passwordHash) return null;
  return bcrypt.compareSync(password, user.passwordHash) ? user : null;
}

// Self-service signup with email + password. Returns the raw user.
export async function register({ name, email, password }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (await findByIdentifier(normalizedEmail)) {
    const e = new Error('An account with that email already exists');
    e.status = 409;
    throw e;
  }
  const user = {
    id: newId('user'),
    username: normalizedEmail,
    email: normalizedEmail,
    name: name?.trim() || normalizedEmail,
    role: defaultRoleFor(normalizedEmail),
    provider: 'local',
    passwordHash: bcrypt.hashSync(password, 8),
  };
  if (useMock()) {
    mockUsers.push(user);
    return user;
  }
  return cosmosService.createUser(user);
}

// Verify a Google ID token and find-or-create the corresponding user.
export async function authenticateWithGoogle(credential) {
  if (!googleClient) {
    const e = new Error('Google sign-in is not configured');
    e.status = 501;
    throw e;
  }
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    const e = new Error('Invalid Google credential');
    e.status = 401;
    throw e;
  }
  if (!payload?.email || !payload.email_verified) {
    const e = new Error('Google account email is not verified');
    e.status = 401;
    throw e;
  }
  return provisionGoogleUser({ email: payload.email, name: payload.name, sub: payload.sub });
}

// Find-or-create a user from a verified Google profile. Returns the raw user.
export async function provisionGoogleUser({ email, name }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await findByIdentifier(normalizedEmail);
  if (existing) return existing;

  const user = {
    id: newId('user'),
    username: normalizedEmail,
    email: normalizedEmail,
    name: name || normalizedEmail,
    role: defaultRoleFor(normalizedEmail),
    provider: 'google',
    passwordHash: null,
  };
  if (useMock()) {
    mockUsers.push(user);
    return user;
  }
  return cosmosService.createUser(user);
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

export async function createUser({ username, password, name = '', role = 'staff', email }) {
  if (!ROLES.includes(role)) {
    const e = new Error(`role must be one of: ${ROLES.join(', ')}`);
    e.status = 400;
    throw e;
  }
  if (await findByIdentifier(username)) {
    const e = new Error('Username already exists');
    e.status = 409;
    throw e;
  }
  const user = {
    id: newId('user'),
    username,
    email: email ?? username,
    name,
    role,
    provider: 'local',
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
