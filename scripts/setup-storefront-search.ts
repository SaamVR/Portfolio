import { createClient } from "@supabase/supabase-js";

type ProductRow = {
  id: string;
  store_id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  type: string | null;
  price: number | null;
  original_price: number | null;
  image_url: string | null;
  images: string[] | null;
  sizes: string[] | null;
  colors: string[] | null;
  featured: boolean | null;
  badge: string | null;
  stock: number | null;
  is_available: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  metric_values?: unknown;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getTypesenseBaseUrl() {
  const protocol = process.env.TYPESENSE_PROTOCOL?.trim() || "https";
  const host = getRequiredEnv("TYPESENSE_HOST").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return `${protocol}://${host}`;
}

function getCollectionName() {
  return process.env.TYPESENSE_COLLECTION_PRODUCTS?.trim() || "store_products";
}

async function ensureCollection() {
  const baseUrl = getTypesenseBaseUrl();
  const adminKey = getRequiredEnv("TYPESENSE_ADMIN_API_KEY");
  const collection = getCollectionName();

  const schema = {
    name: collection,
    fields: [
      { name: "id", type: "string" },
      { name: "store_id", type: "string", facet: true },
      { name: "name", type: "string" },
      { name: "description", type: "string", optional: true },
      { name: "category", type: "string", facet: true, optional: true },
      { name: "type", type: "string", facet: true, optional: true },
      { name: "price", type: "float", facet: true },
      { name: "original_price", type: "float", optional: true },
      { name: "image_url", type: "string", optional: true },
      { name: "images", type: "string[]", optional: true },
      { name: "sizes", type: "string[]", facet: true, optional: true },
      { name: "colors", type: "string[]", facet: true, optional: true },
      { name: "featured", type: "bool", optional: true },
      { name: "badge", type: "string", facet: true, optional: true },
      { name: "stock", type: "int32", optional: true },
      { name: "is_available", type: "bool", optional: true },
      { name: "created_at", type: "string", optional: true },
      { name: "updated_at", type: "string", optional: true },
      { name: "metric_values", type: "object", optional: true },
    ],
    default_sorting_field: "price",
  };

  const existing = await fetch(`${baseUrl}/collections/${encodeURIComponent(collection)}`, {
    headers: { "X-TYPESENSE-API-KEY": adminKey },
  });

  if (existing.ok) {
    console.log(`[search] Collection already exists: ${collection}`);
    return;
  }

  if (existing.status !== 404) {
    throw new Error(`Failed to inspect Typesense collection: ${existing.status}`);
  }

  const created = await fetch(`${baseUrl}/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": adminKey,
    },
    body: JSON.stringify(schema),
  });

  if (!created.ok) {
    throw new Error(`Failed to create Typesense collection: ${created.status} ${await created.text()}`);
  }

  console.log(`[search] Created collection: ${collection}`);
}

async function loadProducts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("products")
    .select("id, store_id, name, description, category, type, price, original_price, image_url, images, sizes, colors, featured, badge, stock, is_available, created_at, updated_at, metric_values")
    .eq("is_available", true)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ProductRow[];
}

async function importProducts(rows: ProductRow[]) {
  const baseUrl = getTypesenseBaseUrl();
  const adminKey = getRequiredEnv("TYPESENSE_ADMIN_API_KEY");
  const collection = getCollectionName();

  if (rows.length === 0) {
    console.log("[search] No available products found to backfill.");
    return;
  }

  const documents = rows.map((row) => ({
    id: row.id,
    store_id: row.store_id,
    name: row.name ?? "",
    description: row.description ?? "",
    category: row.category ?? "",
    type: row.type ?? "",
    price: row.price ?? 0,
    original_price: row.original_price,
    image_url: row.image_url ?? "",
    images: row.images ?? [],
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    featured: Boolean(row.featured),
    badge: row.badge ?? null,
    stock: row.stock ?? 0,
    is_available: row.is_available !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metric_values: row.metric_values ?? null,
  }));

  const response = await fetch(`${baseUrl}/collections/${encodeURIComponent(collection)}/documents/import?action=upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "X-TYPESENSE-API-KEY": adminKey,
    },
    body: documents.map((document) => JSON.stringify(document)).join("\n"),
  });

  if (!response.ok) {
    throw new Error(`Failed to import product documents: ${response.status} ${await response.text()}`);
  }

  console.log(`[search] Backfilled ${documents.length} product documents into ${collection}.`);
}

async function main() {
  await ensureCollection();
  const products = await loadProducts();
  await importProducts(products);

  console.log("[search] Next steps:");
  console.log("  1. Set app.settings.storefront_search_sync_url in Supabase to your /api/search/storefront-sync endpoint.");
  console.log("  2. Set app.settings.storefront_search_webhook_secret in Supabase to STOREFRONT_SEARCH_WEBHOOK_SECRET.");
  console.log("  3. Apply the storefront search sync migration so product changes stay indexed.");
}

main().catch((error) => {
  console.error("[search] Setup failed:", error);
  process.exit(1);
});
