import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

export type RedirectCheckoutSource = "cart" | "buy_now";

type RedirectCheckoutRecoverySnapshot = {
  storeId: string;
  orderNumber: string;
  source: RedirectCheckoutSource;
  cart: string | null;
  cartTime: string | null;
  buyNow: string | null;
  createdAt: number;
};

const recoveryPrefix = "redirect-checkout-recovery";
const recoveryMaxAgeMs = 24 * 60 * 60 * 1000;

function recoveryKey(storeId: string, orderNumber: string) {
  return `${recoveryPrefix}:${storeId}:${orderNumber}`;
}

function cartKey(storeId: string) {
  return getScopedStorefrontStorageKey("cart", storeId);
}

function cartTimeKey(storeId: string) {
  return getScopedStorefrontStorageKey("cart-time", storeId);
}

function buyNowKey(storeId: string) {
  return getScopedStorefrontStorageKey("buy-now", storeId);
}

function canUseBrowserStorage() {
  return typeof window !== "undefined"
    && typeof localStorage !== "undefined"
    && typeof sessionStorage !== "undefined";
}

function parseSnapshot(storeId: string, orderNumber: string) {
  if (!canUseBrowserStorage() || !storeId || !orderNumber) return null;

  const key = recoveryKey(storeId, orderNumber);
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;

  try {
    const snapshot = JSON.parse(raw) as Partial<RedirectCheckoutRecoverySnapshot>;
    if (
      snapshot.storeId !== storeId
      || snapshot.orderNumber !== orderNumber
      || (snapshot.source !== "cart" && snapshot.source !== "buy_now")
      || typeof snapshot.createdAt !== "number"
      || Date.now() - snapshot.createdAt > recoveryMaxAgeMs
    ) {
      sessionStorage.removeItem(key);
      return null;
    }

    return snapshot as RedirectCheckoutRecoverySnapshot;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function captureRedirectCheckoutRecoveryState(storeId: string, orderNumber: string) {
  if (!canUseBrowserStorage() || !storeId || !orderNumber) return;

  const buyNow = sessionStorage.getItem(buyNowKey(storeId));
  const buyNowRequested = new URLSearchParams(window.location?.search ?? "").get("buy_now") === "1";
  const snapshot: RedirectCheckoutRecoverySnapshot = {
    storeId,
    orderNumber,
    source: buyNowRequested && buyNow ? "buy_now" : "cart",
    cart: localStorage.getItem(cartKey(storeId)),
    cartTime: localStorage.getItem(cartTimeKey(storeId)),
    buyNow,
    createdAt: Date.now(),
  };

  sessionStorage.setItem(recoveryKey(storeId, orderNumber), JSON.stringify(snapshot));
}

export function restoreRedirectCheckoutRecoveryState(storeId: string, orderNumber: string) {
  const snapshot = parseSnapshot(storeId, orderNumber);
  if (!snapshot) return false;

  if (typeof snapshot.cart === "string") {
    localStorage.setItem(cartKey(storeId), snapshot.cart);
  } else {
    localStorage.removeItem(cartKey(storeId));
  }

  if (typeof snapshot.cartTime === "string") {
    localStorage.setItem(cartTimeKey(storeId), snapshot.cartTime);
  } else {
    localStorage.removeItem(cartTimeKey(storeId));
  }

  if (typeof snapshot.buyNow === "string") {
    sessionStorage.setItem(buyNowKey(storeId), snapshot.buyNow);
  } else {
    sessionStorage.removeItem(buyNowKey(storeId));
  }

  sessionStorage.removeItem(recoveryKey(storeId, orderNumber));
  return true;
}

/**
 * Finalize only the checkout source that produced the verified redirect order.
 * This makes successful redirect checkout deterministic even if an immediate
 * location change interrupted React's normal cart persistence effect.
 */
export function completeRedirectCheckoutRecoveryState(
  storeId: string,
  orderNumber: string,
): RedirectCheckoutSource | null {
  const snapshot = parseSnapshot(storeId, orderNumber);
  if (!snapshot) return null;

  if (snapshot.source === "buy_now") {
    sessionStorage.removeItem(buyNowKey(storeId));
  } else {
    localStorage.removeItem(cartKey(storeId));
    localStorage.removeItem(cartTimeKey(storeId));
  }

  sessionStorage.removeItem(recoveryKey(storeId, orderNumber));
  return snapshot.source;
}

export function discardRedirectCheckoutRecoveryState(storeId: string, orderNumber: string) {
  if (!canUseBrowserStorage() || !storeId || !orderNumber) return;
  sessionStorage.removeItem(recoveryKey(storeId, orderNumber));
}
