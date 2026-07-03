// Alerts routes — low-stock alerts + anomaly detection
import { Router } from 'express';

import * as cosmosService from '../services/cosmosService.js';
import * as anomalyService from '../services/anomalyService.js';
import { lowStock as mockLowStock, anomalies as mockAnomalies } from '../mocks/alerts.js';

const router = Router();
const useMock = () => process.env.MOCK_DATA === 'true';

// GET /api/alerts/low-stock — products below reorder threshold
router.get('/low-stock', async (req, res, next) => {
  try {
    if (useMock()) {
      return res.json(mockLowStock);
    }
    // TODO: derive from cosmosService.listProducts() where quantity <= reorderThreshold
    const products = await cosmosService.listProducts();
    const low = products.filter((p) => p.quantity <= p.reorderThreshold);
    res.json(low);
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts/anomalies/:id — anomaly detection for a product's demand series
router.get('/anomalies/:id', async (req, res, next) => {
  try {
    if (useMock()) {
      return res.json(
        mockAnomalies[req.params.id] ?? { productId: req.params.id, anomalies: [] }
      );
    }
    const product = await cosmosService.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: { status: 404, message: 'Product not found' } });
    }
    const { anomalies } = await anomalyService.detectEntireSeries(product.demandHistory ?? []);
    res.json({ productId: req.params.id, anomalies });
  } catch (err) {
    next(err);
  }
});

export default router;
