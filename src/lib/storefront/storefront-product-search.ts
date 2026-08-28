import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient, loadStorePlanState } from "@/lib/api/supabase-route";
import { canAccessStorefrontStore, validatePreviewToken } from "@/lib/cms/store-resolver";
import { getStorefrontProducts } from "@/lib/storefront/storefront-products";

const DEFAULT_COLLECTION = "store_products";

type SearchDocument = {
  id: string;
  store_id: string;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  type?: string | null;
  price?: number | null;
  original_price?: number | null;
  image_url?: string | null;
  images?: string[] | null;
  sizes?: string[] | null;
  colors?: string[] | null;
  featured?: boolean | null;
  badge?: string | null;
  stock?: number | null;
  is_available?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  metric_values?: unknown;
  type_metric_schema?: unknown;
};

type SearchRow = SearchDocument & {
  similarity_score?: number | null;
  text_rank?: number | null;
};

export type StorefrontSearchArgs = {
  storeId: string;
  query: string;
  category?: string | null;
  type?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  saleOnly?: boolean;
  perPage?: number;
  previewToken?: string | null;
};

type ProviderConfig = {
  apiKey: string;
  collection: string;
  host: string;
  protocol: string;
};

function getSearchProviderConfig(): ProviderConfig | null {
  const host = process.env.TYPESENSE_HOST?.trim();
  const apiKey = process.env.TYPESENSE_SEARCH_API_KEY?.trim() || process.env.TYPESENSE_ADMIN_API_KEY?.trim();
  if (!host || !apiKey) {
    return null;
  }

  return {
    host,
    apiKey,
    protocol: process.env.TYPESENSE_PROTOCOL?.trim() || "https",
    collection: process.env.TYPESENSE_COLLECTION_PRODUCTS?.trim() || DEFAULT_COLLECTION,
  };
}

function buildBaseUrl(config: ProviderConfig) {
  const normalizedHost = config.host.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return `${config.protocol}://${normalizedHost}`;
}

function normalizeDedupeValue(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeSearchText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function tokenizeSearchText(value: string | null | undefined) {
  return normalizeSearchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildSearchResultSignature(result: SearchDocument | SearchRow) {
  if (result.id) {
    return `id:${normalizeDedupeValue(result.id)}`;
  }

  return [
    normalizeDedupeValue(result.store_id),
    normalizeDedupeValue(result.name),
    normalizeDedupeValue(result.category),
    normalizeDedupeValue(result.type),
    normalizeDedupeValue(result.price),
    normalizeDedupeValue(result.original_price),
  ].join("|");
}

export function dedupeStorefrontSearchResults<T extends SearchDocument | SearchRow>(results: T[]) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const result of results) {
    const signature = buildSearchResultSignature(result);
    if (!signature || seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    deduped.push(result);
  }

  return deduped;
}

function scoreStorefrontSearchResult(result: SearchRow, normalizedQuery: string, queryTokens: string[]) {
  const normalizedName = normalizeSearchText(result.name);
  const normalizedDescription = normalizeSearchText(result.description);
  const textRank = Number(result.text_rank ?? 0);
  const similarityScore = Number(result.similarity_score ?? 0);
  const hasExactNameMatch = normalizedName === normalizedQuery;
  const hasNamePhraseMatch = normalizedQuery.length > 0 && normalizedName.includes(normalizedQuery);
  const hasDescriptionPhraseMatch = normalizedQuery.length > 0 && normalizedDescription.includes(normalizedQuery);
  const tokenCoverage = queryTokens.length === 0
    ? 0
    : queryTokens.filter((token) => normalizedName.includes(token)).length / queryTokens.length;

  return {
    hasExactNameMatch,
    hasNamePhraseMatch,
    hasDescriptionPhraseMatch,
    tokenCoverage,
    textRank,
    similarityScore,
  };
}

export function rankStorefrontSearchResults(results: SearchRow[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return results;
  }

  const queryTokens = tokenizeSearchText(normalizedQuery);
  const scored = results.map((result) => ({
    result,
    score: scoreStorefrontSearchResult(result, normalizedQuery, queryTokens),
  }));
  const hasStrongExactPhraseWinner = scored.some(({ score }) =>
    score.hasExactNameMatch || (score.hasNamePhraseMatch && queryTokens.length >= 2),
  );

  const filtered = hasStrongExactPhraseWinner
    ? scored.filter(({ score }) =>
        score.hasExactNameMatch ||
        score.hasNamePhraseMatch ||
        (score.hasDescriptionPhraseMatch && score.textRank >= 0.2) ||
        score.tokenCoverage >= 1 ||
        score.similarityScore >= 0.45,
      )
    : scored;

  return filtered
    .sort((left, right) => {
      if (left.score.hasExactNameMatch !== right.score.hasExactNameMatch) {
        return left.score.hasExactNameMatch ? -1 : 1;
      }

      if (left.score.hasNamePhraseMatch !== right.score.hasNamePhraseMatch) {
        return left.score.hasNamePhraseMatch ? -1 : 1;
      }

      if (left.score.tokenCoverage !== right.score.tokenCoverage) {
        return right.score.tokenCoverage - left.score.tokenCoverage;
      }

      if (left.score.textRank !== right.score.textRank) {
        return right.score.textRank - left.score.textRank;
      }

      if (left.score.similarityScore !== right.score.similarityScore) {
        return right.score.similarityScore - left.score.similarityScore;
      }

      return 0;
    })
    .map(({ result }) => result);
}

function escapeFilterValue(value: string) {
  return value.replace(/[`\\]/g, "\\$&");
}

function buildFilterBy(args: StorefrontSearchArgs) {
  const filters = [`store_id:=${args.storeId}`, "is_available:=true"];

  if (args.category && args.category !== "All") {
    filters.push(`category:=${escapeFilterValue(args.category)}`);
  }

  if (args.type && args.type !== "All") {
    filters.push(`type:=${escapeFilterValue(args.type)}`);
  }

  if (typeof args.minPrice === "number" && Number.isFinite(args.minPrice)) {
    filters.push(`price:>=${args.minPrice}`);
  }

  if (typeof args.maxPrice === "number" && Number.isFinite(args.maxPrice)) {
    filters.push(`price:<=${args.maxPrice}`);
  }

  if (args.saleOnly) {
    filters.push("original_price:>0");
  }

  return filters.join(" && ");
}

async function ensureStorefrontAccess(storeId: string, previewToken?: string | null) {
  const supabaseAdmin = getSupabaseAdminClient();
  const [{ data: store, error: storeError }, { data: storePlanState, error: storePlanStateError }] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id, is_published")
      .eq("id", storeId)
      .maybeSingle(),
    loadStorePlanState(supabaseAdmin as never, storeId, {
      includePublished: true,
    }),
  ]);

  if (storeError) throw storeError;
  if (previewToken && await validatePreviewToken(storeId, previewToken)) {
    return true;
  }
  if (storePlanStateError || !canAccessStorefrontStore(store, (storePlanState?.subscription as any) ?? null)) {
    return false;
  }

  return true;
}

async function searchStorefrontProductsInPostgres(args: StorefrontSearchArgs): Promise<SearchRow[] | null> {
  const hasAccess = await ensureStorefrontAccess(args.storeId, args.previewToken);
  if (!hasAccess) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any).rpc("search_storefront_products", {
    p_store_id: args.storeId,
    p_query: args.query.trim(),
    p_category: args.category?.trim() || null,
    p_type: args.type?.trim() || null,
    p_min_price: typeof args.minPrice === "number" && Number.isFinite(args.minPrice) ? args.minPrice : null,
    p_max_price: typeof args.maxPrice === "number" && Number.isFinite(args.maxPrice) ? args.maxPrice : null,
    p_sale_only: args.saleOnly === true,
    p_limit: Math.min(Math.max(args.perPage ?? 48, 1), 100),
  });

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return rankStorefrontSearchResults(
    dedupeStorefrontSearchResults(data as SearchRow[]),
    args.query,
  );
}

async function runTypesenseSearch(args: StorefrontSearchArgs): Promise<SearchDocument[] | null> {
  // Optional future seam: keep this isolated so we can plug in an external
  // search index later without rewriting the storefront query path again.
  const config = getSearchProviderConfig();
  if (!config) {
    return null;
  }

  const hasAccess = await ensureStorefrontAccess(args.storeId, args.previewToken);
  if (!hasAccess) {
    return null;
  }

  const url = new URL(`${buildBaseUrl(config)}/collections/${encodeURIComponent(config.collection)}/documents/search`);
  url.searchParams.set("q", args.query.trim());
  url.searchParams.set("query_by", "name,description,category,type,colors,sizes,badge");
  url.searchParams.set("filter_by", buildFilterBy(args));
  url.searchParams.set("sort_by", "_text_match:desc,featured:desc,created_at:desc");
  url.searchParams.set("per_page", String(Math.min(Math.max(args.perPage ?? 48, 1), 100)));
  url.searchParams.set("num_typos", "2");
  url.searchParams.set("prioritize_exact_match", "true");

  const response = await fetch(url.toString(), {
    headers: {
      "X-TYPESENSE-API-KEY": config.apiKey,
    },
    next: {
      revalidate: 60,
      tags: [`store:${args.storeId}`, `store:${args.storeId}:products`, `store:${args.storeId}:taxonomy`, `store:${args.storeId}:search`],
    },
  });

  if (!response.ok) {
    throw new Error(`Typesense search failed: ${response.status}`);
  }

  const payload = await response.json() as { hits?: Array<{ document?: SearchDocument | null }> };
  return dedupeStorefrontSearchResults((payload.hits ?? [])
    .map((hit) => hit.document ?? null)
    .filter((doc): doc is SearchDocument => Boolean(doc?.id)));
}

export async function searchStorefrontProducts(args: StorefrontSearchArgs) {
  const normalizedArgs: StorefrontSearchArgs = {
    ...args,
    query: args.query.trim(),
    category: args.category?.trim() ?? null,
    type: args.type?.trim() ?? null,
    minPrice: typeof args.minPrice === "number" && Number.isFinite(args.minPrice) ? args.minPrice : null,
    maxPrice: typeof args.maxPrice === "number" && Number.isFinite(args.maxPrice) ? args.maxPrice : null,
    saleOnly: args.saleOnly === true,
    perPage: args.perPage ?? 48,
    previewToken: args.previewToken?.trim() || null,
  };

  if (!normalizedArgs.query) {
    return [];
  }

  if (normalizedArgs.previewToken) {
    const postgresResults = await searchStorefrontProductsInPostgres(normalizedArgs);
    if (postgresResults && postgresResults.length > 0) {
      return postgresResults;
    }
    const externalResults = await runTypesenseSearch(normalizedArgs);
    return externalResults ?? [];
  }

  const runCachedSearch = unstable_cache(
    async () => {
      const postgresResults = await searchStorefrontProductsInPostgres(normalizedArgs);
      if (postgresResults && postgresResults.length > 0) {
        return postgresResults;
      }

      const externalResults = await runTypesenseSearch(normalizedArgs);
      return externalResults ?? [];
    },
    [
      "storefront-product-search",
      normalizedArgs.storeId,
      normalizedArgs.query,
      normalizedArgs.category ?? "",
      normalizedArgs.type ?? "",
      String(normalizedArgs.minPrice ?? ""),
      String(normalizedArgs.maxPrice ?? ""),
      normalizedArgs.saleOnly ? "sale" : "all",
      String(normalizedArgs.perPage),
    ],
    {
      revalidate: 60,
      tags: [`store:${normalizedArgs.storeId}`, `store:${normalizedArgs.storeId}:products`, `store:${normalizedArgs.storeId}:taxonomy`, `store:${normalizedArgs.storeId}:search`],
    },
  );

  return runCachedSearch();
}

export async function upsertStorefrontSearchDocuments(storeId: string, productIds?: string[]) {
  const config = getSearchProviderConfig();
  if (!config) {
    return { indexed: 0, skipped: true as const };
  }

  const products = await getStorefrontProducts({
    storeId,
    ids: productIds && productIds.length > 0 ? productIds : [],
  });

  if (products === null) {
    return { indexed: 0, skipped: false as const };
  }

  const selected = productIds && productIds.length > 0
    ? products.filter((product) => productIds.includes(String(product.id)))
    : products;

  const documents = selected.map((product) => ({
    id: String(product.id),
    store_id: storeId,
    name: String(product.name ?? ""),
    description: String(product.description ?? ""),
    category: String(product.category ?? ""),
    type: String(product.type ?? ""),
    price: typeof product.price === "number" ? product.price : 0,
    original_price: typeof product.original_price === "number" ? product.original_price : null,
    image_url: typeof product.image_url === "string" ? product.image_url : "",
    images: Array.isArray(product.images) ? product.images : [],
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
    featured: Boolean(product.featured),
    badge: typeof product.badge === "string" ? product.badge : null,
    stock: typeof product.stock === "number" ? product.stock : 0,
    is_available: product.is_available !== false,
    created_at: typeof product.created_at === "string" ? product.created_at : null,
    updated_at: typeof product.updated_at === "string" ? product.updated_at : null,
    metric_values: product.metric_values ?? null,
    type_metric_schema: product.type_metric_schema ?? null,
  }));

  const url = new URL(`${buildBaseUrl(config)}/collections/${encodeURIComponent(config.collection)}/documents/import`);
  url.searchParams.set("action", "upsert");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "X-TYPESENSE-API-KEY": process.env.TYPESENSE_ADMIN_API_KEY?.trim() || config.apiKey,
    },
    body: documents.map((document) => JSON.stringify(document)).join("\n"),
  });

  if (!response.ok) {
    throw new Error(`Typesense import failed: ${response.status}`);
  }

  return { indexed: documents.length, skipped: false as const };
}

export async function deleteStorefrontSearchDocuments(storeId: string, productIds: string[]) {
  const config = getSearchProviderConfig();
  if (!config || productIds.length === 0) {
    return { deleted: 0, skipped: !config };
  }

  const url = new URL(`${buildBaseUrl(config)}/collections/${encodeURIComponent(config.collection)}/documents`);
  url.searchParams.set("filter_by", `store_id:=${escapeFilterValue(storeId)} && id:[${productIds.map(escapeFilterValue).join(",")}]`);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "X-TYPESENSE-API-KEY": process.env.TYPESENSE_ADMIN_API_KEY?.trim() || config.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Typesense delete failed: ${response.status}`);
  }

  return { deleted: productIds.length, skipped: false as const };
}

export function shouldUseExternalStorefrontSearch() {
  return getSearchProviderConfig() !== null;
}

export function canUseIndexedStorefrontSearch(storeId: string | null | undefined, query: string) {
  return Boolean(storeId && query.trim());
}
