import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, Clock3, ListTree, ShoppingBag, Tag } from "lucide-react";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import type { Store } from "@/lib/cms/schema";
import {
  buildBlogExcerpt,
  buildBlogIndexUrl,
  buildBlogPostUrl,
  calculateBlogReadingTime,
  extractBlogHeadings,
  formatBlogDate,
  getPrimaryBlogProductDirective,
  hasInlineBlogProducts,
  markdownToHtml,
  resolveBlogProductEmbedPosition,
  splitBlogContentAtProductDirectives,
  type BlogHeading,
  type BlogPostRecord,
  type BlogProductLayout,
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

function ProductImage({ product, className }: { product: BlogProductRecord; className: string }) {
  return product.image_url ? (
    <img src={product.image_url} alt={product.name} className={className} loading="lazy" />
  ) : (
    <div className={`${className} flex items-center justify-center bg-muted`}><ShoppingBag className="h-8 w-8 text-muted-foreground" /></div>
  );
}

function ProductPrice({ store, product, className = "text-sm" }: { store: Store; product: BlogProductRecord; className?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`${className} font-bold text-foreground`}>{money(product.price, store)}</span>
      {product.original_price && product.original_price > product.price ? (
        <span className="text-xs text-muted-foreground line-through">{money(product.original_price, store)}</span>
      ) : null}
    </div>
  );
}

function ProductGrid({ store, post, products }: { store: Store; post: BlogPostRecord; products: BlogProductRecord[] }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Link key={product.id} href={blogAttributedProductUrl(store, post, product)} className="group overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
          <ProductImage product={product} className="aspect-[4/3] w-full object-cover" />
          <div className="p-4">
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition group-hover:text-primary">{product.name}</h3>
            <div className="mt-2"><ProductPrice store={store} product={product} /></div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">View product <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ProductSpotlight({ store, post, products }: { store: Store; post: BlogPostRecord; products: BlogProductRecord[] }) {
  const [lead, ...supporting] = products;
  if (!lead) return null;
  return (
    <div className="mt-5 space-y-4">
      <Link href={blogAttributedProductUrl(store, post, lead)} className="group grid overflow-hidden rounded-3xl border border-border bg-background shadow-sm transition hover:border-primary/30 hover:shadow-md md:grid-cols-[1.1fr_0.9fr]">
        <ProductImage product={lead} className="min-h-[260px] h-full w-full object-cover sm:min-h-[340px]" />
        <div className="flex flex-col justify-center p-6 sm:p-8">
          {(lead.category || lead.type) ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{lead.category || lead.type}</p> : null}
          <h3 className="mt-2 font-heading text-2xl font-bold text-foreground transition group-hover:text-primary sm:text-3xl">{lead.name}</h3>
          {lead.description ? <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{lead.description}</p> : null}
          <div className="mt-5"><ProductPrice store={store} product={lead} className="text-lg" /></div>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">View product <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </div>
      </Link>
      {supporting.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {supporting.map((product) => (
            <Link key={product.id} href={blogAttributedProductUrl(store, post, product)} className="group flex gap-3 rounded-2xl border border-border bg-background p-3 transition hover:border-primary/30">
              <ProductImage product={product} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 py-1">
                <h4 className="line-clamp-2 text-sm font-semibold text-foreground transition group-hover:text-primary">{product.name}</h4>
                <div className="mt-2"><ProductPrice store={store} product={product} /></div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProductComparison({ store, post, products }: { store: Store; post: BlogPostRecord; products: BlogProductRecord[] }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <div key={product.id} className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <ProductImage product={product} className="aspect-[4/3] w-full object-cover" />
          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-heading text-lg font-bold text-foreground">{product.name}</h3>
            <div className="mt-3 border-y border-border py-3"><ProductPrice store={store} product={product} className="text-base" /></div>
            {(product.category || product.type) ? (
              <dl className="mt-3 space-y-2 text-xs">
                {product.category ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Category</dt><dd className="text-right font-medium text-foreground">{product.category}</dd></div> : null}
                {product.type && product.type !== product.category ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Type</dt><dd className="text-right font-medium text-foreground">{product.type}</dd></div> : null}
              </dl>
            ) : null}
            {product.description ? <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">{product.description}</p> : null}
            <Link href={blogAttributedProductUrl(store, post, product)} className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary hover:underline">View product <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductLookbook({ store, post, products }: { store: Store; post: BlogPostRecord; products: BlogProductRecord[] }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
      {products.map((product, index) => (
        <Link
          key={product.id}
          href={blogAttributedProductUrl(store, post, product)}
          className={`group relative overflow-hidden rounded-2xl border border-border bg-muted ${index === 0 && products.length > 2 ? "col-span-2 sm:col-span-1 sm:row-span-2" : ""}`}
        >
          <ProductImage product={product} className={`w-full object-cover transition duration-500 group-hover:scale-[1.02] ${index === 0 && products.length > 2 ? "aspect-[16/10] h-full min-h-[280px] sm:aspect-auto sm:min-h-[420px]" : "aspect-[4/5]"}`} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent p-4 pt-12 text-white sm:p-5 sm:pt-16">
            <h3 className="line-clamp-2 text-sm font-semibold sm:text-base">{product.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold">
              <span>{money(product.price, store)}</span>
              {product.original_price && product.original_price > product.price ? <span className="text-xs text-white/70 line-through">{money(product.original_price, store)}</span> : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ProductMerchandising({
  store,
  post,
  products,
  layout = "grid",
  title,
  description,
}: {
  store: Store;
  post: BlogPostRecord;
  products: BlogProductRecord[];
  layout?: BlogProductLayout;
  title?: string;
  description?: string;
}) {
  if (!products.length) return null;
  return (
    <section className="my-8 rounded-3xl border border-border bg-gradient-to-br from-primary/[0.06] via-card to-card p-5 sm:p-7">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-2xl font-bold text-foreground">{title || post.product_embed_title || "Shop products from this story"}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description || "Explore the products mentioned or recommended in this article."}</p>
      {layout === "spotlight" ? <ProductSpotlight store={store} post={post} products={products} /> : null}
      {layout === "comparison" ? <ProductComparison store={store} post={post} products={products} /> : null}
      {layout === "lookbook" ? <ProductLookbook store={store} post={post} products={products} /> : null}
      {layout === "grid" ? <ProductGrid store={store} post={post} products={products} /> : null}
    </section>
  );
}

function ArticleTableOfContents({ headings }: { headings: BlogHeading[] }) {
  if (headings.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ListTree className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">In this article</p>
      </div>
      <ol className="mt-4 space-y-2 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-4" : undefined}>
            <a href={`#${heading.id}`} className="text-muted-foreground transition hover:text-primary hover:underline hover:underline-offset-4">
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ArticleContent({ store, post, products, layout }: { store: Store; post: BlogPostRecord; products: BlogProductRecord[]; layout: BlogProductLayout }) {
  const chunks = splitBlogContentAtProductDirectives(post.content);
  return (
    <>
      {chunks.map((chunk, index) => (
        <div key={`${post.id}-chunk-${index}`}>
          {chunk.trim() ? (
            <div
              className="prose prose-neutral mt-9 max-w-none scroll-smooth dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-heading prose-headings:tracking-tight prose-p:leading-8 prose-a:text-primary prose-a:underline-offset-4 prose-blockquote:border-primary prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-muted prose-pre:p-4 prose-ul:list-disc prose-ol:list-decimal"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(chunk) }}
            />
          ) : null}
          {index < chunks.length - 1 ? <ProductMerchandising store={store} post={post} products={products} layout={layout} /> : null}
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
  smartProducts = [],
  relatedPosts = [],
}: {
  store: Store;
  post: BlogPostRecord;
  settings: BlogSettings;
  products: BlogProductRecord[];
  smartProducts?: BlogProductRecord[];
  relatedPosts?: BlogPostRecord[];
}) {
  const embedPosition = resolveBlogProductEmbedPosition(post.product_embed_position);
  const productDirective = getPrimaryBlogProductDirective(post.content);
  const productLayout = productDirective?.layout ?? "grid";
  const hasInlineProducts = hasInlineBlogProducts(post.content);
  const headings = extractBlogHeadings(post.content);
  const canonical = post.canonical_url || absoluteStoreUrl(
    { slug: store.slug, customDomain: store.customDomain ?? null },
    `/blog/${encodeURIComponent(post.slug)}`,
  );
  const blogIndexCanonical = absoluteStoreUrl(
    { slug: store.slug, customDomain: store.customDomain ?? null },
    "/blog",
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
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Blog",
      item: blogIndexCanonical,
    },
    ...(post.category ? [{
      "@type": "ListItem",
      position: 2,
      name: post.category,
      item: `${blogIndexCanonical}?${new URLSearchParams({ category: post.category }).toString()}`,
    }] : []),
    {
      "@type": "ListItem",
      position: post.category ? 3 : 2,
      name: post.title,
      item: canonical,
    },
  ];
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <StorefrontLayout>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} />
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

                <ArticleTableOfContents headings={headings} />

                {!hasInlineProducts && embedPosition === "after-intro" ? <ProductMerchandising store={store} post={post} products={products} /> : null}

                <ArticleContent store={store} post={post} products={products} layout={productLayout} />

                {!hasInlineProducts && embedPosition === "after-content" ? <ProductMerchandising store={store} post={post} products={products} /> : null}

                {products.length === 0 && smartProducts.length > 0 ? (
                  <ProductMerchandising
                    store={store}
                    post={post}
                    products={smartProducts}
                    title="Recommended from this store"
                    description="Relevant catalog picks based on this article, current featured products, offers, and availability."
                  />
                ) : null}

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
