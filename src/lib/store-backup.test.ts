import assert from "node:assert/strict";
import { describe, expect, it } from "@/test/test-utils";
import {
  assertBackupReviewReferences,
  collectMediaUrlsFromValue,
  inferBackupMediaFileName,
  inferBackupMediaFolder,
  replaceUrlsInValue,
} from "@/lib/store-backup";

describe("store backup helpers", () => {
  it("collects nested media urls", () => {
    const urls = collectMediaUrlsFromValue({
      logo: "https://example.com/logo.png",
      sections: [
        { mediaUrl: "https://example.com/hero.mp4" },
        { title: "Ignore me" },
      ],
    });

    expect(Array.from(urls)).toEqual([
      "https://example.com/logo.png",
      "https://example.com/hero.mp4",
    ]);
  });

  it("replaces urls recursively", () => {
    const next = replaceUrlsInValue(
      {
        logo: "https://old.example/logo.png",
        gallery: ["https://old.example/1.png", "keep"],
      },
      new Map([
        ["https://old.example/logo.png", "https://new.example/logo.png"],
        ["https://old.example/1.png", "https://new.example/1.png"],
      ]),
    );

    expect(next).toEqual({
      logo: "https://new.example/logo.png",
      gallery: ["https://new.example/1.png", "keep"],
    });
  });

  it("accepts review references that are contained in the same backup", () => {
    assert.doesNotThrow(() => assertBackupReviewReferences({
      products: [{ id: "product-1" }],
      orders: [{ id: "order-1" }],
      product_reviews: [
        { product_id: "product-1", order_id: "order-1" },
        { product_id: "product-1", order_id: null },
      ],
    }));
  });

  it("rejects review product references that are not contained in the backup", () => {
    assert.throws(
      () => assertBackupReviewReferences({
        products: [{ id: "product-1" }],
        orders: [],
        product_reviews: [{ product_id: "foreign-product", order_id: null }],
      }),
      /references a product that is not included in the backup/,
    );
  });

  it("rejects review order references that are not contained in the backup", () => {
    assert.throws(
      () => assertBackupReviewReferences({
        products: [{ id: "product-1" }],
        orders: [{ id: "order-1" }],
        product_reviews: [{ product_id: "product-1", order_id: "foreign-order" }],
      }),
      /references an order that is not included in the backup/,
    );
  });

  it("infers backup media names and folders", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/stores/ezcomo/hero/v123456/banner.jpg";
    expect(inferBackupMediaFileName(url)).toBe("banner.jpg");
    expect(inferBackupMediaFolder(url)).toBe("stores/ezcomo/hero");
  });
});
