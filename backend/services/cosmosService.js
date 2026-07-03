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
  AZURE_COSMOS_USERS_CONTAINER = 'users',
} = process.env;

// Lazily-initialized client/container handles.
let client;
let container;
let usersContainer;

// Initialize (once) and return the shared Cosmos client.
function ensureClient() {
  if (client) return client;
  if (!AZURE_COSMOS_ENDPOINT) {
    throw new Error('AZURE_COSMOS_ENDPOINT is not configured');
  }
  client = AZURE_COSMOS_KEY
    ? new CosmosClient({ endpoint: AZURE_COSMOS_ENDPOINT, key: AZURE_COSMOS_KEY })
    : new CosmosClient({
        endpoint: AZURE_COSMOS_ENDPOINT,
        aadCredentials: new DefaultAzureCredential(),
      });
  return client;
}

// Cache the products container handle.
export function getContainer() {
  if (container) return container;
  container = ensureClient().database(AZURE_COSMOS_DATABASE).container(AZURE_COSMOS_CONTAINER);
  return container;
}

// Cache the users container handle.
export function getUsersContainer() {
  if (usersContainer) return usersContainer;
  usersContainer = ensureClient()
    .database(AZURE_COSMOS_DATABASE)
    .container(AZURE_COSMOS_USERS_CONTAINER);
  return usersContainer;
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

// ---------------------------------------------------------------------------
// Users container (for authentication / user management)
// ---------------------------------------------------------------------------

export async function listUsers() {
  const { resources } = await getUsersContainer().items.readAll().fetchAll();
  return resources;
}

export async function getUserByUsername(username) {
  const { resources } = await getUsersContainer()
    .items.query({
      query: 'SELECT * FROM c WHERE c.username = @username',
      parameters: [{ name: '@username', value: username }],
    })
    .fetchAll();
  return resources[0] ?? null;
}

export async function createUser(user) {
  const { resource } = await getUsersContainer().items.create(user);
  return resource;
}

export async function updateUser(id, user) {
  const { resource } = await getUsersContainer().item(id, id).replace({ ...user, id });
  return resource;
}

export async function deleteUser(id) {
  await getUsersContainer().item(id, id).delete();
  return { id };
}
