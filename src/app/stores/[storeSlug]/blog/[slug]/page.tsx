import { notFound } from "next/navigation";
import { BlogPostPage } from "@/components/storefront/blog/BlogPostPage";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { getStorePreviewTokenFromRequest } from "@/lib/cms/store-preview-request";
import {
  loadBlogProducts,
  loadBlogProductsForDirective,
  loadPublishedBlogPost,
  loadRelatedBlogPosts,
  loadSmartBlogProducts,
  loadStoreBlogSettings,
} from "@/lib/cms/blog-server";
import { getPrimaryBlogProductDirective } from "@/lib/cms/blog";
import { absoluteStoreUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string; slug: string }> }) {
  const { storeSlug, slug } = await params;
  const previewToken = await getStorePreviewTokenFromRequest(storeSlug);
  const store = await getStoreShellBySlug(storeSlug, previewToken, { requestedPageSlug: `/blog/${slug}` });
  if (!store) return {};
  const settings = await loadStoreBlogSettings(store.id, store.siteSettings?.blog);
  if (!settings.enabled) return { robots: { index: false, follow: false } };
  const post = await loadPublishedBlogPost(store.id, slug);
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
      publishedTime: post.published_at || post.created_at || undefined,
      modifiedTime: post.updated_at || post.published_at || undefined,
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
  const previewToken = await getStorePreviewTokenFromRequest(storeSlug);
  const store = await getStoreShellBySlug(storeSlug, previewToken, { requestedPageSlug: `/blog/${slug}` });
  if (!store) notFound();
  const settings = await loadStoreBlogSettings(store.id, store.siteSettings?.blog);
  if (!settings.enabled) notFound();
  const post = await loadPublishedBlogPost(store.id, slug);
  if (!post) notFound();

  const productDirective = getPrimaryBlogProductDirective(post.content);
  const [products, relatedPosts] = await Promise.all([
    productDirective
      ? loadBlogProductsForDirective(store.id, post, productDirective)
      : loadBlogProducts(store.id, post.embedded_product_ids ?? []),
    loadRelatedBlogPosts(store.id, post, 3),
  ]);
  const smartProducts = products.length === 0 && (!productDirective || productDirective.source === "manual")
    ? await loadSmartBlogProducts(store.id, post, 4)
    : [];

  return (
    <BlogPostPage
      store={store}
      post={post}
      settings={settings}
      products={products}
      smartProducts={smartProducts}
      relatedPosts={relatedPosts}
    />
  );
}