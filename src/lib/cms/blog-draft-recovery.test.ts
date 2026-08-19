import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blogDraftSignature,
  blogDraftStorageKey,
  createBlogDraftRecoveryEnvelope,
  hasMeaningfulBlogDraft,
  isBlogDraftRecoveryNewer,
  parseBlogDraftRecoveryEnvelope,
  type BlogRecoverableDraft,
} from "./blog-draft-recovery";

const emptyDraft: BlogRecoverableDraft = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image: "",
  featured_image_alt: "",
  category: "",
  tags: "",
  author_name: "",
  is_featured: false,
  embedded_product_ids: [],
  product_embed_title: "Shop products from this story",
  product_embed_position: "after-content",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  canonical_url: "",
  og_image: "",
  noindex: false,
  status: "draft",
  published_at: "",
};

describe("Blog local draft recovery", () => {
  it("keys new and existing drafts per store without collisions", () => {
    assert.equal(blogDraftStorageKey("store-1"), "ezcomo:blog-draft:v1:store-1:new");
    assert.equal(blogDraftStorageKey("store-1", "post-1"), "ezcomo:blog-draft:v1:store-1:post-1");
    assert.notEqual(blogDraftStorageKey("store-1", "post-1"), blogDraftStorageKey("store-2", "post-1"));
  });

  it("does not persist an untouched empty editor as a meaningful draft", () => {
    assert.equal(hasMeaningfulBlogDraft(emptyDraft), false);
    assert.equal(hasMeaningfulBlogDraft({ ...emptyDraft, content: "Draft content" }), true);
  });

  it("round-trips a typed recovery envelope and normalizes unsafe values", () => {
    const draft = {
      ...emptyDraft,
      id: "post-1",
      title: "Recovered article",
      embedded_product_ids: ["a", "b"],
      product_embed_position: "after-intro" as const,
    };
    const envelope = createBlogDraftRecoveryEnvelope({
      storeId: "store-1",
      draft,
      serverUpdatedAt: "2026-08-19T10:00:00.000Z",
      now: new Date("2026-08-19T10:05:00.000Z"),
    });

    assert.deepEqual(parseBlogDraftRecoveryEnvelope(JSON.stringify(envelope)), envelope);
  });

  it("rejects malformed or mismatched recovery payloads", () => {
    assert.equal(parseBlogDraftRecoveryEnvelope("not-json"), null);
    assert.equal(parseBlogDraftRecoveryEnvelope(JSON.stringify({ version: 2 })), null);
    const envelope = createBlogDraftRecoveryEnvelope({
      storeId: "store-1",
      draft: { ...emptyDraft, id: "post-1", content: "Changed" },
    });
    assert.equal(parseBlogDraftRecoveryEnvelope(JSON.stringify({ ...envelope, postId: "post-2" })), null);
  });

  it("only offers an existing recovery when the local save is newer than the server record", () => {
    const envelope = createBlogDraftRecoveryEnvelope({
      storeId: "store-1",
      draft: { ...emptyDraft, id: "post-1", content: "Changed" },
      now: new Date("2026-08-19T10:05:00.000Z"),
    });

    assert.equal(isBlogDraftRecoveryNewer(envelope, "2026-08-19T10:00:00.000Z"), true);
    assert.equal(isBlogDraftRecoveryNewer(envelope, "2026-08-19T10:10:00.000Z"), false);
    assert.equal(isBlogDraftRecoveryNewer(envelope, null), true);
  });

  it("uses a stable draft signature for dirty-state comparisons", () => {
    const draft = { ...emptyDraft, title: "A", content: "B" };
    assert.equal(blogDraftSignature(draft), blogDraftSignature({ ...draft }));
    assert.notEqual(blogDraftSignature(draft), blogDraftSignature({ ...draft, content: "C" }));
  });
});
