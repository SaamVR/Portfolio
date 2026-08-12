import { revalidatePath, revalidateTag } from "next/cache";
import { canManageStore, getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { jsonNoStore } from "@/lib/http/cache-control";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

type StorefrontRefreshScope = "all" | "content" | "products";

function readStoreId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readProductPayload(
  value: unknown,
): Array<{ id: string; name: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const id = typeof (entry as { id?: unknown }).id === "string"
        ? (entry as { id: string }).id.trim()
        : "";
      const name = typeof (entry as { name?: unknown }).name === "string"
        ? (entry as { name: string }).name.trim()
        : "";

      if (!id || !name) {
        return null;
      }

      return { id, name };
    })
    .filter((entry): entry is { id: string; name: string } => Boolean(entry));
}

function readScope(value: unknown): StorefrontRefreshScope {
  return value === "content" || value === "products" || value === "all"
    ? value
    : "all";
}

function normalizePageTagSlug(slug: string) {
  const trimmed = slug.trim();
  if (!trimmed || trimmed === "/") {
    return "homepage";
  }

  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return normalized.replace(/[^\w/-]+/g, "-") || "homepage";
}

function readPageSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function readBoolean(value: unknown) {
  return value === true;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const includeSearch = readBoolean(body?.includeSearch);
    const includeTaxonomy = readBoolean(body?.includeTaxonomy);
    const storeId = readStoreId(body?.storeId);
    const pageSlugs = readPageSlugs(body?.pageSlugs);
    const scope = readScope(body?.scope);
    const products = readProductPayload(body?.products);
    if (!storeId) {
      return jsonNoStore({ error: "Missing storeId" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const allowed = await canManageStore(supabaseAdmin, storeId, user.id, ["owner", "admin", "editor"]);
    if (!allowed) {
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const [{ data: store, error: storeError }, { data: pages, error: pagesError }] = await Promise.all([
      supabaseAdmin.from("stores").select("slug").eq("id", storeId).maybeSingle(),
      supabaseAdmin.from("store_pages").select("slug").eq("store_id", storeId),
    ]);

    if (storeError) throw storeError;
    if (pagesError) throw pagesError;
    if (!store?.slug) {
      return jsonNoStore({ error: "Store not found" }, { status: 404 });
    }

    const storeSlug = String(store.slug);
    const shouldRefreshContent = scope === "all" || scope === "content";
    const shouldRefreshProducts = scope === "all" || scope === "products";

    revalidateTag(`store:${storeId}`, "max");

    if (shouldRefreshContent) {
      revalidateTag(`store:${storeId}:content`, "max");
      revalidateTag(`storefront:slug:${storeSlug}`, "max");
      revalidatePath(`/stores/${storeSlug}`);

      const scopedPageSlugs = pageSlugs.length > 0
        ? pageSlugs
        : (pages ?? [])
          .map((page) => (typeof page.slug === "string" ? page.slug : ""))
          .filter(Boolean);

      for (const pageSlug of scopedPageSlugs) {
        revalidateTag(`store:${storeId}:page:${normalizePageTagSlug(pageSlug)}`, "max");
      }

      for (const page of (pages ?? []) as Array<{ slug?: string | null }>) {
        const slug = typeof page.slug === "string" ? page.slug : "";
        if (!slug || slug === "/") {
          continue;
        }

        const normalized = slug.startsWith("/") ? slug.slice(1) : slug;
        if (!normalized) {
          continue;
        }

        revalidatePath(`/stores/${storeSlug}/${normalized}`);
      }
    }

    if (shouldRefreshProducts) {
      revalidateTag(`store:${storeId}:products`, "max");
      revalidatePath(`/stores/${storeSlug}/shop`);
      revalidatePath(`/stores/${storeSlug}/product/[slugId]`, "page");
    }

    if (includeTaxonomy) {
      revalidateTag(`store:${storeId}:taxonomy`, "max");
    }

    if (includeSearch) {
      revalidateTag(`store:${storeId}:search`, "max");
    }

    for (const product of products) {
      if (shouldRefreshProducts) {
        revalidateTag(`product:${product.id}`, "max");
        const productSlug = slugify(product.name);
        const slugId = productSlug
          ? `${productSlug}--${encodeURIComponent(product.id)}`
          : encodeURIComponent(product.id);
        revalidatePath(`/stores/${storeSlug}/product/${slugId}`);
      }
    }

    return jsonNoStore({
      ok: true,
      storeSlug,
      scope,
      includeSearch,
      includeTaxonomy,
      revalidatedProducts: products.length,
    });
  } catch (error) {
    console.error("Storefront revalidate route error:", error);
    return jsonNoStore({ error: "Failed to refresh storefront cache" }, { status: 500 });
  }
}
