import { notFound } from "next/navigation";
import { BlogIndexPage } from "@/components/storefront/blog/BlogIndexPage";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { loadPublishedBlogPosts, loadStoreBlogSettings } from "@/lib/cms/blog-server";
import { absoluteStoreUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: "/blog" });
  if (!store) return {};
  const settings = await loadStoreBlogSettings(store.id, store.siteSettings?.blog);
  const canonical = absoluteStoreUrl({ slug: store.slug, customDomain: store.customDomain ?? null }, "/blog");
  const rss = absoluteStoreUrl({ slug: store.slug, customDomain: store.customDomain ?? null }, "/blog/rss.xml");
  const title = settings.seoTitle || `${store.name} Blog`;
  const description = settings.seoDescription || settings.indexDescription || `Stories, guides, and updates from ${store.name}.`;
  return {
    title,
    description,
    alternates: {
      canonical,
      types: { "application/rss+xml": rss },
    },
    robots: settings.enabled ? undefined : { index: false, follow: false },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: store.name,
      images: settings.ogImage ? [{ url: settings.ogImage, alt: `${store.name} blog` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings.ogImage ? [settings.ogImage] : undefined,
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: "/blog" });
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

  const activeFilter = filters.category
    ? { type: "category" as const, value: filters.category }
    : filters.tag
      ? { type: "tag" as const, value: filters.tag }
      : filters.q
        ? { type: "search" as const, value: filters.q }
        : null;
  const filteredSettings = activeFilter?.type === "category"
    ? { ...settings, indexEyebrow: "Blog category", indexTitle: activeFilter.value }
    : activeFilter?.type === "tag"
      ? { ...settings, indexEyebrow: "Tagged articles", indexTitle: `#${activeFilter.value}` }
      : activeFilter?.type === "search"
        ? { ...settings, indexEyebrow: "Search results", indexTitle: `Results for “${activeFilter.value}”` }
        : settings;

  return <BlogIndexPage store={store} posts={posts} settings={filteredSettings} activeFilter={activeFilter} />;
}
