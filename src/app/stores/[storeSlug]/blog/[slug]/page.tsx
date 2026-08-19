import { notFound } from "next/navigation";
import { BlogPostPage } from "@/components/storefront/blog/BlogPostPage";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import { getStoreBlogSettings } from "@/lib/cms/blog-settings";
import type { BlogPostRecord, BlogProductRecord } from "@/lib/cms/blog";
import { absoluteStoreUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

async function loadPublishedPost(storeId: string, slug: string) {
  const supabase = getCmsSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await (supabase as any)
    .from("blog_posts")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  return (data ?? null) as BlogPostRecord | null;
}

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string; slug: string }> }) {
  const { storeSlug, slug } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: `/blog/${slug}` });
  if (!store) return {};
  const settings = getStoreBlogSettings(store);
  if (!settings.enabled) return { robots: { index: false, follow: false } };
  const post = await loadPublishedPost(store.id, slug);
  if (!post) return {};

  const canonical = post.canonical_url || absoluteStoreUrl(
    { slug: store.slug, customDomain: store.customDomain ?? null },
    `/blog/${encodeURIComponent(post.slug)}`,
  );
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || `Read ${post.title} from ${store.name}.`;
  const socialImage = post.og_image || post.featured_image || settings.ogImage || undefined;
  return {
    title,
    description,
    keywords: post.seo_keywords?.length ? post.seo_keywords : post.tags ?? undefined,
    alternates: { canonical },
    robots: { index: !post.noindex, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: store.name,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: post.author_name ? [post.author_name] : undefined,
      tags: post.tags ?? undefined,
      images: socialImage ? [{ url: socialImage, alt: post.featured_image_alt || post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: socialImage ? [socialImage] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ storeSlug: string; slug: string }> }) {
  const { storeSlug, slug } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: `/blog/${slug}` });
  const supabase = getCmsSupabaseServerClient();
  if (!store || !supabase) notFound();
  const settings = getStoreBlogSettings(store);
  if (!settings.enabled) notFound();
  const post = await loadPublishedPost(store.id, slug);
  if (!post) notFound();

  const productIds = (post.embedded_product_ids ?? []).filter(Boolean).slice(0, 8);
  let products: BlogProductRecord[] = [];
  if (productIds.length) {
    const { data } = await (supabase as any)
      .from("products")
      .select("id,name,price,original_price,image_url,description,is_available")
      .eq("store_id", store.id)
      .in("id", productIds)
      .eq("is_available", true);
    const byId = new Map(((data ?? []) as BlogProductRecord[]).map((product) => [product.id, product]));
    products = productIds.map((id) => byId.get(id)).filter((product): product is BlogProductRecord => Boolean(product));
  }

  return <BlogPostPage store={store} post={post} settings={settings} products={products} />;
}
