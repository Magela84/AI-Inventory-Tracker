# Interview Kit — AI Inventory Tracker (Cloud Engineer)

A talk-track for presenting this project in interviews. Diagrams:
[`architecture.svg`](architecture.svg) · [`cicd-pipeline.svg`](cicd-pipeline.svg)

---

## 60-second elevator pitch

> I built an **AI-powered inventory management system on Azure**. It's a three-tier
> app — a React frontend, a stateless Node/Express API, and Azure for data and AI.
> Cosmos DB stores inventory; Azure OpenAI GPT-4o powers a natural-language "copilot"
> that can actually place reorders through function calling; and Azure Anomaly
> Detector flags abnormal demand. Forecasting I kept in-service with exponential
> smoothing to avoid standing up a whole ML pipeline — right-sizing infrastructure
> to the problem.
>
> Two things I focused on as a cloud engineer: **security** — it authenticates to
> Azure with `DefaultAzureCredential`, so in production it runs on managed identity
> with no secrets in code — and **cost control** — I built a `MOCK_DATA` feature
> flag so the whole app runs locally on seed data with zero cloud spend during dev,
> making the cloud calls a clean toggle. It has JWT auth with admin/staff roles,
> Google sign-in, an idempotent provisioning script, and a unit test suite. It's on
> GitHub, running end-to-end on the mock path, and architected for Static Web Apps
> and App Service.

---

## STAR answer

**Situation** — Small/mid businesses lose money to stockouts and overstock because
they react to inventory instead of predicting it. I wanted a system that tracks
stock *and* forecasts demand, flags anomalies, and can be managed conversationally.

**Task** — I owned the whole thing: architecture, Azure service selection, the API,
auth, and making it runnable/demoable without burning cloud spend during dev.

**Action** — Three-tier design:
- **Frontend**: React + Tailwind → Azure Static Web Apps.
- **Backend**: stateless Node/Express API → Azure App Service.
- **Data & AI**: Cosmos DB (SQL API), Azure OpenAI GPT-4o (NL search + agentic
  reorder copilot via function calling), Azure Anomaly Detector.

Key engineering decisions:
- **Credential-flexible auth** — API key if provided, else `DefaultAzureCredential`,
  so prod runs on managed identity with no secrets in code.
- **In-service forecasting** (exponential smoothing) instead of a separate ML
  pipeline — right-sized cost/complexity.
- **`MOCK_DATA` feature flag** — full app runs on seed data with zero Azure
  resources; cloud calls are a clean toggle.
- **Idempotent provisioning script** (IaC) — resource group, Cosmos DB (`/id`
  partition key), Azure OpenAI deployment, Anomaly Detector.
- **JWT auth + RBAC** (admin/staff), plus email/password and Google OAuth with
  server-side token verification.

**Result** — Cost-efficient in dev, secure-by-default in prod via managed identity,
graceful degradation (clear 500s instead of crashes when a service isn't
configured), covered by a unit test suite, and version-controlled on GitHub with
the mock path working end-to-end.

---

## Cloud-engineer talking points

| Theme | Point |
|-------|-------|
| Cost optimization | `MOCK_DATA` = zero dev spend; exp. smoothing avoided an ML service; Cosmos autoscale fits spiky load. |
| Security | Managed identity via `DefaultAzureCredential`; secrets out of source; JWT + RBAC; server-side Google token verification. |
| Reliability | Graceful degradation on missing config; centralized error handling; stateless API scales horizontally. |
| Data modeling | Cosmos SQL API, `/id` partition key for fast point ops; would revisit partitioning for cross-partition query patterns at scale. |
| IaC / repeatability | Idempotent provisioning script; would evolve to Bicep/Terraform. |
| CI/CD | GitHub Actions → build/test → deploy frontend (Static Web Apps) + backend (App Service). |

---

## Likely follow-ups

**Deploy & scale?** Frontend → Static Web Apps (global CDN). Backend stateless as a
container on App Service / Container Apps, scale out on CPU/requests. Cosmos
autoscales RU/s. Session state in the JWT, so no sticky sessions.

**Secrets?** Nothing sensitive in source (`.env` git-ignored). Prod: Azure Key Vault
referenced by App Service, managed identity for data/AI services (no keys).

**Cosmos partition key?** `/id` for even distribution + fast point ops (fits
inventory lookups). If queries shifted to "all products for a supplier," I'd
reconsider (e.g. partition on tenant/category) — cross-partition queries get
expensive at scale.

**Observability?** Application Insights on both tiers — latency, dependency calls to
Cosmos/OpenAI, custom events on copilot tool executions. Alerts on error rate and
Cosmos 429 throttling.

**Hardest trade-off?** How much ML infra to build. Chose in-service exponential
smoothing over a managed ML pipeline — good-enough forecasts at a fraction of the
cost/complexity, and I can articulate when I'd graduate to something heavier.

---

## Résumé bullets

**Lead:**
> Designed and built a full-stack **AI inventory management system on Azure**
> (Cosmos DB, Azure OpenAI GPT-4o, Anomaly Detector) with a stateless Node/Express
> API and React frontend, architected for Azure Static Web Apps + App Service.

**Supporting (pick 2–3):**
> - Implemented **secretless authentication** via `DefaultAzureCredential` (managed
>   identity), plus JWT auth with RBAC and Google OAuth.
> - Engineered a **`MOCK_DATA` feature flag** decoupling the app from cloud
>   dependencies — zero-cost local dev and a clean prod/dev toggle.
> - Authored an **idempotent provisioning script** (IaC) for the resource group,
>   Cosmos DB, and Azure AI services.
> - Built an **agentic GPT-4o copilot** using function calling to execute inventory
>   operations, plus in-service forecasting and anomaly detection.

**One-liner:**
> Cloud-native AI inventory platform on Azure (Cosmos DB, Azure OpenAI, App Service)
> — managed-identity auth, RBAC, feature-flagged cloud dependencies, IaC provisioning.

---

## Honesty guardrail

Currently runs **end-to-end on the mock path and is architected for Azure** with a
provisioning script ready; it has **not** been run against live Azure resources yet.
Truthful framing when asked "is it deployed?":

> "It's fully built and running locally against the mock data path, and architected
> for Azure with a provisioning script ready. Running it against live Azure and
> adding a GitHub Actions pipeline is my next step."

That's a strength — it shows cost control and separation of app logic from cloud
dependencies. Use "architected for / built on Azure," not "deployed to production,"
until it's actually live.
