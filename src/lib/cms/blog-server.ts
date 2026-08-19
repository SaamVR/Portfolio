import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import { normalizeBlogSettings, type BlogSettings } from "@/lib/cms/blog-settings";
import type { BlogPostRecord, BlogProductRecord } from "@/lib/cms/blog";

type PublicBlogQuery = {
  limit?: number;
  category?: string | null;
  tag?: string | null;
  search?: string | null;
  excludeId?: string | null;
};

type SmartBlogProductCandidate = BlogProductRecord & {
  type?: string | null;
  featured?: boolean | null;
  created_at?: string | null;
};

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
  const description = normalizeText(product.description);
  let score = 0;

  for (const term of priorityTerms) {
    if (type === term) score += 8;
    else if (type.includes(term) || term.includes(type)) score += type ? 5 : 0;
    if (name.includes(term)) score += 5;
    if (description.includes(term)) score += 2;
  }

  for (const term of titleTerms) {
    if (name.includes(term)) score += 3;
    if (type.includes(term)) score += 3;
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
    .select("id,name,price,original_price,image_url,description,is_available")
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
  const { data, error } = await (client as any)
    .from("products")
    .select("id,name,price,original_price,image_url,description,is_available,type,featured,created_at")
    .eq("store_id", storeId)
    .eq("is_available", true)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("[blog] failed to load smart product candidates", error);
    return [];
  }

  return ((data ?? []) as SmartBlogProductCandidate[])
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
