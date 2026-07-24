import { extractIdFromSlug, isUuid } from "@/lib/slug";

export type OrderItemInput = {
  productId?: unknown;
  size?: unknown;
  quantity?: unknown;
};

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function normalizeOrderItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new Error("Cart must contain between 1 and 50 items");
  }

  return items.map((raw) => {
    const item = raw as OrderItemInput;
    const rawProductId = typeof item.productId === "string" ? item.productId.trim() : "";
    const productId = extractIdFromSlug(rawProductId);
    const quantity = Number(item.quantity);

    if (!isUuid(productId)) {
      throw new Error("Cart contains an invalid product");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("Cart contains an invalid quantity");
    }

    return {
      productId,
      size: readText(item.size, 80) || "Free Size",
      quantity,
    };
  });
}
