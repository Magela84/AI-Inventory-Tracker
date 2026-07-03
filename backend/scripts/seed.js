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
import { users } from '../mocks/users.js';
import { suppliers } from '../mocks/suppliers.js';
import { purchaseOrders } from '../mocks/purchaseOrders.js';
import { movements } from '../mocks/movements.js';

const {
  AZURE_COSMOS_ENDPOINT,
  AZURE_COSMOS_KEY,
  AZURE_COSMOS_DATABASE = 'inventory-db',
  AZURE_COSMOS_CONTAINER = 'products',
  AZURE_COSMOS_USERS_CONTAINER = 'users',
  AZURE_COSMOS_SUPPLIERS_CONTAINER = 'suppliers',
  AZURE_COSMOS_PURCHASE_ORDERS_CONTAINER = 'purchaseOrders',
  AZURE_COSMOS_MOVEMENTS_CONTAINER = 'movements',
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

  console.log(`Ensuring container "${AZURE_COSMOS_USERS_CONTAINER}" (partition key /id)…`);
  const { container: usersContainer } = await database.containers.createIfNotExists({
    id: AZURE_COSMOS_USERS_CONTAINER,
    partitionKey: { paths: ['/id'] },
  });

  let userCount = 0;
  for (const user of users) {
    await usersContainer.items.upsert(user);
    userCount += 1;
    console.log(`  upserted ${user.username} (${user.role})`);
  }

  // Suppliers + purchase orders
  const seedContainer = async (id, records, label) => {
    console.log(`Ensuring container "${id}" (partition key /id)…`);
    const { container: c } = await database.containers.createIfNotExists({
      id,
      partitionKey: { paths: ['/id'] },
    });
    for (const record of records) await c.items.upsert(record);
    console.log(`  seeded ${records.length} ${label}`);
  };
  await seedContainer(AZURE_COSMOS_SUPPLIERS_CONTAINER, suppliers, 'supplier(s)');
  await seedContainer(AZURE_COSMOS_PURCHASE_ORDERS_CONTAINER, purchaseOrders, 'purchase order(s)');
  await seedContainer(AZURE_COSMOS_MOVEMENTS_CONTAINER, movements, 'movement(s)');

  console.log(
    `\nDone. Seeded ${count} product(s), ${userCount} user(s), ` +
      `${suppliers.length} supplier(s), ${purchaseOrders.length} PO(s), and ` +
      `${movements.length} movement(s) into ${AZURE_COSMOS_DATABASE}.`
  );
  console.log('Default logins: admin/admin123, staff/staff123 — change these in production.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
