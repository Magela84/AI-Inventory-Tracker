// Copilot service — GPT-4o function-calling agent over the inventory operations.
//
// The same set of *tools* (list/reorder/create/update/delete/forecast) is shared
// between two drivers:
//   - realCopilot  → GPT-4o decides which tools to call (MOCK_DATA=false)
//   - mockCopilot  → a lightweight intent matcher calls the same tools so the
//                    feature works end-to-end with no Azure resources.
//
// Both return { reply, actions, changed } where `changed` tells the frontend to
// refresh the dashboard after inventory was mutated.
import { products as mockProducts } from '../mocks/inventory.js';
import * as cosmosService from './cosmosService.js';
import * as forecastService from './forecastService.js';
import { getClient } from './openaiService.js';
import { newId } from '../utils/id.js';

const {
  AZURE_OPENAI_DEPLOYMENT = 'gpt-4o',
} = process.env;

const useMock = () => process.env.MOCK_DATA === 'true';

// ---------------------------------------------------------------------------
// Data access (mock array or Cosmos) shared by every tool
// ---------------------------------------------------------------------------

async function listInventory() {
  return useMock() ? mockProducts : cosmosService.listProducts();
}

async function findProduct(id) {
  if (useMock()) return mockProducts.find((p) => p.id === id) ?? null;
  return cosmosService.getProduct(id);
}

async function persistUpdate(product) {
  if (useMock()) {
    const idx = mockProducts.findIndex((p) => p.id === product.id);
    if (idx !== -1) mockProducts[idx] = product;
    return product;
  }
  return cosmosService.updateProduct(product.id, product);
}

async function persistCreate(data) {
  if (useMock()) {
    const created = { id: newId('sku'), demandHistory: [], ...data };
    mockProducts.push(created);
    return created;
  }
  return cosmosService.createProduct(data);
}

async function persistDelete(id) {
  if (useMock()) {
    const idx = mockProducts.findIndex((p) => p.id === id);
    if (idx !== -1) mockProducts.splice(idx, 1);
    return { id };
  }
  return cosmosService.deleteProduct(id);
}

// Estimated days of stock remaining given the smoothed daily demand.
function runwayDays(product) {
  return forecastService.runwayDays(product.quantity, product.demandHistory ?? []);
}

function summarize(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    quantity: product.quantity,
    reorderThreshold: product.reorderThreshold,
    unitPrice: product.unitPrice,
    runwayDays: runwayDays(product),
  };
}

// ---------------------------------------------------------------------------
// Tool implementations — each returns { result, action?, mutated? }
// ---------------------------------------------------------------------------

const tools = {
  async list_inventory() {
    const products = await listInventory();
    return { result: products.map(summarize) };
  },

  async get_low_stock() {
    const products = await listInventory();
    const low = products.filter((p) => p.quantity <= p.reorderThreshold);
    return { result: low.map(summarize) };
  },

  async get_forecast({ id }) {
    const product = await findProduct(id);
    if (!product) return { result: { error: 'Product not found' } };
    const forecast = forecastService.forecast(product.demandHistory ?? [], 7);
    return {
      result: {
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        runwayDays: runwayDays(product),
        forecast,
      },
    };
  },

  async reorder_product({ id, quantity }) {
    const product = await findProduct(id);
    if (!product) return { result: { error: 'Product not found' } };
    const amount = Math.max(0, Math.round(Number(quantity) || 0));
    const updated = { ...product, quantity: (product.quantity ?? 0) + amount };
    await persistUpdate(updated);
    return {
      result: summarize(updated),
      action: { type: 'reorder', summary: `Reordered ${product.name} (+${amount})` },
      mutated: true,
    };
  },

  // Convenience batch: top every below-threshold product up to threshold + buffer.
  async reorder_below_threshold({ buffer = 5 } = {}) {
    const products = await listInventory();
    const buf = Math.max(0, Math.round(Number(buffer) || 0));
    const actions = [];
    const updatedList = [];
    for (const product of products) {
      if (product.quantity <= product.reorderThreshold) {
        const target = product.reorderThreshold + buf;
        const amount = Math.max(0, target - product.quantity);
        const updated = { ...product, quantity: target };
        await persistUpdate(updated);
        updatedList.push(summarize(updated));
        actions.push({ type: 'reorder', summary: `Reordered ${product.name} (+${amount})` });
      }
    }
    return { result: updatedList, action: actions, mutated: actions.length > 0 };
  },

  async create_product({ name, category = '', quantity = 0, reorderThreshold = 0, unitPrice = 0 }) {
    const created = await persistCreate({
      name,
      category,
      quantity: Number(quantity) || 0,
      reorderThreshold: Number(reorderThreshold) || 0,
      unitPrice: Number(unitPrice) || 0,
    });
    return {
      result: summarize(created),
      action: { type: 'create', summary: `Created ${created.name}` },
      mutated: true,
    };
  },

  async update_product({ id, ...fields }) {
    const product = await findProduct(id);
    if (!product) return { result: { error: 'Product not found' } };
    const merged = { ...product, ...fields, id };
    await persistUpdate(merged);
    return {
      result: summarize(merged),
      action: { type: 'update', summary: `Updated ${merged.name}` },
      mutated: true,
    };
  },

  async delete_product({ id }) {
    const product = await findProduct(id);
    if (!product) return { result: { error: 'Product not found' } };
    await persistDelete(id);
    return {
      result: { id, deleted: true },
      action: { type: 'delete', summary: `Deleted ${product.name}` },
      mutated: true,
    };
  },
};

// Execute a named tool; normalizes actions to an array.
async function executeTool(name, args) {
  const impl = tools[name];
  if (!impl) return { result: { error: `Unknown tool: ${name}` } };
  const { result, action, mutated } = await impl(args ?? {});
  const actions = action ? (Array.isArray(action) ? action : [action]) : [];
  return { result, actions, mutated: Boolean(mutated) };
}

// ---------------------------------------------------------------------------
// Tool schemas for the GPT-4o function-calling driver
// ---------------------------------------------------------------------------

const toolSchemas = [
  {
    type: 'function',
    function: {
      name: 'list_inventory',
      description: 'List all products with quantity, threshold, price, and estimated days of stock left (runwayDays).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_low_stock',
      description: 'List products at or below their reorder threshold.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_forecast',
      description: "Get a product's 7-period demand forecast and estimated days of stock remaining.",
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Product id' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reorder_product',
      description: 'Increase a product\'s quantity by a given amount (simulates placing a reorder).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          quantity: { type: 'number', description: 'Units to add' },
        },
        required: ['id', 'quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reorder_below_threshold',
      description: 'Reorder every product currently at or below threshold, topping each up to threshold + buffer.',
      parameters: {
        type: 'object',
        properties: { buffer: { type: 'number', description: 'Extra units above threshold (default 5)' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_product',
      description: 'Create a new product.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          quantity: { type: 'number' },
          reorderThreshold: { type: 'number' },
          unitPrice: { type: 'number' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_product',
      description: 'Update fields on an existing product (e.g. reorderThreshold, quantity, unitPrice, name, category).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          quantity: { type: 'number' },
          reorderThreshold: { type: 'number' },
          unitPrice: { type: 'number' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_product',
      description: 'Delete a product by id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
];

const SYSTEM_PROMPT =
  'You are the Inventory Copilot for an inventory management app. You can inspect ' +
  'and modify inventory using the provided tools. Resolve product names to ids with ' +
  'list_inventory before acting on a specific product. When the user asks you to take ' +
  'an action (reorder, create, update, delete), perform it, then confirm concisely what ' +
  'you did. Keep replies short and businesslike.';

// ---------------------------------------------------------------------------
// Real driver — GPT-4o function-calling loop
// ---------------------------------------------------------------------------

async function realCopilot(messages) {
  const client = getClient();
  const convo = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
  const actions = [];
  let changed = false;

  for (let step = 0; step < 6; step += 1) {
    const completion = await client.chat.completions.create({
      model: AZURE_OPENAI_DEPLOYMENT,
      messages: convo,
      tools: toolSchemas,
      tool_choice: 'auto',
      temperature: 0.2,
    });

    const msg = completion.choices?.[0]?.message;
    convo.push(msg);

    if (!msg?.tool_calls?.length) {
      return { reply: msg?.content ?? '', actions, changed };
    }

    for (const call of msg.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || '{}');
      } catch {
        args = {};
      }
      const { result, actions: toolActions, mutated } = await executeTool(call.function.name, args);
      actions.push(...toolActions);
      changed = changed || mutated;
      convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { reply: 'Stopped after too many steps. Please refine your request.', actions, changed };
}

// ---------------------------------------------------------------------------
// Mock driver — intent matcher that calls the same tools
// ---------------------------------------------------------------------------

function lastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return String(messages[i].content ?? '');
  }
  return '';
}

async function resolveProductByText(text) {
  const products = await listInventory();
  const lower = text.toLowerCase();
  return (
    products.find((p) => lower.includes(p.name.toLowerCase())) ??
    products.find((p) => p.name.toLowerCase().split(/\s+/).some((w) => w.length > 2 && lower.includes(w))) ??
    null
  );
}

async function mockCopilot(messages) {
  const text = lastUserText(messages).toLowerCase();

  // Reorder everything below threshold
  if (/\breorder\b/.test(text) && /(below|threshold|everything|all|low)/.test(text)) {
    const { result, actions, mutated } = await executeTool('reorder_below_threshold', { buffer: 5 });
    const reply = actions.length
      ? `Done — ${actions.map((a) => a.summary).join('; ')}. ${result.length} product(s) are now above threshold.`
      : 'Nothing to reorder — every product is already above its threshold.';
    return { reply, actions, changed: mutated };
  }

  // Low stock query
  if (/(low|below threshold|running low|need.*reorder|what.*reorder)/.test(text)) {
    const { result } = await executeTool('get_low_stock', {});
    const reply = result.length
      ? `${result.length} item(s) are low:\n` +
        result.map((p) => `• ${p.name} — ${p.quantity} in stock (threshold ${p.reorderThreshold})`).join('\n')
      : 'Everything is above its reorder threshold. 👍';
    return { reply, actions: [], changed: false };
  }

  // Forecast / runway for a named product
  if (/(forecast|run out|runway|stock ?out|how long|days left)/.test(text)) {
    const product = await resolveProductByText(text);
    if (!product) {
      return { reply: 'Which product? Try naming it, e.g. "when will the USB-C Hub run out?"', actions: [], changed: false };
    }
    const { result } = await executeTool('get_forecast', { id: product.id });
    const runway = result.runwayDays;
    const runwayText =
      runway == null ? 'no demand history to project from' : `about ${runway} day(s) of stock left`;
    return {
      reply:
        `${result.name}: ${result.quantity} in stock, ${runwayText}. ` +
        `Projected daily demand ≈ ${result.forecast[0]?.value ?? '—'}.`,
      actions: [],
      changed: false,
    };
  }

  // Set / change threshold for a named product
  const thresholdMatch = text.match(/threshold.*?(\d+)|(\d+).*threshold/);
  if (thresholdMatch && /(set|change|update|make)/.test(text)) {
    const product = await resolveProductByText(text);
    const value = Number(thresholdMatch[1] ?? thresholdMatch[2]);
    if (product && !Number.isNaN(value)) {
      const { actions, mutated } = await executeTool('update_product', {
        id: product.id,
        reorderThreshold: value,
      });
      return {
        reply: `Set ${product.name}'s reorder threshold to ${value}.`,
        actions,
        changed: mutated,
      };
    }
  }

  // Fallback / help
  return {
    reply:
      "I'm your Inventory Copilot. Try:\n" +
      '• "What\'s low on stock?"\n' +
      '• "Reorder everything below threshold"\n' +
      '• "When will the USB-C Hub run out?"\n' +
      '• "Set the Mechanical Keyboard threshold to 20"',
    actions: [],
    changed: false,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function run(messages = []) {
  return useMock() ? mockCopilot(messages) : realCopilot(messages);
}

export default { run };
