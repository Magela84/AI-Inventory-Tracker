// Supplier routes. Reads: any authenticated user. Delete: admin only.
import { Router } from 'express';

import * as supplierService from '../services/supplierService.js';
import { validateSupplierBody } from '../middleware/validate.js';
import { requireRole } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await supplierService.list());
  } catch (err) {
    next(err);
  }
});

router.post('/', validateSupplierBody({ requireName: true }), async (req, res, next) => {
  try {
    res.status(201).json(await supplierService.create(req.body));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validateSupplierBody({ requireName: false }), async (req, res, next) => {
  try {
    res.json(await supplierService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await supplierService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
