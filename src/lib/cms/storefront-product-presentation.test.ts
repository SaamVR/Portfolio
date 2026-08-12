import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Product } from "@/data/products";
import {
  getRenderableColorOptions,
  getPrimaryProductOptionValue,
  getProductPresentationSpecs,
  getRenderableMetricOptionGroups,
  getRenderableSizeOptions,
} from "@/lib/cms/storefront-product-presentation";

const baseProduct: Product = {
  id: "product-1",
  name: "Metric Hoodie",
  price: 1200,
  image: "/hoodie.jpg",
  images: ["/hoodie.jpg"],
  description: "Test product",
  sizes: ["M", "L"],
  colors: ["Black"],
  category: "Apparel",
  type: "Hoodie",
  metricValues: {
    fabric: ["Cotton", "Linen"],
    fit: ["Regular", "Oversized"],
  },
};

describe("storefront product presentation metrics", () => {
  it("merges product metric values into presentation specs", () => {
    const specs = getProductPresentationSpecs(baseProduct, null);

    assert.deepEqual(specs.fabric, ["Cotton", "Linen"]);
    assert.deepEqual(specs.fit, ["Regular", "Oversized"]);
    assert.deepEqual(specs.specs?.fabric, ["Cotton", "Linen"]);
  });

  it("prefers explicit metric selections over legacy size fields", () => {
    const specs = getProductPresentationSpecs(baseProduct, null);

    assert.deepEqual(getRenderableSizeOptions(baseProduct, specs, "fashion"), ["M", "L"]);
    assert.deepEqual(getRenderableMetricOptionGroups(baseProduct, specs, "fashion"), [
      { key: "fabric", label: "Fabric", options: ["Cotton", "Linen"] },
      { key: "fit", label: "Fit", options: ["Regular", "Oversized"] },
    ]);
  });

  it("falls back to the first custom metric when no size or color is available", () => {
    const productWithoutLegacyOptions: Product = {
      ...baseProduct,
      sizes: [],
      colors: [],
    };
    const specs = getProductPresentationSpecs(productWithoutLegacyOptions, null);

    assert.equal(getPrimaryProductOptionValue(productWithoutLegacyOptions, specs, "service"), "Cotton");
  });

  it("suppresses legacy size and color when explicit metric selections exist without them", () => {
    const productWithExplicitMetrics: Product = {
      ...baseProduct,
      typeMetricSchema: [
        { key: "fabric", label: "Fabric" },
      ],
      metricValues: {
        fabric: ["Cotton"],
      },
    };
    const specs = getProductPresentationSpecs(productWithExplicitMetrics, null);

    assert.deepEqual(getRenderableSizeOptions(productWithExplicitMetrics, specs, "fashion"), []);
    assert.deepEqual(getRenderableColorOptions(productWithExplicitMetrics, specs, "fashion"), []);
    assert.deepEqual(getRenderableMetricOptionGroups(productWithExplicitMetrics, specs, "fashion"), [
      { key: "fabric", label: "Fabric", options: ["Cotton"] },
    ]);
  });

  it("keeps legacy size options when the type schema explicitly includes size", () => {
    const schemaDrivenProduct: Product = {
      ...baseProduct,
      typeMetricSchema: [
        { key: "size", label: "Size" },
        { key: "fabric", label: "Fabric" },
      ],
    };
    const specs = getProductPresentationSpecs(schemaDrivenProduct, null);

    assert.deepEqual(getRenderableSizeOptions(schemaDrivenProduct, specs, "fashion"), ["M", "L"]);
    assert.deepEqual(getRenderableMetricOptionGroups(schemaDrivenProduct, specs, "fashion"), [
      { key: "fabric", label: "Fabric", options: ["Cotton", "Linen"] },
    ]);
  });
});
