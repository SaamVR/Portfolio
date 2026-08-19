import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import { normalizeBlogSettings, type BlogSettings } from "@/lib/cms/blog-settings";
import type { BlogPostRecord, BlogProductDirective, BlogProductRecord } from "@/lib/cms/blog";

type PublicBlogQuery = {
  limit?: number;
  category?: string | null;
  tag?: string | null;
  search?: string | null;
  excludeId?: string | null;
};

type SmartBlogProductCandidate = BlogProductRecord;

const BLOG_PRODUCT_STOP_WORDS = new Set([
  "about", "after", "best", "buy", "buying", "choose", "from", "guide", "into", "more",
  "product", "products", "right", "shop", "shopping", "that", "their", "this", "tips", "what",
  "when", "where", "which", "with", "your",
]);

function getBlogReadClient(): SupabaseClient | null {
  try {
    // Server-only service-role reads let the application repair legacy visibility
    // semantics while the result is still explicitly restricted to public posts.
    return getSupabaseAdminClient();
  } catch {
    return getCmsSupabaseServerClient();
  }
}

function normalizeText(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function looselyMatches(value: string, term: string) {
  return Boolean(value && term && (value.includes(term) || term.includes(value)));
}

function tokenizeBlogProductContext(post: BlogPostRecord) {
  const priorityTerms = [post.category ?? "", ...(post.tags ?? [])]
    .map(normalizeText)
    .filter(Boolean);
  const titleTerms = normalizeText(post.title)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3 && !BLOG_PRODUCT_STOP_WORDS.has(term));
  return {
    priorityTerms: Array.from(new Set(priorityTerms)),
    titleTerms: Array.from(new Set(titleTerms)),
  };
}

function scoreBlogProduct(post: BlogPostRecord, product: SmartBlogProductCandidate) {
  const { priorityTerms, titleTerms } = tokenizeBlogProductContext(post);
  const name = normalizeText(product.name);
  const type = normalizeText(product.type);
  const category = normalizeText(product.category);
  const description = normalizeText(product.description);
  let score = 0;

  for (const term of priorityTerms) {
    if (type === term || category === term) score += 8;
    else if (looselyMatches(type, term) || looselyMatches(category, term)) score += 5;
    if (name.includes(term)) score += 5;
    if (description.includes(term)) score += 2;
  }

  for (const term of titleTerms) {
    if (name.includes(term)) score += 3;
    if (type.includes(term) || category.includes(term)) score += 3;
    if (description.includes(term)) score += 1;
  }

  if (product.featured) score += 1;
  if (product.original_price && product.original_price > product.price) score += 1;
  return score;
}

async function canExposeBlog(client: SupabaseClient, storeId: string) {
  const [{ data: store, error: storeError }, { data: setting, error: settingError }] = await Promise.all([
    (client as any)
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("is_published", true)
      .maybeSingle(),
    (client as any)
      .from("site_settings")
      .select("value")
      .eq("store_id", storeId)
      .eq("key", "blog")
      .maybeSingle(),
  ]);

  if (storeError || settingError) {
    console.error("[blog] failed to verify public blog access", storeError ?? settingError);
    return false;
  }

  return Boolean(store?.id) && normalizeBlogSettings(setting?.value).enabled;
}

async function loadAvailableBlogProductCandidates(client: SupabaseClient, storeId: string, limit = 80) {
  const { data, error } = await (client as any)
    .from("products")
    .select("id,name,price,original_price,image_url,description,is_available,category,type,featured,badge,created_at")
    .eq("store_id", storeId)
    .eq("is_available", true)
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(8, limit)));

  if (error) {
    console.error("[blog] failed to load product source candidates", error);
    return [] as BlogProductRecord[];
  }
  return (data ?? []) as BlogProductRecord[];
}

export function isBlogPostPublicNow(post: Pick<BlogPostRecord, "status" | "published_at">, now = Date.now()) {
  if (post.status !== "published") return false;
  if (!post.published_at) return true;
  const publishedAt = new Date(post.published_at).getTime();
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

export async function loadStoreBlogSettings(
  storeId: string,
  fallback?: unknown,
): Promise<BlogSettings> {
  const client = getBlogReadClient();
  if (!client) return normalizeBlogSettings(fallback);

  const { data, error } = await (client as any)
    .from("site_settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("key", "blog")
    .maybeSingle();

  if (error) {
    console.error("[blog] failed to load blog settings", error);
    return normalizeBlogSettings(fallback);
  }

  return normalizeBlogSettings(data?.value ?? fallback);
}

export async function loadPublishedBlogPosts(
  storeId: string,
  options: PublicBlogQuery = {},
): Promise<BlogPostRecord[]> {
  const client = getBlogReadClient();
  if (!client || !(await canExposeBlog(client, storeId))) return [];

  const limit = Math.min(48, Math.max(1, Math.round(options.limit ?? 12)));
  const fetchLimit = Math.min(96, Math.max(limit * 3, 24));
  const { data, error } = await (client as any)
    .from("blog_posts")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  if (error) {
    console.error("[blog] failed to load published posts", error);
    return [];
  }

  const category = normalizeText(options.category);
  const tag = normalizeText(options.tag);
  const search = normalizeText(options.search);
  const now = Date.now();

  return ((data ?? []) as BlogPostRecord[])
    .filter((post) => isBlogPostPublicNow(post, now))
    .filter((post) => !options.excludeId || post.id !== options.excludeId)
    .filter((post) => !category || normalizeText(post.category) === category)
    .filter((post) => !tag || (post.tags ?? []).some((value) => normalizeText(value) === tag))
    .filter((post) => {
      if (!search) return true;
      return [post.title, post.excerpt ?? "", post.content, post.category ?? "", ...(post.tags ?? [])]
        .some((value) => normalizeText(value).includes(search));
    })
    .slice(0, limit);
}

export async function loadPublishedBlogPost(storeId: string, slug: string): Promise<BlogPostRecord | null> {
  const client = getBlogReadClient();
  if (!client || !(await canExposeBlog(client, storeId))) return null;

  const { data, error } = await (client as any)
    .from("blog_posts")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[blog] failed to load published post", error);
    return null;
  }

  const post = (data ?? null) as BlogPostRecord | null;
  return post && isBlogPostPublicNow(post) ? post : null;
}

export async function loadBlogProducts(storeId: string, productIds: string[]): Promise<BlogProductRecord[]> {
  const ids = Array.from(new Set(productIds.filter(Boolean))).slice(0, 12);
  if (ids.length === 0) return [];
  const client = getBlogReadClient();
  if (!client || !(await canExposeBlog(client, storeId))) return [];

  const { data, error } = await (client as any)
    .from("products")
    .select("id,name,price,original_price,image_url,description,is_available,category,type,featured,badge,created_at")
    .eq("store_id", storeId)
    .in("id", ids)
    .eq("is_available", true);

  if (error) {
    console.error("[blog] failed to load embedded products", error);
    return [];
  }

  const byId = new Map(((data ?? []) as BlogProductRecord[]).map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter((product): product is BlogProductRecord => Boolean(product));
}

export async function loadSmartBlogProducts(storeId: string, post: BlogPostRecord, limit = 4): Promise<BlogProductRecord[]> {
  const client = getBlogReadClient();
  if (!client || !(await canExposeBlog(client, storeId))) return [];

  const resolvedLimit = Math.min(8, Math.max(1, Math.round(limit)));
  const excludedIds = new Set(post.embedded_product_ids ?? []);
  const candidates = await loadAvailableBlogProductCandidates(client, storeId, 60);

  return candidates
    .filter((product) => !excludedIds.has(product.id))
    .map((product, index) => ({
      product,
      score: scoreBlogProduct(post, product),
      recencyRank: index,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (Boolean(right.product.featured) !== Boolean(left.product.featured)) {
        return Number(Boolean(right.product.featured)) - Number(Boolean(left.product.featured));
      }
      return left.recencyRank - right.recencyRank;
    })
    .slice(0, resolvedLimit)
    .map(({ product }) => product);
}

export async function loadBlogProductsForDirective(
  storeId: string,
  post: BlogPostRecord,
  directive: BlogProductDirective,
): Promise<BlogProductRecord[]> {
  if (directive.source === "manual") {
    return loadBlogProducts(storeId, post.embedded_product_ids ?? []);
  }
  if (directive.source === "related") {
    return loadSmartBlogProducts(storeId, post, directive.limit);
  }

  const client = getBlogReadClient();
  if (!client || !(await canExposeBlog(client, storeId))) return [];
  const limit = Math.min(8, Math.max(1, Math.round(directive.limit || 4)));

  if (directive.source === "bestsellers") {
    const { data, error } = await (client as any)
      .from("store_analytics_events")
      .select("product_id,quantity,created_at")
      .eq("store_id", storeId)
      .eq("event_name", "purchase_item")
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[blog] failed to load bestseller purchase events", error);
      return [];
    }

    const quantities = new Map<string, number>();
    for (const event of data ?? []) {
      const productId = typeof event.product_id === "string" ? event.product_id : "";
      if (!productId) continue;
      const quantity = Number(event.quantity ?? 1);
      quantities.set(productId, (quantities.get(productId) ?? 0) + (Number.isFinite(quantity) ? Math.max(quantity, 1) : 1));
    }
    const rankedIds = Array.from(quantities.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 12)
      .map(([productId]) => productId);
    return (await loadBlogProducts(storeId, rankedIds)).slice(0, limit);
  }

  const candidates = await loadAvailableBlogProductCandidates(client, storeId, 80);
  if (directive.source === "featured") {
    return candidates.filter((product) => Boolean(product.featured)).slice(0, limit);
  }
  if (directive.source === "sale") {
    return candidates
      .filter((product) => (product.original_price ?? 0) > product.price || normalizeText(product.badge) === "sale")
      .slice(0, limit);
  }
  if (directive.source === "category") {
    const category = normalizeText(directive.category || post.category);
    if (!category) return [];
    return candidates.filter((product) => normalizeText(product.category) === category).slice(0, limit);
  }
  if (directive.source === "newest") {
    return candidates.slice(0, limit);
  }

  return [];
}

export async function loadRelatedBlogPosts(storeId: string, post: BlogPostRecord, limit = 3) {
  const candidates = await loadPublishedBlogPosts(storeId, { limit: 24, excludeId: post.id });
  const category = normalizeText(post.category);
  const tags = new Set((post.tags ?? []).map(normalizeText).filter(Boolean));

  return candidates
    .map((candidate) => {
      const sameCategory = Boolean(category && normalizeText(candidate.category) === category);
      const sharedTags = (candidate.tags ?? []).reduce((count, tag) => count + (tags.has(normalizeText(tag)) ? 1 : 0), 0);
      return { candidate, score: (sameCategory ? 4 : 0) + sharedTags };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(right.candidate.published_at || right.candidate.created_at).getTime()
        - new Date(left.candidate.published_at || left.candidate.created_at).getTime();
    })
    .slice(0, Math.min(6, Math.max(1, limit)))
    .map(({ candidate }) => candidate);
}
