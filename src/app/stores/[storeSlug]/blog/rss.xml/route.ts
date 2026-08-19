import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { loadPublishedBlogPosts, loadStoreBlogSettings } from "@/lib/cms/blog-server";
import { blogRssResponse, buildBlogRssFeed } from "@/lib/cms/blog-rss";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: "/blog/rss.xml" });
  if (!store) return new Response("Not found", { status: 404 });

  const settings = await loadStoreBlogSettings(store.id, store.siteSettings?.blog);
  if (!settings.enabled) return new Response("Not found", { status: 404 });

  const posts = await loadPublishedBlogPosts(store.id, { limit: 48 });
  const xml = buildBlogRssFeed({ store, settings, posts });
  return blogRssResponse(xml);
}
