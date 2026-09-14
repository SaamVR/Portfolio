import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultStore } from "@/lib/cms/default-store";
import {
  STOREFRONT_EDITOR_DRAFT_MAX_AGE_MS,
  buildStorefrontEditorDraftEnvelope,
  getStorefrontEditorDraftKey,
  parseStorefrontEditorDraft,
  serializeStorefrontEditorDraft,
} from "./draft-storage";

const pageId = defaultStore.pages[0]!.id;
const baseSnapshot = JSON.stringify(defaultStore);

describe("storefront editor local draft storage", () => {
  it("round-trips a page-scoped local draft when the persisted baseline still matches", () => {
    const draft = structuredClone(defaultStore);
    draft.name = "Recovered merchant draft";
    const envelope = buildStorefrontEditorDraftEnvelope({ store: draft, pageId, baseSnapshot, savedAt: 1000 });
    const result = parseStorefrontEditorDraft(serializeStorefrontEditorDraft(envelope), {
      storeId: defaultStore.id,
      pageId,
      baseSnapshot,
      now: 1500,
    });

    assert.equal(result.status, "available");
    if (result.status === "available") {
      assert.equal(result.envelope.draft.name, "Recovered merchant draft");
    }
  });

  it("rejects stale drafts and drafts based on a different persisted storefront snapshot", () => {
    const envelope = buildStorefrontEditorDraftEnvelope({ store: defaultStore, pageId, baseSnapshot, savedAt: 1000 });
    const raw = serializeStorefrontEditorDraft(envelope);

    assert.equal(parseStorefrontEditorDraft(raw, {
      storeId: defaultStore.id,
      pageId,
      baseSnapshot,
      now: 1000 + STOREFRONT_EDITOR_DRAFT_MAX_AGE_MS + 1,
    }).status, "stale");

    assert.equal(parseStorefrontEditorDraft(raw, {
      storeId: defaultStore.id,
      pageId,
      baseSnapshot: `${baseSnapshot}-server-changed`,
      now: 1500,
    }).status, "base-mismatch");
  });

  it("uses a stable store/page/version key and rejects malformed payloads", () => {
    assert.match(getStorefrontEditorDraftKey("store-1", "page-2"), /store-1:page-2$/);
    assert.equal(parseStorefrontEditorDraft("{bad-json", {
      storeId: defaultStore.id,
      pageId,
      baseSnapshot,
    }).status, "invalid");
  });
});
