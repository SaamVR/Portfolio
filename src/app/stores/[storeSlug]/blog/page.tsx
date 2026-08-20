import { notFound } from "next/navigation";
import { BlogIndexPage } from "@/components/storefront/blog/BlogIndexPage";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { getStorePreviewTokenFromRequest } from "@/lib/cms/store-preview-request";
import { loadPublishedBlogPosts, loadStoreBlogSettings } from "@/lib/cms/blog-server";
import { buildBlogIndexMetadata, resolveBlogIndexFilter, type BlogIndexFilters } from "@/lib/cms/blog-index-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<BlogIndexFilters>;
}) {
  const { storeSlug } = await params;
  const previewToken = await getStorePreviewTokenFromRequest(storeSlug);
  const store = await getStoreShellBySlug(storeSlug, previewToken, { requestedPageSlug: "/blog" });
  if (!store) return {};
  const settings = await loadStoreBlogSettings(store.id, store.siteSettings?.blog);
  const filters = await searchParams;
  return buildBlogIndexMetadata({ store, settings, filters });
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<BlogIndexFilters>;
}) {
  const { storeSlug } = await params;
  const previewToken = await getStorePreviewTokenFromRequest(storeSlug);
  const store = await getStoreShellBySlug(storeSlug, previewToken, { requestedPageSlug: "/blog" });
  if (!store) notFound();
  const settings = await loadStoreBlogSettings(store.id, store.siteSettings?.blog);
  if (!settings.enabled) notFound();

  const filters = await searchParams;
  const posts = await loadPublishedBlogPosts(store.id, {
    limit: settings.postsPerPage,
    search: filters.q,
    category: filters.category,
    tag: filters.tag,
  });

  const activeFilter = resolveBlogIndexFilter(filters);
  const filteredSettings = activeFilter?.type === "category"
    ? { ...settings, indexEyebrow: "Blog category", indexTitle: activeFilter.value }
    : activeFilter?.type === "tag"
      ? { ...settings, indexEyebrow: "Tagged articles", indexTitle: `#${activeFilter.value}` }
      : activeFilter?.type === "search"
        ? { ...settings, indexEyebrow: "Search results", indexTitle: `Results for “${activeFilter.value}”` }
        : settings;

  return <BlogIndexPage store={store} posts={posts} settings={filteredSettings} activeFilter={activeFilter} />;
}
