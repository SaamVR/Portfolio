import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultStore } from "./default-store";
import { buildMarketplaceTemplateReview } from "./template-publisher";
import type { Store } from "./schema";

function cloneStore(): Store {
  return structuredClone(defaultStore);
}

describe("marketplace template publisher", () => {
  it("strips unsafe merchant data and blocks marketplace submission", () => {
    const store = cloneStore();
    const hero = store.pages[0]?.blocks.find((block) => block.type === "hero");
    assert.ok(hero);
    hero.props = {
      ...hero.props,
      title: "Call +8801712345678 for wholesale",
      subtitle: "Email owner@example.com or send bKash TRX 123456",
      mediaUrl: "https://res.cloudinary.com/demo/image/upload/stores/private-merchant-logo.png",
    };
    hero.customHtml = "<script>fbq('track')</script>";

    const review = buildMarketplaceTemplateReview(store);
    const sanitizedHero = review.bundle.pages?.[0]?.blocks.find((block) => block.type === "hero");

    assert.equal(review.safetyStatus, "failed");
    assert.ok(review.safetyFindings.some((finding) => finding.code === "phone_detected"));
    assert.ok(review.safetyFindings.some((finding) => finding.code === "email_detected"));
    assert.ok(review.safetyFindings.some((finding) => finding.code === "payment_identifier_detected"));
    assert.ok(review.safetyFindings.some((finding) => finding.code === "block_custom_code_stripped"));
    assert.equal(sanitizedHero?.props.title, "");
    assert.equal(sanitizedHero?.props.subtitle, "");
    assert.equal("mediaUrl" in (sanitizedHero?.props ?? {}), false);
    assert.equal(sanitizedHero?.customHtml, undefined);
  });

  it("creates an independent clean bundle with fresh IDs", () => {
    const store = cloneStore();
    const review = buildMarketplaceTemplateReview(store);
    const originalIds = new Set(store.pages.flatMap((page) => [page.id, ...page.blocks.map((block) => block.id)]));
    const serializedIds = review.bundle.pages?.flatMap((page) => [page.id, ...page.blocks.map((block) => block.id)]) ?? [];

    assert.equal(review.safetyStatus, "passed");
    assert.equal(review.bundle.type, "theme-and-layout");
    assert.equal(review.bundle.theme.customCss, undefined);
    assert.ok(serializedIds.length > 0);
    assert.ok(serializedIds.every((id) => !originalIds.has(id)));
  });
});
