// Auth routes — login + current user.
import { Router } from 'express';

import * as authService from '../services/authService.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// POST /api/auth/login — exchange credentials for a JWT.
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
