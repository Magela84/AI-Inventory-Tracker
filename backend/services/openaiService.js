// Azure OpenAI service — GPT-4o for NL search + reorder suggestions
//
// Auth: uses AZURE_OPENAI_KEY when provided, otherwise falls back to a
// DefaultAzureCredential bearer-token provider (Azure AD).
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

const {
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_KEY,
  AZURE_OPENAI_DEPLOYMENT = 'gpt-4o',
  AZURE_OPENAI_API_VERSION = '2024-10-21',
} = process.env;

const AAD_SCOPE = 'https://cognitiveservices.azure.com/.default';

let client;

// Initialize and cache the Azure OpenAI client.
export function getClient() {
  if (client) return client;

  if (!AZURE_OPENAI_ENDPOINT) {
    throw new Error('AZURE_OPENAI_ENDPOINT is not configured');
  }

  const shared = {
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiVersion: AZURE_OPENAI_API_VERSION,
    deployment: AZURE_OPENAI_DEPLOYMENT,
  };

  client = AZURE_OPENAI_KEY
    ? new AzureOpenAI({ ...shared, apiKey: AZURE_OPENAI_KEY })
    : new AzureOpenAI({
        ...shared,
        azureADTokenProvider: getBearerTokenProvider(
          new DefaultAzureCredential(),
          AAD_SCOPE
        ),
      });

  return client;
}

// Call chat completions in JSON mode and parse the response content.
async function chatJson(messages) {
  const completion = await getClient().chat.completions.create({
    model: AZURE_OPENAI_DEPLOYMENT,
    messages,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });
  const content = completion.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(content);
}

// Translate a natural language query into matching products.
// Returns products (from the provided list) annotated with a match `reason`.
export async function naturalLanguageSearch(query, products = []) {
  const catalog = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    quantity: p.quantity,
    reorderThreshold: p.reorderThreshold,
    unitPrice: p.unitPrice,
  }));

  const parsed = await chatJson([
    {
      role: 'system',
      content:
        'You are an inventory search assistant. Given a product catalog (JSON) and a ' +
        'user query, return the matching products. Respond ONLY with JSON of the form ' +
        '{"matches":[{"id":"<product id>","reason":"<why it matched>"}]}. Only use ids ' +
        'that appear in the catalog.',
    },
    {
      role: 'user',
      content: JSON.stringify({ query, catalog }),
    },
  ]);

  const byId = new Map(products.map((p) => [p.id, p]));
  return (parsed.matches ?? [])
    .filter((m) => byId.has(m.id))
    .map((m) => ({ ...byId.get(m.id), reason: m.reason }));
}

// Generate reorder suggestions given current inventory + optional forecast context.
export async function reorderSuggestions(context = {}) {
  const products = context.products ?? [];

  const parsed = await chatJson([
    {
      role: 'system',
      content:
        'You are an inventory planning assistant. Given products with current quantity, ' +
        'reorder threshold, and recent demand, recommend which to reorder and how many. ' +
        'Respond ONLY with JSON of the form {"suggestions":[{"id","name","currentQuantity",' +
        '"suggestedReorderQuantity","rationale"}]}.',
    },
    {
      role: 'user',
      content: JSON.stringify({ products }),
    },
  ]);

  return parsed.suggestions ?? [];
}

// Extract product rows from an image (shelf photo, product label, or invoice)
// using GPT-4o vision. `imageDataUrl` is a data URL (data:image/...;base64,...).
export async function extractProductsFromImage(imageDataUrl) {
  const parsed = await chatJson([
    {
      role: 'system',
      content:
        'You extract inventory products from an image, which may be a shelf photo, a ' +
        'product label, or a paper invoice. Respond ONLY with JSON of the form ' +
        '{"products":[{"name","category","quantity","reorderThreshold","unitPrice"}]}. ' +
        'Use 0 for numeric fields you cannot read and a best-guess category. ' +
        'Return an empty array if no products are visible.',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract the products from this image.' },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    },
  ]);

  return parsed.products ?? [];
}
