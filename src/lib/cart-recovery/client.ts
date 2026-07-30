import type { CartItem } from "@/context/cart-context";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

export type RecoveryConsentStatus = "accepted" | "declined" | "unknown";

export function readRecoveryConsentStatus(storeId?: string | null): RecoveryConsentStatus {
  if (typeof window === "undefined") {
    return "unknown";
  }

  try {
    const value = window.localStorage.getItem(getScopedStorefrontStorageKey("cookie-consent", storeId));
    if (value === "accepted" || value === "declined") {
      return value;
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

export function buildRecoveryCartSnapshot(items: CartItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    variant: item.size,
  }));
}
