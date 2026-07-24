import { describe, expect, it } from "@/test/test-utils";
import { createStoreSlug, extractIdFromSlug, productUrl, storePageUrl, storefrontPath } from "./slug";

describe("product slugs", () => {
  it("round-trips non-UUID product ids with hyphens", () => {
    const url = productUrl("launch-tshirt-black", "Premium Cotton T-Shirt - Black");

    expect(url).toBe("/product/premium-cotton-t-shirt-black--launch-tshirt-black");
    expect(extractIdFromSlug(url.replace("/product/", ""))).toBe("launch-tshirt-black");
  });

  it("extracts legacy launch-product slugs", () => {
    expect(extractIdFromSlug("premium-cotton-t-shirt-black-launch-tshirt-black")).toBe("launch-tshirt-black");
  });

  it("extracts UUID suffixes from old links", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";

    expect(extractIdFromSlug(`premium-shirt-${id}`)).toBe(id);
  });

  it("creates slug-safe store urls with the shared slug style", () => {
    expect(createStoreSlug("My Fancy Store!")).toBe("my-fancy-store");
    expect(createStoreSlug("")).toBe("my-store");
  });

  it("keeps storefront links root-relative on dedicated store domains", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          pathname: "/shop",
          hostname: "merchant-noir.ezcomo.shop",
        },
      },
      configurable: true,
    });

    expect(storefrontPath("/cart", "merchant-noir")).toBe("/cart");
    expect(storefrontPath("/contact", "merchant-noir")).toBe("/contact");
    expect(storefrontPath("/faq", "merchant-noir")).toBe("/faq");
    expect(storefrontPath("/auth?next=%2Faccount", "merchant-noir")).toBe("/auth?next=%2Faccount");
    expect(productUrl("launch-tshirt-black", "Premium Cotton T-Shirt - Black", "merchant-noir")).toBe(
      "/product/premium-cotton-t-shirt-black--launch-tshirt-black",
    );
    expect(storePageUrl("merchant-noir", "/about")).toBe("/about");

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });

  it("uses /stores fallback paths on the platform host", () => {
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

    expect(storefrontPath("/cart", "merchant-noir")).toBe("/stores/merchant-noir/cart");
    expect(storefrontPath("/contact", "merchant-noir")).toBe("/stores/merchant-noir/contact");
    expect(storefrontPath("/faq", "merchant-noir")).toBe("/stores/merchant-noir/faq");
    expect(storefrontPath("/auth?next=%2Fstores%2Fmerchant-noir%2Faccount", "merchant-noir")).toBe(
      "/stores/merchant-noir/auth?next=%2Fstores%2Fmerchant-noir%2Faccount",
    );
    expect(storePageUrl("merchant-noir", "/about")).toBe("/stores/merchant-noir/about");

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });

  it("keeps using /stores fallback paths when a platform-host storefront page is loaded at a shared path", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          pathname: "/contact",
          hostname: "localhost",
        },
      },
      configurable: true,
    });

    expect(storefrontPath("/", "merchant-noir")).toBe("/stores/merchant-noir");
    expect(storefrontPath("/shop", "merchant-noir")).toBe("/stores/merchant-noir/shop");

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });
});
