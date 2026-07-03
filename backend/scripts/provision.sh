#!/usr/bin/env bash
#
# Provision the Azure resources for the AI Inventory Tracker.
#
# Prerequisites:
#   - Azure CLI installed and logged in:   az login
#   - An Azure subscription with access to Azure OpenAI (apply if needed:
#     https://aka.ms/oai/access) and a region that offers gpt-4o.
#
# Usage (bash / Git Bash / WSL):
#   bash scripts/provision.sh
#
# It is idempotent — re-running it will not recreate existing resources.
# At the end it prints the values to paste into backend/.env.
set -euo pipefail

# ---- Configuration (override via environment) ------------------------------
LOCATION="${LOCATION:-eastus}"
RG="${RG:-rg-inventory-tracker}"
COSMOS_ACCOUNT="${COSMOS_ACCOUNT:-cosmos-inv-$RANDOM}"
COSMOS_DB="${COSMOS_DB:-inventory-db}"
COSMOS_CONTAINER="${COSMOS_CONTAINER:-products}"
OPENAI_ACCOUNT="${OPENAI_ACCOUNT:-openai-inv-$RANDOM}"
OPENAI_DEPLOYMENT="${OPENAI_DEPLOYMENT:-gpt-4o}"
OPENAI_MODEL_VERSION="${OPENAI_MODEL_VERSION:-2024-08-06}"
ANOMALY_ACCOUNT="${ANOMALY_ACCOUNT:-anomaly-inv-$RANDOM}"

echo "Resource group : $RG ($LOCATION)"
echo "Cosmos account : $COSMOS_ACCOUNT"
echo "OpenAI account : $OPENAI_ACCOUNT (deployment: $OPENAI_DEPLOYMENT)"
echo "Anomaly account: $ANOMALY_ACCOUNT"
echo

# ---- Resource group --------------------------------------------------------
az group create -n "$RG" -l "$LOCATION" -o none

# ---- Cosmos DB (NoSQL / SQL API) ------------------------------------------
echo "Creating Cosmos DB (this can take a few minutes)…"
az cosmosdb create -n "$COSMOS_ACCOUNT" -g "$RG" --default-consistency-level Session -o none
az cosmosdb sql database create -a "$COSMOS_ACCOUNT" -g "$RG" -n "$COSMOS_DB" -o none
az cosmosdb sql container create -a "$COSMOS_ACCOUNT" -g "$RG" -d "$COSMOS_DB" \
  -n "$COSMOS_CONTAINER" --partition-key-path "/id" -o none

COSMOS_ENDPOINT=$(az cosmosdb show -n "$COSMOS_ACCOUNT" -g "$RG" --query documentEndpoint -o tsv)
COSMOS_KEY=$(az cosmosdb keys list -n "$COSMOS_ACCOUNT" -g "$RG" --query primaryMasterKey -o tsv)

# ---- Azure OpenAI + gpt-4o deployment -------------------------------------
echo "Creating Azure OpenAI…"
az cognitiveservices account create -n "$OPENAI_ACCOUNT" -g "$RG" -l "$LOCATION" \
  --kind OpenAI --sku S0 --yes -o none
az cognitiveservices account deployment create -n "$OPENAI_ACCOUNT" -g "$RG" \
  --deployment-name "$OPENAI_DEPLOYMENT" \
  --model-name gpt-4o --model-version "$OPENAI_MODEL_VERSION" --model-format OpenAI \
  --sku-capacity 10 --sku-name Standard -o none

OPENAI_ENDPOINT=$(az cognitiveservices account show -n "$OPENAI_ACCOUNT" -g "$RG" --query properties.endpoint -o tsv)
OPENAI_KEY=$(az cognitiveservices account keys list -n "$OPENAI_ACCOUNT" -g "$RG" --query key1 -o tsv)

# ---- Anomaly Detector ------------------------------------------------------
# Note: Anomaly Detector is being retired by Azure; new resource creation may be
# restricted. If this step fails, skip it and rely on the mock anomaly path, or
# reuse an existing Anomaly Detector resource.
echo "Creating Anomaly Detector…"
if az cognitiveservices account create -n "$ANOMALY_ACCOUNT" -g "$RG" -l "$LOCATION" \
     --kind AnomalyDetector --sku S0 --yes -o none 2>/dev/null; then
  ANOMALY_ENDPOINT=$(az cognitiveservices account show -n "$ANOMALY_ACCOUNT" -g "$RG" --query properties.endpoint -o tsv)
  ANOMALY_KEY=$(az cognitiveservices account keys list -n "$ANOMALY_ACCOUNT" -g "$RG" --query key1 -o tsv)
else
  echo "  (!) Anomaly Detector creation failed/unavailable — leaving those values blank."
  ANOMALY_ENDPOINT=""
  ANOMALY_KEY=""
fi

# ---- Output ----------------------------------------------------------------
cat <<EOF

============================================================
Provisioning complete. Paste these into backend/.env:
============================================================
AZURE_COSMOS_ENDPOINT=$COSMOS_ENDPOINT
AZURE_COSMOS_KEY=$COSMOS_KEY
AZURE_COSMOS_DATABASE=$COSMOS_DB
AZURE_COSMOS_CONTAINER=$COSMOS_CONTAINER
AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT
AZURE_OPENAI_KEY=$OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT=$OPENAI_DEPLOYMENT
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_ANOMALY_DETECTOR_ENDPOINT=$ANOMALY_ENDPOINT
AZURE_ANOMALY_DETECTOR_KEY=$ANOMALY_KEY
MOCK_DATA=false
PORT=3001
============================================================

Next:
  1. Paste the above into backend/.env
  2. npm run seed        # push sample products into Cosmos
  3. npm run dev         # serve real data (MOCK_DATA=false)
EOF
