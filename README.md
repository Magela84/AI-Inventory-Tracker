# AI Inventory Tracker

Smart inventory monitoring with demand forecasting, anomaly detection, and AI-powered
natural language search + reorder suggestions.

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| Backend      | Node.js + Express |
| Frontend     | React + Tailwind CSS + Recharts |
| Database     | Azure Cosmos DB (NoSQL, SQL API) |
| AI / NL      | Azure OpenAI (GPT-4o) — natural language search + reorder suggestions |
| Anomalies    | Azure Anomaly Detector |
| Forecasting  | Simple exponential smoothing (in-service) |
| Auth         | `@azure/identity` `DefaultAzureCredential` |

## Project Structure

```
ai-inventory-tracker/
├── backend/
│   ├── server.js              # Express entrypoint
│   ├── routes/                # inventory, alerts, ai, auth, users, suppliers,
│   │                          #   purchaseOrders, movements
│   ├── services/              # cosmos, anomaly, openai, forecast, copilot, auth,
│   │                          #   supplier, purchaseOrder, movement
│   ├── scripts/seed.js        # seed mock products into Cosmos DB
│   ├── mocks/                 # mock data for MOCK_DATA=true
│   ├── middleware/            # errorHandler
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/        # InventoryTable, LowStockAlerts, DemandForecastChart,
│   │   │                      #   AnomalyBadge, NaturalLanguageSearch, ReorderSuggestions,
│   │   │                      #   ProductForm (add/edit modal),
│   │   │                      #   ProductDetail (side panel: history + forecast + anomalies),
│   │   │                      #   Copilot (GPT-4o chat agent that acts on inventory),
│   │   │                      #   RunwayBar (days-of-stock indicator),
│   │   │                      #   PhotoIntake (GPT-4o Vision product scan),
│   │   │                      #   Login, UsersManager (auth + admin user mgmt),
│   │   │                      #   SuppliersManager, PurchaseOrders (procurement),
│   │   │                      #   MovementsLedger (stock audit trail)
│   │   ├── context/AuthContext.jsx  # current user + JWT state
│   │   ├── pages/Dashboard.jsx
│   │   ├── lib/api.js         # backend API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── index.html
├── package.json               # root — orchestrates backend + frontend
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# then fill in your Azure endpoints/keys
```

Leave `MOCK_DATA=true` to run against local mock data with no Azure resources.

### 3. Run

Run against mock data (no Azure required):

```bash
npm run mock
```

Run in full dev mode (uses real Azure services when `MOCK_DATA=false`):

```bash
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

### 4. Build the frontend

```bash
npm run build
```

### 5. (Optional) Provision Azure + seed Cosmos DB

To run against real Azure services, provision the resources with the included
script (requires the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
and `az login`, plus [Azure OpenAI access](https://aka.ms/oai/access)):

```bash
bash backend/scripts/provision.sh
```

It creates a resource group, Cosmos DB (SQL API, partition key `/id`), an Azure
OpenAI account with a `gpt-4o` deployment, and an Anomaly Detector — then prints
the exact values to paste into `backend/.env`.

Then seed the sample products into Cosmos (creates the database/container if
needed and upserts each mock product):

```bash
npm run seed            # from repo root
# or: npm run seed --prefix backend
```

After seeding, set `MOCK_DATA=false` and run `npm run dev` to serve real data.
Adding, editing, or deleting products from the dashboard then persists to Cosmos.

### Testing

```bash
npm test                # runs the backend unit suite (node:test, zero deps)
```

Covers the forecast math, request validation, and the copilot tool driver.

## Environment Variables

See [`backend/.env.example`](backend/.env.example).

| Variable | Description |
|----------|-------------|
| `AZURE_COSMOS_ENDPOINT` / `AZURE_COSMOS_KEY` | Cosmos DB connection |
| `AZURE_COSMOS_DATABASE` / `AZURE_COSMOS_CONTAINER` | Database + product container names |
| `AZURE_COSMOS_USERS_CONTAINER` | Users container name (default `users`) |
| `AZURE_COSMOS_SUPPLIERS_CONTAINER` | Suppliers container (default `suppliers`) |
| `AZURE_COSMOS_PURCHASE_ORDERS_CONTAINER` | Purchase orders container (default `purchaseOrders`) |
| `AZURE_COSMOS_MOVEMENTS_CONTAINER` | Movements/ledger container (default `movements`) |
| `JWT_SECRET` | Secret for signing user JWTs (set a long random value in production) |
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_KEY` / `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI (GPT-4o) |
| `AZURE_OPENAI_API_VERSION` | Azure OpenAI API version (default `2024-10-21`) |
| `AZURE_ANOMALY_DETECTOR_ENDPOINT` / `AZURE_ANOMALY_DETECTOR_KEY` | Anomaly Detector |
| `MOCK_DATA` | `true` to serve mock data instead of calling Azure |
| `PORT` | Backend port (default `3001`) |
| `API_KEY` | Optional. When set, `/api/*` (except `/api/health`) requires a matching `x-api-key` header |

**Frontend** (optional, in `frontend/.env`):

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base URL (default `http://localhost:3001/api`) |
| `VITE_API_KEY` | Sent as `x-api-key` on every request; must match the backend `API_KEY` |

## API Overview

| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/api/health` | Health check (public) |
| POST   | `/api/auth/login` | Exchange credentials for a JWT (public) |
| GET    | `/api/auth/me` | Current authenticated user |
| GET/POST/PUT/DELETE | `/api/users` | User management (**admin only**) |
| GET/POST/PUT/DELETE | `/api/inventory` | Product CRUD (delete is **admin only**) |
| GET/POST/PUT/DELETE | `/api/suppliers` | Supplier management (delete **admin only**) |
| GET/POST | `/api/purchase-orders` | List / create purchase orders |
| POST   | `/api/purchase-orders/:id/approve` | Approve a draft PO (**admin only**) |
| POST   | `/api/purchase-orders/:id/receive` | Receive an approved PO — **increments stock + logs movements** |
| POST   | `/api/inventory/:id/adjust` | Manual stock adjustment (signed delta + reason) — logs a movement |
| GET    | `/api/inventory/:id/movements` | Movement history for one product |
| GET    | `/api/movements` | Recent stock-movement ledger (all products) |
| GET    | `/api/inventory/:id/forecast` | Demand forecast |
| GET    | `/api/alerts/low-stock` | Products below reorder threshold |
| GET    | `/api/alerts/anomalies/:id` | Anomaly detection for a product |
| POST   | `/api/ai/search` | Natural language inventory search |
| POST   | `/api/ai/reorder-suggestions` | AI reorder recommendations |
| POST   | `/api/ai/copilot` | Conversational agent that can inspect **and modify** inventory |
| POST   | `/api/ai/extract` | Extract product rows from an uploaded image (GPT-4o Vision) |

**Validation:** product writes (`POST`/`PUT /api/inventory`) are validated
(name required on create; numeric fields must be numbers ≥ 0) and return `400`
with details on failure. Errors are shaped uniformly as
`{ error: { status, message, details? } }`.

### Authentication & roles

Users log in (`POST /api/auth/login`) and receive a JWT; the frontend stores it
and sends it as `Authorization: Bearer <token>` on every request. All `/api`
routes except `/api/health` and `/api/auth/login` require a valid token.

Two roles:

- **admin** — full access, including user management and product deletion.
- **staff** — everything except user management and deleting products.

### Suppliers & purchase orders

Suppliers are managed records (contact, email, lead time). Purchase orders follow
a lifecycle — **draft → approved → received** — created from the Purchase Orders
modal by choosing a supplier and adding product line items:

- **draft** — created/edited by any user; `total` is computed from line items.
- **approved** — an admin approves a draft (separation of duties).
- **received** — receiving an approved PO **increments each line item's product
  stock**, connecting procurement to inventory. Deleting/cancelling is admin-only.

### Stock-movement ledger

Every stock change is recorded as an immutable movement — `{ type (in/out),
delta, quantityAfter, reason, source, username, createdAt }`. Movements are
written on **PO receipt** (`source: purchase_order`), **manual adjustment**
(`source: manual`, via the product panel's *Adjust stock* control), and **initial
stock** on product creation. The product detail panel shows a product's history;
the **Ledger** button opens the full audit trail across all products, including
who made each change.

### Authentication & roles

Passwords are hashed with bcrypt; JWTs are signed with `JWT_SECRET`. In
`MOCK_DATA=true` the seeded demo users are **admin / admin123** and
**staff / staff123** (shown on the login screen). For real Azure, `npm run seed`
creates a `users` container and seeds the same two accounts — **change these
passwords in production.** The optional `API_KEY` gate still applies on top when
set (belt-and-suspenders for machine-to-machine callers).

### Inventory Copilot

A GPT-4o **function-calling** agent (`copilotService.js`) exposes the inventory
operations as tools — `list_inventory`, `get_low_stock`, `get_forecast`,
`reorder_product`, `reorder_below_threshold`, `create_product`, `update_product`,
`delete_product` — so the chat widget can *do* things, not just answer:

> "Reorder everything below threshold" → the agent tops up each low product and
> confirms what it did; the dashboard refreshes automatically.

Both drivers share the same tool implementations:

- `MOCK_DATA=true` — an intent matcher routes common requests to the tools, so the
  copilot works fully offline (reorders really mutate the in-memory data).
- `MOCK_DATA=false` — GPT-4o chooses and chains the tools via function calling.

### Stock runway

`GET /api/inventory` returns a `runwayDays` (and `dailyDemand`) for each product,
computed from the smoothed demand forecast vs. current quantity. The UI renders it
as a green → amber → red bar in the inventory table and product detail panel.

### Photo → product intake

The **📷 Scan** button opens `PhotoIntake`: upload a shelf photo, product label, or
paper invoice and `POST /api/ai/extract` runs it through GPT-4o Vision to extract
product rows, which you review/edit before creating. `MOCK_DATA=true` returns a
canned extraction so the flow is demoable offline (no image is actually analyzed).

## Status

Both the mock path and the real Azure integrations are implemented:

- **`MOCK_DATA=true`** (default) — the API serves data from `backend/mocks/` and computes
  forecasts in-service. No Azure resources required.
- **`MOCK_DATA=false`** — routes call the real Azure services:
  - `cosmosService` — Cosmos DB CRUD (`@azure/cosmos`)
  - `openaiService` — GPT-4o natural language search + reorder suggestions (JSON mode)
  - `anomalyService` — Azure Anomaly Detector univariate detection
  - `forecastService` — exponential smoothing (always in-service)

  Each service authenticates with its `*_KEY` when set, otherwise falls back to
  `DefaultAzureCredential`. If a required endpoint is missing, the API returns a clear
  `500` (it does not crash).

### Assumptions when running against real Azure

- The Cosmos container's **partition key path is `/id`** (item id doubles as the partition
  key). Adjust `cosmosService.js` if your container uses a different partition key.
- Products are expected to carry a `demandHistory: [{ timestamp, value }]` array for
  forecasting and anomaly detection.
