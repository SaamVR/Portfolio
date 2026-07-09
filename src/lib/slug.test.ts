import { describe, expect, it } from "@/test/test-utils";
import { extractIdFromSlug, productUrl } from "./slug";

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
});
