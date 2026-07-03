// AI Inventory Tracker — Express server entrypoint
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import inventoryRoutes from './routes/inventory.js';
import alertsRoutes from './routes/alerts.js';
import aiRoutes from './routes/ai.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiKeyAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// Larger limit accommodates base64 image uploads for the vision intake endpoint.
app.use(express.json({ limit: '10mb' }));

// Health check (public — not behind auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mock: process.env.MOCK_DATA === 'true' });
});

// Guard feature routes with optional API-key auth (no-op when API_KEY unset).
app.use('/api', apiKeyAuth);

// Feature routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/ai', aiRoutes);

// Centralized error handling (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`AI Inventory Tracker backend listening on port ${PORT}`);
});

export default app;
