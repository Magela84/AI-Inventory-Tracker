// Inventory routes — CRUD + demand forecast
import { Router } from 'express';

import * as cosmosService from '../services/cosmosService.js';
import * as forecastService from '../services/forecastService.js';
import { validateProductBody } from '../middleware/validate.js';
import { requireRole } from '../middleware/requireAuth.js';
import { products as mockProducts } from '../mocks/inventory.js';

const router = Router();
const useMock = () => process.env.MOCK_DATA === 'true';

// GET /api/inventory — list all products (with projected demand + stock runway)
router.get('/', async (req, res, next) => {
  try {
    const products = useMock() ? mockProducts : await cosmosService.listProducts();
    const withRunway = products.map((p) => ({
      ...p,
      dailyDemand: forecastService.dailyDemand(p.demandHistory ?? []),
      runwayDays: forecastService.runwayDays(p.quantity, p.demandHistory ?? []),
    }));
    res.json(withRunway);
  } catch (err) {
    next(err);
  }
});

// GET /api/inventory/:id — single product
router.get('/:id', async (req, res, next) => {
  try {
    const product = useMock()
      ? mockProducts.find((p) => p.id === req.params.id) ?? null
      : await cosmosService.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: { status: 404, message: 'Product not found' } });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory — create product
router.post('/', validateProductBody({ requireName: true }), async (req, res, next) => {
  try {
    if (useMock()) {
      const created = { id: `sku-${Date.now()}`, ...req.body };
      mockProducts.push(created);
      return res.status(201).json(created);
    }
    const created = await cosmosService.createProduct(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/inventory/:id — update product
router.put('/:id', validateProductBody({ requireName: false }), async (req, res, next) => {
  try {
    if (useMock()) {
      const idx = mockProducts.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: { status: 404, message: 'Product not found' } });
      }
      mockProducts[idx] = { ...mockProducts[idx], ...req.body, id: req.params.id };
      return res.json(mockProducts[idx]);
    }
    const updated = await cosmosService.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/inventory/:id — remove product (admin only)
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    if (useMock()) {
      const idx = mockProducts.findIndex((p) => p.id === req.params.id);
      if (idx !== -1) mockProducts.splice(idx, 1);
      return res.status(204).end();
    }
    await cosmosService.deleteProduct(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/inventory/:id/forecast — demand forecast for a product
router.get('/:id/forecast', async (req, res, next) => {
  try {
    const horizon = Number(req.query.horizon) || 7;
    const product = useMock()
      ? mockProducts.find((p) => p.id === req.params.id)
      : await cosmosService.getProduct(req.params.id);

    if (!product) {
      return res.status(404).json({ error: { status: 404, message: 'Product not found' } });
    }

    const history = product.demandHistory ?? [];
    const forecast = forecastService.forecast(history, horizon);

    res.json({
      productId: product.id,
      history: history.map((h) => ({ period: h.timestamp, actual: h.value })),
      forecast: forecast.map((f) => ({ period: f.period, forecast: f.value })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
