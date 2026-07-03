// User management routes — admin only. Mounted after requireAuth.
import { Router } from 'express';

import * as authService from '../services/authService.js';
import { requireRole } from '../middleware/requireAuth.js';

const router = Router();

// Every route here requires the admin role.
router.use(requireRole('admin'));

// GET /api/users — list users (without password hashes)
router.get('/', async (req, res, next) => {
  try {
    res.json(await authService.listUsers());
  } catch (err) {
    next(err);
  }
});

// POST /api/users — create a user
router.post('/', async (req, res, next) => {
  try {
    const { username, password, name, role } = req.body ?? {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: { status: 400, message: 'username and password are required' } });
    }
    res.status(201).json(await authService.createUser({ username, password, name, role }));
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — update name, role, and/or password
router.put('/:id', async (req, res, next) => {
  try {
    res.json(await authService.updateUser(req.params.id, req.body ?? {}));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id — remove a user
router.delete('/:id', async (req, res, next) => {
  try {
    await authService.deleteUser(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
