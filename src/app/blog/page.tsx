import { notFound } from "next/navigation";
import { BlogIndexPage } from "@/components/storefront/blog/BlogIndexPage";
import { getRequestStoreShell } from "@/lib/cms/request-store";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import { getStoreBlogSettings } from "@/lib/cms/blog-settings";
import type { BlogPostRecord } from "@/lib/cms/blog";
import { absoluteStoreUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const store = await getRequestStoreShell({ requestedPageSlug: "/blog" });
  if (!store) return {};
  const settings = getStoreBlogSettings(store);
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

export default async function Page() {
  const store = await getRequestStoreShell({ requestedPageSlug: "/blog" });
  const supabase = getCmsSupabaseServerClient();
  if (!store || !supabase) notFound();
  const settings = getStoreBlogSettings(store);
  if (!settings.enabled) notFound();

  const { data } = await (supabase as any)
    .from("blog_posts")
    .select("*")
    .eq("store_id", store.id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(settings.postsPerPage);

  return <BlogIndexPage store={store} posts={(data ?? []) as BlogPostRecord[]} settings={settings} />;
}
