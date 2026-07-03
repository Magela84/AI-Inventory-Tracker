// Auth routes — login + current user.
import { Router } from 'express';

import * as authService from '../services/authService.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/login — exchange credentials (username or email) for a JWT.
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: { status: 400, message: 'username and password are required' } });
    }
    const user = await authService.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ error: { status: 401, message: 'Invalid credentials' } });
    }
    res.json({ token: authService.signToken(user), user: authService.sanitize(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register — self-service signup with email + password.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: { status: 400, message: 'A valid email is required' } });
    }
    if (!password || String(password).length < 6) {
      return res
        .status(400)
        .json({ error: { status: 400, message: 'Password must be at least 6 characters' } });
    }
    const user = await authService.register({ name, email, password });
    res.status(201).json({ token: authService.signToken(user), user: authService.sanitize(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/google — sign in / up with a Google ID token (credential).
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body ?? {};
    if (!credential) {
      return res.status(400).json({ error: { status: 400, message: 'credential is required' } });
    }
    const user = await authService.authenticateWithGoogle(credential);
    res.json({ token: authService.signToken(user), user: authService.sanitize(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — the currently authenticated user (from the token).
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.sub,
      username: req.user.username,
      role: req.user.role,
      name: req.user.name,
    },
  });
});

export default router;
