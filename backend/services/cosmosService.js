// Cosmos DB service — Azure Cosmos DB (NoSQL, SQL API)
//
// Auth: uses AZURE_COSMOS_KEY when provided, otherwise falls back to
// DefaultAzureCredential (managed identity / az login / env creds).
//
// Partition key: this scaffold assumes the container's partition key path is
// `/id`, so each item's partition key value equals its `id`.
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

const {
  AZURE_COSMOS_ENDPOINT,
  AZURE_COSMOS_KEY,
  AZURE_COSMOS_DATABASE = 'inventory-db',
  AZURE_COSMOS_CONTAINER = 'products',
} = process.env;

// Lazily-initialized client/container handles.
let client;
let container;

// Initialize the Cosmos client and cache the container handle.
export function getContainer() {
  if (container) return container;

  if (!AZURE_COSMOS_ENDPOINT) {
    throw new Error('AZURE_COSMOS_ENDPOINT is not configured');
  }

  if (!client) {
    client = AZURE_COSMOS_KEY
      ? new CosmosClient({ endpoint: AZURE_COSMOS_ENDPOINT, key: AZURE_COSMOS_KEY })
      : new CosmosClient({
          endpoint: AZURE_COSMOS_ENDPOINT,
          aadCredentials: new DefaultAzureCredential(),
        });
  }

  container = client.database(AZURE_COSMOS_DATABASE).container(AZURE_COSMOS_CONTAINER);
  return container;
}

// List all products.
export async function listProducts() {
  const { resources } = await getContainer().items.readAll().fetchAll();
  return resources;
}

// Get a single product by id.
export async function getProduct(id) {
  try {
    const { resource } = await getContainer().item(id, id).read();
    return resource ?? null;
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

// Create a product. Generates an id when one isn't supplied.
export async function createProduct(product) {
  const item = { id: product.id ?? `sku-${Date.now()}`, ...product };
  const { resource } = await getContainer().items.create(item);
  return resource;
}

// Update (replace) a product by id.
export async function updateProduct(id, product) {
  const { resource } = await getContainer().item(id, id).replace({ ...product, id });
  return resource;
}

// Delete a product by id.
export async function deleteProduct(id) {
  await getContainer().item(id, id).delete();
  return { id };
}
