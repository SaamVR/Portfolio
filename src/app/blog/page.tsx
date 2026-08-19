import { notFound } from "next/navigation";
import { BlogIndexPage } from "@/components/storefront/blog/BlogIndexPage";
import { getRequestStoreShell } from "@/lib/cms/request-store";
import { loadPublishedBlogPosts, loadStoreBlogSettings } from "@/lib/cms/blog-server";
import { absoluteStoreUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const store = await getRequestStoreShell({ requestedPageSlug: "/blog" });
  if (!store) return {};
  const settings = await loadStoreBlogSettings(store.id, store.siteSettings?.blog);
  const canonical = absoluteStoreUrl({ slug: store.slug, customDomain: store.customDomain ?? null }, "/blog");
  const title = settings.seoTitle || `${store.name} Blog`;
  const description = settings.seoDescription || settings.indexDescription || `Stories, guides, and updates from ${store.name}.`;
  return {
    title,
    description,
    alternates: { canonical },
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
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const store = await getRequestStoreShell({ requestedPageSlug: "/blog" });
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

  const filteredSettings = filters.category
    ? { ...settings, indexEyebrow: "Blog category", indexTitle: filters.category }
    : filters.tag
      ? { ...settings, indexEyebrow: "Tagged articles", indexTitle: `#${filters.tag}` }
      : filters.q
        ? { ...settings, indexEyebrow: "Search results", indexTitle: `Results for “${filters.q}”` }
        : settings;

  return <BlogIndexPage store={store} posts={posts} settings={filteredSettings} />;
}
