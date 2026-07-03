// Purchase order routes. Approve + delete are admin-only; receiving updates stock.
import { Router } from 'express';

import * as purchaseOrderService from '../services/purchaseOrderService.js';
import { validatePurchaseOrderBody } from '../middleware/validate.js';
import { requireRole } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await purchaseOrderService.list());
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const po = await purchaseOrderService.get(req.params.id);
    if (!po) {
      return res.status(404).json({ error: { status: 404, message: 'Purchase order not found' } });
    }
    res.json(po);
  } catch (err) {
    next(err);
  }
});

router.post('/', validatePurchaseOrderBody(), async (req, res, next) => {
  try {
    res.status(201).json(await purchaseOrderService.create(req.body));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    res.json(await purchaseOrderService.update(req.params.id, req.body ?? {}));
  } catch (err) {
    next(err);
  }
});

// Approve a draft PO (admin only).
router.post('/:id/approve', requireRole('admin'), async (req, res, next) => {
  try {
    res.json(await purchaseOrderService.approve(req.params.id));
  } catch (err) {
    next(err);
  }
});

// Receive an approved PO — increments stock for each line item.
router.post('/:id/receive', async (req, res, next) => {
  try {
    res.json(await purchaseOrderService.receive(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await purchaseOrderService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
