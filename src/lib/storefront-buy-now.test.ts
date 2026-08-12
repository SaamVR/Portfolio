import { describe, expect, it } from "@/test/test-utils";
import type { CartItem } from "@/context/cart-context";
import { buildCustomerAuthPath } from "@/lib/storefront-customer-access";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";
import { clearBuyNowPayload, loadBuyNowPayload, saveBuyNowPayload } from "@/lib/storefront-buy-now";

const sampleBuyNowItems: CartItem[] = [
  {
    productId: "product-1",
    name: "Demo Product",
    price: 1499,
    image: "/demo.png",
    size: "Medium",
    quantity: 1,
    storeId: "store-123",
  },
];

function installSessionStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe("storefront buy now helpers", () => {
  it("stores buy now payloads in a store-scoped key that does not reuse the cart key", () => {
    expect(getScopedStorefrontStorageKey("buy-now", "store-123")).toBe("buy-now:store:store-123");
    expect(getScopedStorefrontStorageKey("cart", "store-123")).toBe("cart:store:store-123");
  });

  it("saves and loads buy now payloads without touching the normal cart namespace", () => {
    const originalWindow = globalThis.window;
    const originalSessionStorage = globalThis.sessionStorage;
    const sessionStorageMock = installSessionStorageMock();

    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: sessionStorageMock,
      configurable: true,
    });

    saveBuyNowPayload(sampleBuyNowItems, "store-123");

    const payload = loadBuyNowPayload("store-123");
    expect(payload?.items).toEqual(sampleBuyNowItems);
    expect(typeof payload?.createdAt).toBe("number");
    expect(sessionStorageMock.getItem(getScopedStorefrontStorageKey("cart", "store-123"))).toBeNull();

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: originalSessionStorage,
      configurable: true,
    });
  });

  it("clears only the targeted buy now payload", () => {
    const originalWindow = globalThis.window;
    const originalSessionStorage = globalThis.sessionStorage;
    const sessionStorageMock = installSessionStorageMock();

    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: sessionStorageMock,
      configurable: true,
    });

    saveBuyNowPayload(sampleBuyNowItems, "store-123");
    saveBuyNowPayload([
      {
        ...sampleBuyNowItems[0],
        productId: "product-2",
        storeId: "store-456",
      },
    ], "store-456");

    clearBuyNowPayload("store-123");

    expect(loadBuyNowPayload("store-123")).toBeNull();
    expect(loadBuyNowPayload("store-456")?.items[0]?.productId).toBe("product-2");

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: originalSessionStorage,
      configurable: true,
    });
  });

  it("builds a customer auth return path that preserves buy now checkout intent", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          pathname: "/admin",
          hostname: "localhost",
        },
      },
      configurable: true,
    });

    expect(
      buildCustomerAuthPath("/stores/merchant-noir/checkout?buy_now=1", "merchant-noir"),
    ).toBe("/stores/merchant-noir/auth?next=%2Fstores%2Fmerchant-noir%2Fcheckout%3Fbuy_now%3D1");

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });
});
