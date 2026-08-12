import { revalidateTag } from "next/cache";
import { jsonNoStore } from "@/lib/http/cache-control";
import { deleteStorefrontSearchDocuments, upsertStorefrontSearchDocuments } from "@/lib/storefront/storefront-product-search";

function getWebhookSecret() {
  return process.env.STOREFRONT_SEARCH_WEBHOOK_SECRET?.trim() || process.env.BILLING_WEBHOOK_SECRET?.trim() || "";
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readProductIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string") {
        return (entry as { id: string }).id.trim();
      }
      return "";
    })
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const expectedSecret = getWebhookSecret();
    const providedSecret = req.headers.get("x-commerce-webhook-secret")?.trim() || req.headers.get("x-storefront-search-secret")?.trim() || "";

    if (expectedSecret && providedSecret !== expectedSecret) {
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const storeId = readString(body?.storeId);
    const action = readString(body?.action).toLowerCase() || "upsert";
    const productIds = readProductIds(body?.productIds ?? body?.products);

    if (!storeId) {
      return jsonNoStore({ error: "Missing storeId" }, { status: 400 });
    }

    const result = action === "delete"
      ? await deleteStorefrontSearchDocuments(storeId, productIds)
      : await upsertStorefrontSearchDocuments(storeId, productIds);

    revalidateTag(`store:${storeId}`, "max");
    revalidateTag(`store:${storeId}:products`, "max");
    revalidateTag(`store:${storeId}:search`, "max");

    return jsonNoStore({
      ok: true,
      action,
      storeId,
      productCount: productIds.length,
      ...result,
    });
  } catch (error) {
    console.error("Storefront search sync error:", error);
    return jsonNoStore({ error: "Failed to sync storefront search index" }, { status: 500 });
  }
}
