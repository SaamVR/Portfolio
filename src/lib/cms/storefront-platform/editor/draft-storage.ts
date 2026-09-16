import type { Store } from "@/lib/cms/schema";

export const STOREFRONT_EDITOR_DRAFT_VERSION = 1;
export const STOREFRONT_EDITOR_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const STOREFRONT_EDITOR_DRAFT_MAX_BYTES = 3_500_000;

export type StorefrontEditorDraftEnvelope = {
  version: typeof STOREFRONT_EDITOR_DRAFT_VERSION;
  storeId: string;
  pageId: string;
  savedAt: number;
  baseSnapshot: string;
  draft: Store;
};

export type DraftReadResult =
  | { status: "missing" }
  | { status: "stale" | "invalid" | "base-mismatch"; savedAt?: number }
  | { status: "available"; envelope: StorefrontEditorDraftEnvelope };

export function getStorefrontEditorDraftKey(storeId: string, pageId: string) {
  return `ezcomo:storefront-editor:draft:v${STOREFRONT_EDITOR_DRAFT_VERSION}:${storeId}:${pageId}`;
}

export function buildStorefrontEditorDraftEnvelope(input: {
  store: Store;
  pageId: string;
  baseSnapshot: string;
  savedAt?: number;
}): StorefrontEditorDraftEnvelope {
  return {
    version: STOREFRONT_EDITOR_DRAFT_VERSION,
    storeId: input.store.id,
    pageId: input.pageId,
    savedAt: input.savedAt ?? Date.now(),
    baseSnapshot: input.baseSnapshot,
    draft: input.store,
  };
}

export function serializeStorefrontEditorDraft(envelope: StorefrontEditorDraftEnvelope) {
  const serialized = JSON.stringify(envelope);
  if (serialized.length > STOREFRONT_EDITOR_DRAFT_MAX_BYTES) {
    throw new Error("Storefront editor draft is too large for local protection.");
  }
  return serialized;
}

export function parseStorefrontEditorDraft(
  raw: string | null,
  input: { storeId: string; pageId: string; baseSnapshot: string; now?: number },
): DraftReadResult {
  if (!raw) return { status: "missing" };

  try {
    const parsed = JSON.parse(raw) as Partial<StorefrontEditorDraftEnvelope>;
    if (
      parsed.version !== STOREFRONT_EDITOR_DRAFT_VERSION
      || parsed.storeId !== input.storeId
      || parsed.pageId !== input.pageId
      || typeof parsed.savedAt !== "number"
      || typeof parsed.baseSnapshot !== "string"
      || !parsed.draft
      || typeof parsed.draft !== "object"
      || parsed.draft.id !== input.storeId
    ) {
      return { status: "invalid" };
    }

    const now = input.now ?? Date.now();
    if (now - parsed.savedAt > STOREFRONT_EDITOR_DRAFT_MAX_AGE_MS) {
      return { status: "stale", savedAt: parsed.savedAt };
    }

    if (parsed.baseSnapshot !== input.baseSnapshot) {
      return { status: "base-mismatch", savedAt: parsed.savedAt };
    }

    return { status: "available", envelope: parsed as StorefrontEditorDraftEnvelope };
  } catch {
    return { status: "invalid" };
  }
}
