// Seed script — pushes the mock products into Cosmos DB.
//
// Creates the database and container (partition key `/id`) if they don't exist,
// then upserts every product from backend/mocks/inventory.js.
//
// Usage:
//   1. Fill in AZURE_COSMOS_* in backend/.env
//   2. npm run seed            (from backend/)
//   or npm run seed --prefix backend  (from repo root)
import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

import { products } from '../mocks/inventory.js';

const {
  AZURE_COSMOS_ENDPOINT,
  AZURE_COSMOS_KEY,
  AZURE_COSMOS_DATABASE = 'inventory-db',
  AZURE_COSMOS_CONTAINER = 'products',
} = process.env;

async function main() {
  if (!AZURE_COSMOS_ENDPOINT) {
    throw new Error(
      'AZURE_COSMOS_ENDPOINT is not configured. Copy .env.example to .env and fill it in.'
    );
  }

  const client = AZURE_COSMOS_KEY
    ? new CosmosClient({ endpoint: AZURE_COSMOS_ENDPOINT, key: AZURE_COSMOS_KEY })
    : new CosmosClient({
        endpoint: AZURE_COSMOS_ENDPOINT,
        aadCredentials: new DefaultAzureCredential(),
      });

  console.log(`Ensuring database "${AZURE_COSMOS_DATABASE}"…`);
  const { database } = await client.databases.createIfNotExists({
    id: AZURE_COSMOS_DATABASE,
  });

  console.log(`Ensuring container "${AZURE_COSMOS_CONTAINER}" (partition key /id)…`);
  const { container } = await database.containers.createIfNotExists({
    id: AZURE_COSMOS_CONTAINER,
    partitionKey: { paths: ['/id'] },
  });

  let count = 0;
  for (const product of products) {
    await container.items.upsert(product);
    count += 1;
    console.log(`  upserted ${product.id} — ${product.name}`);
  }

  console.log(
    `\nDone. Seeded ${count} product(s) into ${AZURE_COSMOS_DATABASE}/${AZURE_COSMOS_CONTAINER}.`
  );
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
