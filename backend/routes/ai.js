// AI routes — natural language search + reorder suggestions
import { Router } from 'express';

import * as openaiService from '../services/openaiService.js';
import * as cosmosService from '../services/cosmosService.js';
import * as copilotService from '../services/copilotService.js';
import {
  searchResults as mockSearchResults,
  reorderSuggestions as mockReorderSuggestions,
  extractedProducts as mockExtractedProducts,
} from '../mocks/ai.js';

const router = Router();
const useMock = () => process.env.MOCK_DATA === 'true';

// POST /api/ai/search — natural language inventory search
router.post('/search', async (req, res, next) => {
  try {
    const query = req.body?.query ?? '';
    if (useMock()) {
      return res.json({ query, results: mockSearchResults });
    }
    const products = await cosmosService.listProducts();
    const results = await openaiService.naturalLanguageSearch(query, products);
    res.json({ query, results });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/reorder-suggestions — AI-generated reorder recommendations
router.post('/reorder-suggestions', async (req, res, next) => {
  try {
    if (useMock()) {
      return res.json({ suggestions: mockReorderSuggestions });
    }
    const products = await cosmosService.listProducts();
    const suggestions = await openaiService.reorderSuggestions({ products, ...req.body });
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/extract — extract product rows from an uploaded image (GPT-4o Vision)
router.post('/extract', async (req, res, next) => {
  try {
    if (useMock()) {
      return res.json({ products: mockExtractedProducts });
    }
    const { imageDataUrl } = req.body ?? {};
    if (!imageDataUrl) {
      return res.status(400).json({ error: { status: 400, message: 'imageDataUrl is required' } });
    }
    const products = await openaiService.extractProductsFromImage(imageDataUrl);
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/copilot — conversational agent that can inspect + modify inventory
router.post('/copilot', async (req, res, next) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const result = await copilotService.run(messages);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
