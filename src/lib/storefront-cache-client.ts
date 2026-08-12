import type { SupabaseClient } from "@supabase/supabase-js";

type StorefrontProductRefreshPayload = {
  id: string;
  name: string;
};

type StorefrontRefreshScope = "all" | "content" | "products";
type StorefrontPageRefreshPayload = string;
type StorefrontRefreshOptions = {
  includeSearch?: boolean;
  includeTaxonomy?: boolean;
  pageSlugs?: StorefrontPageRefreshPayload[];
  products?: StorefrontProductRefreshPayload[];
  scope?: StorefrontRefreshScope;
};

export async function refreshStorefrontCacheForStore(
  supabase: SupabaseClient<any>,
  storeId: string,
  options?: StorefrontRefreshOptions,
) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Missing authenticated session for storefront cache refresh.");
  }

  const response = await fetch("/api/cache/storefront/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      includeSearch: options?.includeSearch === true,
      includeTaxonomy: options?.includeTaxonomy === true,
      storeId,
      pageSlugs: (options?.pageSlugs ?? []).filter((pageSlug) => typeof pageSlug === "string" && pageSlug.trim().length > 0),
      scope: options?.scope ?? "all",
      products: (options?.products ?? []).filter((product) => product.id && product.name),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Failed to refresh storefront cache.",
    );
  }

  return response.json().catch(() => ({ ok: true }));
}

export async function refreshStorefrontContentCache(
  supabase: SupabaseClient<any>,
  storeId: string,
  options?: {
    pageSlugs?: StorefrontPageRefreshPayload[];
  },
) {
  return refreshStorefrontCacheForStore(supabase, storeId, {
    includeSearch: false,
    includeTaxonomy: false,
    scope: "content",
    pageSlugs: options?.pageSlugs,
  });
}

export async function refreshStorefrontProductCache(
  supabase: SupabaseClient<any>,
  storeId: string,
  options?: {
    products?: StorefrontProductRefreshPayload[];
  },
) {
  return refreshStorefrontCacheForStore(supabase, storeId, {
    includeSearch: true,
    includeTaxonomy: false,
    scope: "products",
    products: options?.products,
  });
}

export async function refreshStorefrontTaxonomyCache(
  supabase: SupabaseClient<any>,
  storeId: string,
  options?: {
    pageSlugs?: StorefrontPageRefreshPayload[];
    scope?: StorefrontRefreshScope;
  },
) {
  return refreshStorefrontCacheForStore(supabase, storeId, {
    includeSearch: true,
    includeTaxonomy: true,
    pageSlugs: options?.pageSlugs,
    scope: options?.scope ?? "products",
  });
}

export async function refreshEntireStorefrontCache(
  supabase: SupabaseClient<any>,
  storeId: string,
  options?: {
    pageSlugs?: StorefrontPageRefreshPayload[];
    products?: StorefrontProductRefreshPayload[];
  },
) {
  return refreshStorefrontCacheForStore(supabase, storeId, {
    includeSearch: true,
    includeTaxonomy: true,
    scope: "all",
    pageSlugs: options?.pageSlugs,
    products: options?.products,
  });
}
