import { upsertStorefrontSearchDocuments } from "@/lib/storefront/storefront-product-search";

const DEFAULT_COLLECTION = "store_products";

function escapeFilterValue(value: string) {
  return value.replace(/[`\\]/g, "\\$&");
}

export async function resetStorefrontSearchDocumentsForStore(storeId: string) {
  const host = process.env.TYPESENSE_HOST?.trim();
  const apiKey = process.env.TYPESENSE_ADMIN_API_KEY?.trim() || process.env.TYPESENSE_SEARCH_API_KEY?.trim();
  if (!host || !apiKey) {
    return { deleted: false, indexed: 0, skipped: true as const };
  }

  const protocol = process.env.TYPESENSE_PROTOCOL?.trim() || "https";
  const collection = process.env.TYPESENSE_COLLECTION_PRODUCTS?.trim() || DEFAULT_COLLECTION;
  const normalizedHost = host.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const url = new URL(`${protocol}://${normalizedHost}/collections/${encodeURIComponent(collection)}/documents`);
  url.searchParams.set("filter_by", `store_id:=${escapeFilterValue(storeId)}`);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: { "X-TYPESENSE-API-KEY": apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Typesense store-slice reset failed: ${response.status}`);
  }

  const indexed = await upsertStorefrontSearchDocuments(storeId);
  return { deleted: true, indexed: indexed.indexed, skipped: false as const };
}
