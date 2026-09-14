import { extractIdFromSlug, isUuid } from "@/lib/slug";

export type OrderItemInput = {
  productId?: unknown;
  size?: unknown;
  optionIds?: unknown;
  expectedUnitPrice?: unknown;
  quantity?: unknown;
};

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readOptionIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((entry) => readText(entry, 100))
    .filter(Boolean);
  if (ids.length > 20 || new Set(ids).size !== ids.length) {
    throw new Error("Cart contains invalid option identity");
  }
  return ids;
}

function readExpectedUnitPrice(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0 || amount > 2_000_000_000) {
    throw new Error("Cart contains an invalid expected unit price");
  }
  return amount;
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
      size: readText(item.size, 240) || "Default option",
      optionIds: readOptionIds(item.optionIds),
      expectedUnitPrice: readExpectedUnitPrice(item.expectedUnitPrice),
      quantity,
    };
  });
}
