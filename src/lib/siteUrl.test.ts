import { describe, expect, it } from "@/test/test-utils";
import { absoluteStoreUrl } from "@/lib/siteUrl";

describe("site url helpers", () => {
  it("prefers a store custom domain over platform fallback paths", () => {
    expect(
      absoluteStoreUrl(
        { slug: "merchant-noir", customDomain: "shop.example.com" },
        "/shop",
      ),
    ).toBe("https://shop.example.com/shop");
  });

  it("falls back to the platform store path when no assigned domain exists", () => {
    expect(
      absoluteStoreUrl(
        { slug: "merchant-noir" },
        "/product/launch-hoodie--00000000-0000-4000-8000-000000000001",
      ),
    ).toBe("https://merchant-noir.ezcomo.shop/product/launch-hoodie--00000000-0000-4000-8000-000000000001");
  });
});
