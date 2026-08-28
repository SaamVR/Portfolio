import { NextResponse } from "next/server";
import { jsonPublicStorefrontCache } from "@/lib/http/public-cache";
import { getStorefrontProducts } from "@/lib/storefront/storefront-products";
import { getValidatedStorePreviewTokenFromApiRequest } from "@/lib/cms/store-preview-request";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseIds(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => uuidPattern.test(item));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId")?.trim() ?? "";
  const productId = url.searchParams.get("id")?.trim() ?? "";
  const ids = parseIds(url.searchParams.get("ids"));
  const featuredOnly = url.searchParams.get("featured") === "1";

  if (!uuidPattern.test(storeId)) {
    return jsonPublicStorefrontCache({ error: "Invalid store" }, { status: 400 });
  }

  if (productId && !uuidPattern.test(productId)) {
    return jsonPublicStorefrontCache({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const previewToken = await getValidatedStorePreviewTokenFromApiRequest(req, storeId);
    const data = await getStorefrontProducts({
      storeId,
      productId: productId || null,
      ids,
      featuredOnly,
      previewToken,
    });

    if (data === null) {
      return jsonPublicStorefrontCache({ error: "Store not found" }, { status: 404 });
    }

    return previewToken
      ? NextResponse.json(data, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
      : jsonPublicStorefrontCache(data);
  } catch (error) {
    console.error("Public storefront products error:", error);
    return jsonPublicStorefrontCache({ error: "Failed to load storefront products" }, { status: 500 });
  }
}
