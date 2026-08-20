import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultStore } from "./default-store";
import { buildMarketplaceTemplateReview } from "./template-publisher";
import type { Store, StorePageBlock } from "./schema";

function cloneStore(): Store {
  return structuredClone(defaultStore);
}

function makeBrandStory(imageUrl: string): StorePageBlock {
  return {
    id: "story-media-test",
    type: "rich-text",
    sortOrder: 999,
    isVisible: true,
    visible: true,
    layoutVariant: "brand-story",
    props: {
      title: "Our story",
      body: { type: "doc", content: [] },
      align: "left",
      imageUrl,
      imageAlt: "Founder at work",
      imagePosition: "bottom-left",
      focalX: 33,
      focalY: "82",
    },
  } as StorePageBlock;
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

  it("preserves focal controls and safe brand-story media", () => {
    const store = cloneStore();
    const hero = store.pages[0]?.blocks.find((block) => block.type === "hero");
    assert.ok(hero);
    hero.props = {
      ...hero.props,
      mediaUrl: "https://images.example.com/hero.jpg",
      imagePosition: "top-right",
      focalX: 23,
      focalY: "71",
    };
    store.pages[0].blocks.push(makeBrandStory("https://images.example.com/story.jpg"));

    const review = buildMarketplaceTemplateReview(store);
    const publishedHero = review.bundle.pages?.[0]?.blocks.find((block) => block.type === "hero");
    const publishedStory = review.bundle.pages?.[0]?.blocks.find((block) => block.type === "rich-text" && block.layoutVariant === "brand-story");

    assert.equal(review.safetyStatus, "passed");
    assert.equal(publishedHero?.props.mediaUrl, "https://images.example.com/hero.jpg");
    assert.equal(publishedHero?.props.imagePosition, "top-right");
    assert.equal(publishedHero?.props.focalX, 23);
    assert.equal(publishedHero?.props.focalY, "71");

    if (!publishedStory || publishedStory.type !== "rich-text") {
      assert.fail("Expected a published rich-text brand-story block");
    }
    assert.equal(publishedStory.props.imageUrl, "https://images.example.com/story.jpg");
    assert.equal(publishedStory.props.imageAlt, "Founder at work");
    assert.equal(publishedStory.props.imagePosition, "bottom-left");
    assert.equal(publishedStory.props.focalX, 33);
    assert.equal(publishedStory.props.focalY, "82");
  });

  it("still strips merchant-private brand-story image URLs", () => {
    const store = cloneStore();
    store.pages[0].blocks.push(makeBrandStory("https://tenant.supabase.co/storage/v1/object/sign/private/story.jpg"));

    const review = buildMarketplaceTemplateReview(store);
    const publishedStory = review.bundle.pages?.[0]?.blocks.find((block) => block.type === "rich-text" && block.layoutVariant === "brand-story");

    if (!publishedStory || publishedStory.type !== "rich-text") {
      assert.fail("Expected a published rich-text brand-story block");
    }
    assert.equal(publishedStory.props.imageUrl, undefined);
    assert.equal(review.safetyStatus, "failed");
    assert.ok(review.safetyFindings.some((finding) => finding.path.endsWith("props.imageUrl")));
  });
});