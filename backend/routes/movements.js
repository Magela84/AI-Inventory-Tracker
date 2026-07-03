// Movements route — recent stock-movement ledger across all products.
import { Router } from 'express';

import * as movementService from '../services/movementService.js';

const router = Router();

// GET /api/movements?limit=50 — most recent movements (newest first)
router.get('/', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;
    res.json(await movementService.listRecent(limit));
  } catch (err) {
    next(err);
  }
});

export default router;
