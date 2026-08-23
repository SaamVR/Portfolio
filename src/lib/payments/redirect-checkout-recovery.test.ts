import test, { afterEach, describe } from "node:test";
import assert from "node:assert/strict";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";
import {
  captureRedirectCheckoutRecoveryState,
  completeRedirectCheckoutRecoveryState,
  restoreRedirectCheckoutRecoveryState,
} from "@/lib/payments/redirect-checkout-recovery";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  get length() {
    return this.values.size;
  }
}

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;

function installStorage(search = "") {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { search } },
  });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: local });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: session });
  return { local, session };
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalSessionStorage });
});

describe("redirect checkout browser recovery", () => {
  test("restores the exact cart and Buy Now state after the checkout source was cleared", () => {
    const { local, session } = installStorage();
    const storeId = "store_1";
    const orderNumber = "ORD-1001";
    const cartKey = getScopedStorefrontStorageKey("cart", storeId);
    const cartTimeKey = getScopedStorefrontStorageKey("cart-time", storeId);
    const buyNowKey = getScopedStorefrontStorageKey("buy-now", storeId);
    const cart = JSON.stringify([{ productId: "p1", size: "M", quantity: 2 }]);
    const buyNow = JSON.stringify({ items: [{ productId: "p2", size: "L", quantity: 1 }], createdAt: 1 });

    local.setItem(cartKey, cart);
    local.setItem(cartTimeKey, "123456");
    session.setItem(buyNowKey, buyNow);

    captureRedirectCheckoutRecoveryState(storeId, orderNumber);

    local.removeItem(cartKey);
    local.removeItem(cartTimeKey);
    session.removeItem(buyNowKey);

    assert.equal(restoreRedirectCheckoutRecoveryState(storeId, orderNumber), true);
    assert.equal(local.getItem(cartKey), cart);
    assert.equal(local.getItem(cartTimeKey), "123456");
    assert.equal(session.getItem(buyNowKey), buyNow);

    local.setItem(cartKey, "new-cart");
    assert.equal(restoreRedirectCheckoutRecoveryState(storeId, orderNumber), false);
    assert.equal(local.getItem(cartKey), "new-cart");
  });

  test("verified cart checkout removes only the cart source even if redirect interrupted React persistence", () => {
    const { local, session } = installStorage();
    const storeId = "store_1";
    const orderNumber = "ORD-1002";
    const cartKey = getScopedStorefrontStorageKey("cart", storeId);
    const cartTimeKey = getScopedStorefrontStorageKey("cart-time", storeId);
    const buyNowKey = getScopedStorefrontStorageKey("buy-now", storeId);

    local.setItem(cartKey, "paid-cart");
    local.setItem(cartTimeKey, "123456");
    session.setItem(buyNowKey, "unrelated-buy-now");
    captureRedirectCheckoutRecoveryState(storeId, orderNumber);

    assert.equal(completeRedirectCheckoutRecoveryState(storeId, orderNumber), "cart");
    assert.equal(local.getItem(cartKey), null);
    assert.equal(local.getItem(cartTimeKey), null);
    assert.equal(session.getItem(buyNowKey), "unrelated-buy-now");
    assert.equal(restoreRedirectCheckoutRecoveryState(storeId, orderNumber), false);
  });

  test("verified Buy Now checkout removes only the Buy Now source and preserves the shopper's normal cart", () => {
    const { local, session } = installStorage("?buy_now=1");
    const storeId = "store_1";
    const orderNumber = "ORD-1003";
    const cartKey = getScopedStorefrontStorageKey("cart", storeId);
    const buyNowKey = getScopedStorefrontStorageKey("buy-now", storeId);

    local.setItem(cartKey, "normal-cart-must-survive");
    session.setItem(buyNowKey, "paid-buy-now");
    captureRedirectCheckoutRecoveryState(storeId, orderNumber);

    assert.equal(completeRedirectCheckoutRecoveryState(storeId, orderNumber), "buy_now");
    assert.equal(session.getItem(buyNowKey), null);
    assert.equal(local.getItem(cartKey), "normal-cart-must-survive");
  });
});
