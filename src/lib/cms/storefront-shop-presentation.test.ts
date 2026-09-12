import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveShopPageVariant } from "@/lib/cms/storefront-shop-presentation";

describe("storefront shop presentation", () => {
  it("routes Threads through the apparel catalog presentation", () => {
    assert.equal(resolveShopPageVariant({ templateId: "threads" }), "fashion");
    assert.equal(resolveShopPageVariant({ templateId: "fashion" }), "fashion");
  });

  it("keeps explicit merchant shop variants authoritative", () => {
    assert.equal(resolveShopPageVariant({ templateId: "threads", pageShopVariant: "generic" }), "generic");
  });
});
