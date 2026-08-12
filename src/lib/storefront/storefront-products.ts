import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient, loadStorePlanState } from "@/lib/api/supabase-route";
import { canAccessStorefrontStore } from "@/lib/cms/store-resolver";

function isMissingMetricSchemaColumn(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  const normalized = message.toLowerCase();
  return normalized.includes("metric_schema") && (
    normalized.includes("does not exist") ||
    normalized.includes("could not find the") ||
    normalized.includes("schema cache")
  );
}

async function fetchStoreTypeMetricSchemas(supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>, storeId: string) {
  const preferred = await (supabaseAdmin.from("product_types") as any)
    .select("name, metric_schema")
    .eq("store_id", storeId);

  if (!preferred.error) {
    return (preferred.data ?? []) as Array<{ name?: string | null; metric_schema?: unknown }>;
  }

  if (!isMissingMetricSchemaColumn(preferred.error)) {
    throw preferred.error;
  }

  const fallback = await (supabaseAdmin.from("product_types") as any)
    .select("name")
    .eq("store_id", storeId);

  if (fallback.error) {
    throw fallback.error;
  }

  return ((fallback.data ?? []) as Array<{ name?: string | null }>).map((row) => ({
    name: row.name,
    metric_schema: undefined,
  }));
}

type StorefrontProductsArgs = {
  featuredOnly?: boolean;
  ids?: string[];
  productId?: string | null;
  storeId: string;
};

function buildStorefrontProductTags(args: StorefrontProductsArgs) {
  const tags = new Set<string>([
    `store:${args.storeId}`,
    `store:${args.storeId}:products`,
    `store:${args.storeId}:taxonomy`,
  ]);

  const normalizedProductId = args.productId?.trim();
  if (normalizedProductId) {
    tags.add(`product:${normalizedProductId}`);
  }

  for (const id of args.ids ?? []) {
    const normalizedId = id.trim();
    if (normalizedId) {
      tags.add(`product:${normalizedId}`);
    }
  }

  return [...tags];
}

async function loadStorefrontProductsUncached({
  featuredOnly = false,
  ids = [],
  productId = null,
  storeId,
}: StorefrontProductsArgs) {
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
  if (storePlanStateError || !canAccessStorefrontStore(store, (storePlanState?.subscription as any) ?? null)) {
    return null;
  }

  let query = supabaseAdmin
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (featuredOnly) {
    query = query.eq("featured", true);
  }

  if (productId) {
    query = query.eq("id", productId).limit(1);
  } else if (ids.length > 0) {
    query = query.in("id", ids);
  }

  const [{ data, error }, typeRows] = await Promise.all([
    query,
    fetchStoreTypeMetricSchemas(supabaseAdmin, storeId),
  ]);

  if (error) throw error;

  const typeSchemaByName = new Map(
    typeRows
      .map((row) => [row.name?.trim().toLowerCase(), row.metric_schema] as const)
      .filter((entry): entry is readonly [string, unknown] => Boolean(entry[0])),
  );

  return (Array.isArray(data) ? data : []).map((row) => ({
    ...row,
    type_metric_schema: typeSchemaByName.get(String(row.type ?? "").trim().toLowerCase()),
  }));
}

export async function getStorefrontProducts(args: StorefrontProductsArgs) {
  const ids = [...(args.ids ?? [])].sort();
  const normalizedArgs: StorefrontProductsArgs = {
    storeId: args.storeId,
    featuredOnly: args.featuredOnly === true,
    productId: args.productId?.trim() ?? "",
    ids,
  };

  const getCachedStorefrontProducts = unstable_cache(
    async () => loadStorefrontProductsUncached(normalizedArgs),
    [
      "storefront-products",
      normalizedArgs.storeId,
      normalizedArgs.featuredOnly ? "featured" : "all",
      normalizedArgs.productId ?? "",
      ids.join(","),
    ],
    {
      revalidate: 60,
      tags: buildStorefrontProductTags(normalizedArgs),
    },
  );

  return getCachedStorefrontProducts();
}
