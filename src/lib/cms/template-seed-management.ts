import { buildTemplateCatalogSeedRows, getFixtureStores, type TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";

type SupabaseLikeClient = {
  from: (table: string) => any;
};

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function isTemplateSeedMetadata(value: unknown): value is TemplateSeedCatalogMetadata {
  return Boolean(value)
    && typeof value === "object"
    && (value as { source?: unknown }).source === "threadbd-template-seed";
}

export async function unseedTemplateCatalog(
  client: SupabaseLikeClient,
  storeId: string,
  metadata: TemplateSeedCatalogMetadata | null | undefined,
) {
  if (metadata) {
    const seededProductIds = unique(Object.keys(metadata.products ?? {}));
    if (seededProductIds.length > 0) {
      const deleteBuilder = client.from("products").delete().eq("store_id", storeId);
      const { error } = await deleteBuilder.in("id", seededProductIds);
      if (error) {
        throw error;
      }
    }
  }

  // Aggressively purge any lingering hardcoded fallback seed data from `useSeedData`
  // AND all known template demo products (e.g. from previous templates that were lost from the metadata tracker)
  // so that NO fashion template or other demo data remains when a user clicks "Unseed"
  const legacySeedProductNames = [
    "Classic Cotton T-Shirt",
    "Slim Fit Denim Jeans",
    "Elegant Evening Dress",
    "Premium Urban Drop Shoulder",
    "Classic Oxford Polo",
    "Essential Everyday T-Shirt",
    "Linen Blend Summer Shirt",
    "Active Comfort Joggers",
    "Minimalist Club Polo",
    "Vintage Wash Graphic Tee",
    "Everyday Boxer Briefs (3-Pack)",
    "ThreadBD SoundMax Pro"
  ];
  const allFixtureStores = getFixtureStores();
  const allDemoProductNames = allFixtureStores.flatMap((store) => (store.products ?? []).map((p) => p.name));

  const masterDemoProductNames = unique([...legacySeedProductNames, ...allDemoProductNames]);

  const { error: legacyError } = await client.from("products").delete().eq("store_id", storeId).in("name", masterDemoProductNames);
  if (legacyError) {
    throw legacyError;
  }

  const { data: remainingProducts, error: remainingProductsError } = await client
    .from("products")
    .select("category, type")
    .eq("store_id", storeId);

  if (remainingProductsError) {
    throw remainingProductsError;
  }

  const remainingCategoryNames = new Set(
    ((remainingProducts ?? []) as Array<{ category?: unknown }>)
      .map((product) => (typeof product.category === "string" ? product.category : null))
      .filter((value): value is string => Boolean(value)),
  );
  const remainingTypeNames = new Set(
    ((remainingProducts ?? []) as Array<{ type?: unknown }>)
      .map((product) => (typeof product.type === "string" ? product.type : null))
      .filter((value): value is string => Boolean(value)),
  );

  // Fetch all current categories for the store to find orphaned ones
  const { data: currentCategories } = await client
    .from("product_categories")
    .select("id, name")
    .eq("store_id", storeId);

  const unusedCategoryIds = (currentCategories ?? [])
    .filter(c => !remainingCategoryNames.has(c.name))
    .map(c => c.id);

  if (unusedCategoryIds.length > 0) {
    const { error } = await client.from("product_categories").delete().eq("store_id", storeId).in("id", unusedCategoryIds);
    if (error) throw error;
  }

  // Fetch all current product types for the store to find orphaned ones
  const { data: currentTypes } = await client
    .from("product_types")
    .select("id, name")
    .eq("store_id", storeId);

  const unusedTypeNames = (currentTypes ?? [])
    .filter(t => !remainingTypeNames.has(t.name))
    .map(t => t.name);

  if (unusedTypeNames.length > 0) {
    const { error } = await client.from("product_types").delete().eq("store_id", storeId).in("name", unusedTypeNames);
    if (error) throw error;
  }
}

export async function reseedTemplateCatalog(
  client: SupabaseLikeClient,
  storeId: string,
  templateId: string,
  currentMetadata: TemplateSeedCatalogMetadata | null | undefined,
) {
  await unseedTemplateCatalog(client, storeId, currentMetadata);

  const catalogSeed = buildTemplateCatalogSeedRows(storeId, templateId);
  const [categoryResult, productTypeResult, productResult] = await Promise.all([
    catalogSeed.categoryRows.length > 0
      ? client.from("product_categories").upsert(catalogSeed.categoryRows, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    catalogSeed.productTypeRows.length > 0
      ? client.from("product_types").upsert(catalogSeed.productTypeRows)
      : Promise.resolve({ error: null }),
    catalogSeed.productRows.length > 0
      ? client.from("products").upsert(catalogSeed.productRows, { onConflict: "id" })
      : Promise.resolve({ error: null }),
  ]);

  if (categoryResult.error || productTypeResult.error || productResult.error) {
    throw categoryResult.error ?? productTypeResult.error ?? productResult.error;
  }

  return catalogSeed;
}
