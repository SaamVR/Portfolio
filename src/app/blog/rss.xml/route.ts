import { getRequestStoreShell } from "@/lib/cms/request-store";
import { loadPublishedBlogPosts, loadStoreBlogSettings } from "@/lib/cms/blog-server";
import { blogRssResponse, buildBlogRssFeed } from "@/lib/cms/blog-rss";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getRequestStoreShell({ requestedPageSlug: "/blog/rss.xml" });
  if (!store) return new Response("Not found", { status: 404 });

  const settings = await loadStoreBlogSettings(store.id, store.siteSettings?.blog);
  if (!settings.enabled) return new Response("Not found", { status: 404 });

  const posts = await loadPublishedBlogPosts(store.id, { limit: 48 });
  const xml = buildBlogRssFeed({ store, settings, posts });
  return blogRssResponse(xml);
}
