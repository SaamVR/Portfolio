import { describe, expect, it } from "@/test/test-utils";
import {
  createStoreSlug,
  extractIdFromSlug,
  isDedicatedStorefrontHost,
  productUrl,
  shouldUseDedicatedStorefrontPaths,
  storePageUrl,
  storefrontPath,
} from "./slug";

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

  it("builds canonical scoped storefront links independently of browser hostname", () => {
    expect(storefrontPath("/", "merchant-noir")).toBe("/stores/merchant-noir");
    expect(storefrontPath("/cart", "merchant-noir")).toBe("/stores/merchant-noir/cart");
    expect(storefrontPath("/contact", "merchant-noir")).toBe("/stores/merchant-noir/contact");
    expect(storefrontPath("/faq", "merchant-noir")).toBe("/stores/merchant-noir/faq");
    expect(storefrontPath("/auth?next=%2Faccount", "merchant-noir")).toBe(
      "/stores/merchant-noir/auth?next=%2Faccount",
    );
    expect(productUrl("launch-tshirt-black", "Premium Cotton T-Shirt - Black", "merchant-noir")).toBe(
      "/stores/merchant-noir/product/premium-cotton-t-shirt-black--launch-tshirt-black",
    );
    expect(storePageUrl("merchant-noir", "/about")).toBe("/stores/merchant-noir/about");
  });

  it("keeps platform application paths outside tenant scope", () => {
    expect(storefrontPath("/admin/products", "merchant-noir")).toBe("/admin/products");
    expect(storefrontPath("/cms-admin/pages", "merchant-noir")).toBe("/cms-admin/pages");
    expect(storefrontPath("/signup?intent=new-store", "merchant-noir")).toBe("/signup?intent=new-store");
  });

  it("distinguishes dedicated-host detection from path-sensitive redirect behavior", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          pathname: "/",
          hostname: "merchant-noir.ezcomo.shop",
          host: "merchant-noir.ezcomo.shop",
        },
      },
      configurable: true,
    });

    expect(isDedicatedStorefrontHost("merchant-noir")).toBe(true);
    expect(shouldUseDedicatedStorefrontPaths("merchant-noir")).toBe(false);

    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          pathname: "/shop",
          hostname: "merchant-noir.ezcomo.shop",
          host: "merchant-noir.ezcomo.shop",
        },
      },
      configurable: true,
    });

    expect(shouldUseDedicatedStorefrontPaths("merchant-noir")).toBe(true);

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });
});
