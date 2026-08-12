import type { CartItem } from "@/context/cart-context";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

type BuyNowPayload = {
  items: CartItem[];
  createdAt: number;
};

function getBuyNowStorageKey(storeId?: string | null) {
  return getScopedStorefrontStorageKey("buy-now", storeId);
}

export function saveBuyNowPayload(items: CartItem[], storeId?: string | null) {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return;
  }

  const payload: BuyNowPayload = {
    items,
    createdAt: Date.now(),
  };

  sessionStorage.setItem(getBuyNowStorageKey(storeId), JSON.stringify(payload));
}

export function loadBuyNowPayload(storeId?: string | null) {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(getBuyNowStorageKey(storeId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BuyNowPayload>;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null;
    }

    return {
      items: parsed.items as CartItem[],
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearBuyNowPayload(storeId?: string | null) {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(getBuyNowStorageKey(storeId));
}
