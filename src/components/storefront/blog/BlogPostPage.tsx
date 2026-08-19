import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, Clock3, ShoppingBag, Tag } from "lucide-react";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import type { Store } from "@/lib/cms/schema";
import {
  buildBlogExcerpt,
  buildBlogIndexUrl,
  buildBlogPostUrl,
  calculateBlogReadingTime,
  formatBlogDate,
  hasInlineBlogProducts,
  markdownToHtml,
  resolveBlogProductEmbedPosition,
  splitBlogContentAtProductDirectives,
  type BlogPostRecord,
  type BlogProductRecord,
} from "@/lib/cms/blog";
import type { BlogSettings } from "@/lib/cms/blog-settings";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { productUrl } from "@/lib/slug";

function money(value: number, store: Store) {
  try {
    return new Intl.NumberFormat(store.locale || "en-BD", {
      style: "currency",
      currency: store.currencyCode || "BDT",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${store.currencyCode || "BDT"} ${Number(value || 0).toLocaleString()}`;
  }
}

function blogFilterUrl(storeSlug: string, key: "category" | "tag", value: string) {
  const params = new URLSearchParams({ [key]: value });
  return `${buildBlogIndexUrl(storeSlug)}?${params.toString()}`;
}

function blogAttributedProductUrl(store: Store, post: BlogPostRecord, product: BlogProductRecord) {
  const base = productUrl(product.id, product.name, store.slug);
  const params = new URLSearchParams({
    utm_source: "blog",
    utm_medium: "editorial",
    utm_campaign: post.slug,
    utm_content: post.id,
  });
  return `${base}${base.includes("?") ? "&" : "?"}${params.toString()}`;
}

function ProductMerchandising({ store, post, products }: { store: Store; post: BlogPostRecord; products: BlogProductRecord[] }) {
  if (!products.length) return null;
  return (
    <section className="my-8 rounded-3xl border border-border bg-gradient-to-br from-primary/[0.06] via-card to-card p-5 sm:p-7">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-2xl font-bold text-foreground">{post.product_embed_title || "Shop products from this story"}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Explore the products mentioned or recommended in this article.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link key={product.id} href={blogAttributedProductUrl(store, post, product)} className="group overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-muted"><ShoppingBag className="h-8 w-8 text-muted-foreground" /></div>
            )}
            <div className="p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition group-hover:text-primary">{product.name}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">{money(product.price, store)}</span>
                {product.original_price && product.original_price > product.price ? (
                  <span className="text-xs text-muted-foreground line-through">{money(product.original_price, store)}</span>
                ) : null}
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">View product <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ArticleContent({ store, post, products }: { store: Store; post: BlogPostRecord; products: BlogProductRecord[] }) {
  const chunks = splitBlogContentAtProductDirectives(post.content);
  return (
    <>
      {chunks.map((chunk, index) => (
        <div key={`${post.id}-chunk-${index}`}>
          {chunk.trim() ? (
            <div
              className="prose prose-neutral mt-9 max-w-none dark:prose-invert prose-headings:font-heading prose-headings:tracking-tight prose-p:leading-8 prose-a:text-primary prose-a:underline-offset-4 prose-blockquote:border-primary prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-muted prose-pre:p-4 prose-ul:list-disc prose-ol:list-decimal"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(chunk) }}
            />
          ) : null}
          {index < chunks.length - 1 ? <ProductMerchandising store={store} post={post} products={products} /> : null}
        </div>
      ))}
    </>
  );
}

function RelatedArticles({ store, posts }: { store: Store; posts: BlogPostRecord[] }) {
  if (!posts.length) return null;
  return (
    <section className="mt-8 rounded-[30px] border border-border bg-card/60 p-5 sm:p-7 lg:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Keep reading</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-foreground sm:text-3xl">Related articles</h2>
        </div>
        <Link href={buildBlogIndexUrl(store.slug)} className="hidden text-sm font-semibold text-primary hover:underline sm:inline-flex">View all</Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} href={buildBlogPostUrl(store.slug, post.slug)} className="group overflow-hidden rounded-2xl border border-border bg-background transition hover:-translate-y-0.5 hover:border-primary/30">
            {post.featured_image ? (
              <img src={post.featured_image} alt={post.featured_image_alt || post.title} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]" loading="lazy" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-muted"><Tag className="h-7 w-7 text-muted-foreground" /></div>
            )}
            <div className="p-4">
              <p className="text-xs text-muted-foreground">{formatBlogDate(post.published_at || post.created_at)}</p>
              <h3 className="mt-2 line-clamp-2 font-heading text-lg font-semibold text-foreground transition group-hover:text-primary">{post.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function BlogPostPage({
  store,
  post,
  settings,
  products,
  relatedPosts = [],
}: {
  store: Store;
  post: BlogPostRecord;
  settings: BlogSettings;
  products: BlogProductRecord[];
  relatedPosts?: BlogPostRecord[];
}) {
  const embedPosition = resolveBlogProductEmbedPosition(post.product_embed_position);
  const hasInlineProducts = hasInlineBlogProducts(post.content);
  const canonical = post.canonical_url || absoluteStoreUrl(
    { slug: store.slug, customDomain: store.customDomain ?? null },
    `/blog/${encodeURIComponent(post.slug)}`,
  );
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description || post.excerpt || undefined,
    image: post.og_image || post.featured_image || undefined,
    datePublished: post.published_at || post.created_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: post.author_name ? { "@type": "Person", name: post.author_name } : { "@type": "Organization", name: store.name },
    publisher: {
      "@type": "Organization",
      name: store.name,
      ...(store.logoUrl ? { logo: { "@type": "ImageObject", url: store.logoUrl } } : {}),
    },
    mainEntityOfPage: canonical,
    keywords: [...(post.seo_keywords ?? []), ...(post.tags ?? [])].join(", ") || undefined,
  };

  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <StorefrontLayout>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
          <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Link href={buildBlogIndexUrl(store.slug)} className="font-medium hover:text-primary">Blog</Link>
              {post.category ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <Link href={blogFilterUrl(store.slug, "category", post.category)} className="font-medium hover:text-primary">{post.category}</Link>
                </>
              ) : null}
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="max-w-[240px] truncate text-foreground sm:max-w-md">{post.title}</span>
            </nav>

            <article className="overflow-hidden rounded-[32px] border border-border bg-card/70 shadow-sm">
              <div className="p-6 sm:p-9 lg:p-12">
                <Link href={buildBlogIndexUrl(store.slug)} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" /> Back to blog
                </Link>

                <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                  {settings.showCategory && post.category ? (
                    <Link href={blogFilterUrl(store.slug, "category", post.category)} className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary hover:bg-primary/15">{post.category}</Link>
                  ) : null}
                  {settings.showAuthor && post.author_name ? <span>By {post.author_name}</span> : null}
                  {settings.showDate ? <span>{formatBlogDate(post.published_at || post.created_at)}</span> : null}
                  {settings.showReadingTime ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {calculateBlogReadingTime(post.content)} min read</span> : null}
                </div>

                <h1 className="mt-4 max-w-4xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{post.title}</h1>
                {(post.excerpt || post.seo_description) ? (
                  <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">{post.excerpt || post.seo_description}</p>
                ) : null}

                {!hasInlineProducts && embedPosition === "before-content" ? <ProductMerchandising store={store} post={post} products={products} /> : null}

                {post.featured_image ? (
                  <img src={post.featured_image} alt={post.featured_image_alt || post.title} className="mt-8 max-h-[640px] w-full rounded-[28px] border border-border object-cover" />
                ) : null}

                {!hasInlineProducts && embedPosition === "after-intro" ? <ProductMerchandising store={store} post={post} products={products} /> : null}

                <ArticleContent store={store} post={post} products={products} />

                {!hasInlineProducts && embedPosition === "after-content" ? <ProductMerchandising store={store} post={post} products={products} /> : null}

                {settings.showTags && (post.tags ?? []).length > 0 ? (
                  <div className="mt-9 flex flex-wrap items-center gap-2 border-t border-border pt-6">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {(post.tags ?? []).map((tag) => (
                      <Link key={tag} href={blogFilterUrl(store.slug, "tag", tag)} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary">{tag}</Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>

            <RelatedArticles store={store} posts={relatedPosts} />
          </main>
        </StorefrontLayout>
      </StoreThemeScope>
    </StoreProvider>
  );
}
