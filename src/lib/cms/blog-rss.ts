import { buildBlogExcerpt, type BlogPostRecord } from "@/lib/cms/blog";
import type { BlogSettings } from "@/lib/cms/blog-settings";
import { absoluteStoreUrl } from "@/lib/siteUrl";

type BlogRssStore = {
  name: string;
  slug: string;
  customDomain?: string | null;
  primaryDomain?: string | null;
  locale?: string | null;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function validRssDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toUTCString();
}

function isPublishedAndIndexable(post: BlogPostRecord, now: number) {
  if (post.status !== "published" || post.noindex) return false;
  if (!post.published_at) return true;
  const publishedAt = new Date(post.published_at).getTime();
  return Number.isFinite(publishedAt) && publishedAt <= now;
}

export function buildBlogRssFeed({
  store,
  settings,
  posts,
}: {
  store: BlogRssStore;
  settings: BlogSettings;
  posts: BlogPostRecord[];
}) {
  const indexUrl = absoluteStoreUrl(store, "/blog");
  const selfUrl = absoluteStoreUrl(store, "/blog/rss.xml");
  const description = settings.seoDescription
    || settings.indexDescription
    || `Stories, guides, and updates from ${store.name}.`;
  const now = Date.now();
  const publicPosts = posts.filter((post) => isPublishedAndIndexable(post, now));
  const latestTimestamp = publicPosts
    .map((post) => new Date(post.updated_at || post.published_at || post.created_at).getTime())
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0];
  const lastBuildDate = new Date(latestTimestamp ?? now).toUTCString();

  const items = publicPosts.map((post) => {
    const link = absoluteStoreUrl(store, `/blog/${encodeURIComponent(post.slug)}`);
    const summary = post.seo_description || post.excerpt || buildBlogExcerpt(post.content);
    const published = validRssDate(post.published_at || post.created_at);
    const categories = [post.category ?? "", ...(post.tags ?? [])]
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => `<category>${escapeXml(value)}</category>`)
      .join("");

    return [
      "<item>",
      `<title>${escapeXml(post.title)}</title>`,
      `<link>${escapeXml(link)}</link>`,
      `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
      summary ? `<description>${escapeXml(summary)}</description>` : "",
      published ? `<pubDate>${published}</pubDate>` : "",
      categories,
      "</item>",
    ].filter(Boolean).join("");
  }).join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${escapeXml(settings.seoTitle || `${store.name} Blog`)}</title>`,
    `<link>${escapeXml(indexUrl)}</link>`,
    `<description>${escapeXml(description)}</description>`,
    `<language>${escapeXml(store.locale || "en")}</language>`,
    `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `<atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`,
    items,
    "</channel>",
    "</rss>",
  ].join("");
}

export function blogRssResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
      "x-content-type-options": "nosniff",
    },
  });
}
