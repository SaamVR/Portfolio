import type { CartItem } from "@/context/cart-context";

export const MAX_CART_LINES = 50;
export const MAX_CART_QUANTITY = 99;

function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function clampCartQuantity(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(MAX_CART_QUANTITY, Math.max(1, Math.floor(parsed)));
}

export function normalizePersistedCartItems(value: unknown, expectedStoreId?: string): CartItem[] {
  if (!Array.isArray(value)) return [];

  const normalized: CartItem[] = [];

  for (const raw of value) {
    if (normalized.length >= MAX_CART_LINES) break;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;

    const record = raw as Record<string, unknown>;
    const productId = readText(record.productId, 120);
    const name = readText(record.name, 300);
    const image = readText(record.image, 2000);
    const size = readText(record.size, 80) || "Free Size";
    const rawStoreId = readText(record.storeId, 120);
    const storeId = rawStoreId || expectedStoreId;
    const price = typeof record.price === "number" ? record.price : Number(record.price);

    if (!productId || !name || !Number.isFinite(price) || price < 0) continue;
    if (expectedStoreId && rawStoreId && rawStoreId !== expectedStoreId) continue;

    const item: CartItem = {
      productId,
      name,
      price,
      image,
      size,
      quantity: clampCartQuantity(record.quantity),
      ...(storeId ? { storeId } : {}),
    };

    const existing = normalized.find((candidate) => (
      candidate.productId === item.productId
      && candidate.size === item.size
      && (candidate.storeId ?? null) === (item.storeId ?? null)
    ));

    if (existing) {
      existing.quantity = Math.max(existing.quantity, item.quantity);
      continue;
    }

    normalized.push(item);
  }

  return normalized;
}
