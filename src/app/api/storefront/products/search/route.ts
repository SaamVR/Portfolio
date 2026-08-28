import { NextResponse } from "next/server";
import { jsonPublicStorefrontCache } from "@/lib/http/public-cache";
import { searchStorefrontProducts } from "@/lib/storefront/storefront-product-search";
import { getValidatedStorePreviewTokenFromApiRequest } from "@/lib/cms/store-preview-request";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const storefrontProductSearchRouteDeps = {
  searchStorefrontProducts,
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId")?.trim() ?? "";
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!uuidPattern.test(storeId)) {
    return jsonPublicStorefrontCache({ error: "Invalid store" }, { status: 400 });
  }

  if (!query) {
    return jsonPublicStorefrontCache([]);
  }

  try {
    const previewToken = await getValidatedStorePreviewTokenFromApiRequest(req, storeId);
    const results = await storefrontProductSearchRouteDeps.searchStorefrontProducts({
      storeId,
      query,
      category: url.searchParams.get("category"),
      type: url.searchParams.get("type"),
      minPrice: readNumber(url.searchParams.get("min")),
      maxPrice: readNumber(url.searchParams.get("max")),
      saleOnly: url.searchParams.get("sale") === "1",
      perPage: readNumber(url.searchParams.get("perPage")) ?? 48,
      ...(previewToken ? { previewToken } : {}),
    });

    return previewToken
      ? NextResponse.json(results ?? [], { headers: { "Cache-Control": "private, no-store, max-age=0" } })
      : jsonPublicStorefrontCache(results ?? []);
  } catch (error) {
    console.error("Public storefront product search error:", error);
    return jsonPublicStorefrontCache({ error: "Failed to search storefront products" }, { status: 500 });
  }
}
