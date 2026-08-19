import type { BlogProductEmbedPosition } from "./blog";

export type BlogRecoverableDraft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  featured_image_alt: string;
  category: string;
  tags: string;
  author_name: string;
  is_featured: boolean;
  embedded_product_ids: string[];
  product_embed_title: string;
  product_embed_position: BlogProductEmbedPosition;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  canonical_url: string;
  og_image: string;
  noindex: boolean;
  status: "draft" | "published";
  published_at: string;
};

export type BlogDraftRecoveryEnvelope = {
  version: 1;
  storeId: string;
  postId: string | null;
  savedAt: string;
  serverUpdatedAt: string | null;
  draft: BlogRecoverableDraft;
};

const STORAGE_PREFIX = "ezcomo:blog-draft:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? record[key] as string : "";
}

function readBoolean(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function normalizeDraft(value: unknown): BlogRecoverableDraft | null {
  if (!isRecord(value)) return null;
  const position = readString(value, "product_embed_position");
  const status = readString(value, "status");
  const ids = Array.isArray(value.embedded_product_ids)
    ? value.embedded_product_ids.filter((id): id is string => typeof id === "string").slice(0, 8)
    : [];

  return {
    ...(typeof value.id === "string" && value.id ? { id: value.id } : {}),
    title: readString(value, "title"),
    slug: readString(value, "slug"),
    excerpt: readString(value, "excerpt"),
    content: readString(value, "content"),
    featured_image: readString(value, "featured_image"),
    featured_image_alt: readString(value, "featured_image_alt"),
    category: readString(value, "category"),
    tags: readString(value, "tags"),
    author_name: readString(value, "author_name"),
    is_featured: readBoolean(value, "is_featured"),
    embedded_product_ids: ids,
    product_embed_title: readString(value, "product_embed_title") || "Shop products from this story",
    product_embed_position: position === "before-content" || position === "after-intro" || position === "after-content"
      ? position
      : "after-content",
    seo_title: readString(value, "seo_title"),
    seo_description: readString(value, "seo_description"),
    seo_keywords: readString(value, "seo_keywords"),
    canonical_url: readString(value, "canonical_url"),
    og_image: readString(value, "og_image"),
    noindex: readBoolean(value, "noindex"),
    status: status === "published" ? "published" : "draft",
    published_at: readString(value, "published_at"),
  };
}

export function blogDraftStorageKey(storeId: string, postId?: string | null) {
  return `${STORAGE_PREFIX}:${storeId}:${postId || "new"}`;
}

export function blogDraftSignature(draft: BlogRecoverableDraft) {
  return JSON.stringify(draft);
}

export function hasMeaningfulBlogDraft(draft: BlogRecoverableDraft) {
  return Boolean(
    draft.title.trim()
    || draft.content.trim()
    || draft.excerpt.trim()
    || draft.featured_image.trim()
    || draft.category.trim()
    || draft.tags.trim()
    || draft.author_name.trim()
    || draft.seo_title.trim()
    || draft.seo_description.trim()
    || draft.seo_keywords.trim()
    || draft.canonical_url.trim()
    || draft.og_image.trim()
    || draft.embedded_product_ids.length > 0
    || draft.is_featured
    || draft.noindex
    || draft.status === "published"
    || draft.published_at.trim()
  );
}

export function createBlogDraftRecoveryEnvelope({
  storeId,
  draft,
  serverUpdatedAt = null,
  now = new Date(),
}: {
  storeId: string;
  draft: BlogRecoverableDraft;
  serverUpdatedAt?: string | null;
  now?: Date;
}): BlogDraftRecoveryEnvelope {
  return {
    version: 1,
    storeId,
    postId: draft.id || null,
    savedAt: now.toISOString(),
    serverUpdatedAt,
    draft,
  };
}

export function parseBlogDraftRecoveryEnvelope(raw: string | null): BlogDraftRecoveryEnvelope | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return null;
    const storeId = readString(parsed, "storeId");
    const savedAt = readString(parsed, "savedAt");
    const savedTime = new Date(savedAt).getTime();
    const draft = normalizeDraft(parsed.draft);
    if (!storeId || !draft || !Number.isFinite(savedTime)) return null;

    const postId = typeof parsed.postId === "string" && parsed.postId ? parsed.postId : null;
    if ((draft.id || null) !== postId) return null;

    return {
      version: 1,
      storeId,
      postId,
      savedAt,
      serverUpdatedAt: typeof parsed.serverUpdatedAt === "string" && parsed.serverUpdatedAt ? parsed.serverUpdatedAt : null,
      draft,
    };
  } catch {
    return null;
  }
}

export function isBlogDraftRecoveryNewer(
  envelope: BlogDraftRecoveryEnvelope,
  serverUpdatedAt?: string | null,
) {
  if (!serverUpdatedAt) return true;
  const savedTime = new Date(envelope.savedAt).getTime();
  const serverTime = new Date(serverUpdatedAt).getTime();
  if (!Number.isFinite(savedTime)) return false;
  if (!Number.isFinite(serverTime)) return true;
  return savedTime > serverTime;
}
