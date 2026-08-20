import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeStoreBlocks } from "@/lib/cms/validation";

test("legacy hero imageUrl is promoted into canonical mediaUrl", () => {
  const [hero] = sanitizeStoreBlocks([{
    id: "hero-legacy",
    type: "hero",
    sortOrder: 0,
    isVisible: true,
    props: {
      title: "Demo store",
      imageUrl: "/demo-assets/example/hero.jpg",
    },
  }]);

  if (!hero || hero.type !== "hero") throw new Error("Hero block was not preserved");
  assert.equal(hero.props.mediaUrl, "/demo-assets/example/hero.jpg");
  assert.equal(hero.props.mediaType, "image");
  assert.equal("imageUrl" in hero.props, false);
});

test("explicit canonical mediaUrl wins even when legacy imageUrl is present", () => {
  const [hero] = sanitizeStoreBlocks([{
    id: "hero-cleared",
    type: "hero",
    sortOrder: 0,
    isVisible: true,
    props: {
      mediaUrl: "",
      imageUrl: "/demo-assets/example/hero.jpg",
    },
  }]);

  if (!hero || hero.type !== "hero") throw new Error("Hero block was not preserved");
  assert.equal(hero.props.mediaUrl, "");
  assert.equal("imageUrl" in hero.props, false);
});
