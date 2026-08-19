import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import { normalizeBlogSettings, type BlogSettings } from "@/lib/cms/blog-settings";
import type { BlogPostRecord } from "@/lib/cms/blog";

type PublicBlogQuery = {
  limit?: number;
  category?: string | null;
  tag?: string | null;
  search?: string | null;
  excludeId?: string | null;
};

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
  if (!client) return [];

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
  if (!client) return null;

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
