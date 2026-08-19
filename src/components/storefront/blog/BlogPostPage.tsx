import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, ShoppingBag, Tag } from "lucide-react";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import type { Store } from "@/lib/cms/schema";
import {
  buildBlogIndexUrl,
  calculateBlogReadingTime,
  formatBlogDate,
  markdownToHtml,
  resolveBlogProductEmbedPosition,
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
          <Link key={product.id} href={productUrl(product.id, product.name, store.slug)} className="group overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
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

export function BlogPostPage({
  store,
  post,
  settings,
  products,
}: {
  store: Store;
  post: BlogPostRecord;
  settings: BlogSettings;
  products: BlogProductRecord[];
}) {
  const embedPosition = resolveBlogProductEmbedPosition(post.product_embed_position);
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
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: post.author_name ? { "@type": "Person", name: post.author_name } : { "@type": "Organization", name: store.name },
    publisher: { "@type": "Organization", name: store.name },
    mainEntityOfPage: canonical,
    keywords: [...(post.seo_keywords ?? []), ...(post.tags ?? [])].join(", ") || undefined,
  };

  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <StorefrontLayout>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
          <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <article className="overflow-hidden rounded-[32px] border border-border bg-card/70 shadow-sm">
              <div className="p-6 sm:p-9 lg:p-12">
                <Link href={buildBlogIndexUrl(store.slug)} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" /> Back to blog
                </Link>

                <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                  {settings.showCategory && post.category ? <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{post.category}</span> : null}
                  {settings.showAuthor && post.author_name ? <span>By {post.author_name}</span> : null}
                  {settings.showDate ? <span>{formatBlogDate(post.published_at)}</span> : null}
                  {settings.showReadingTime ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {calculateBlogReadingTime(post.content)} min read</span> : null}
                </div>

                <h1 className="mt-4 max-w-4xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{post.title}</h1>
                {(post.excerpt || post.seo_description) ? (
                  <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">{post.excerpt || post.seo_description}</p>
                ) : null}

                {embedPosition === "before-content" ? <ProductMerchandising store={store} post={post} products={products} /> : null}

                {post.featured_image ? (
                  <img src={post.featured_image} alt={post.featured_image_alt || post.title} className="mt-8 max-h-[640px] w-full rounded-[28px] border border-border object-cover" />
                ) : null}

                {embedPosition === "after-intro" ? <ProductMerchandising store={store} post={post} products={products} /> : null}

                <div
                  className="prose prose-neutral mt-9 max-w-none dark:prose-invert prose-headings:font-heading prose-headings:tracking-tight prose-p:leading-8 prose-a:text-primary prose-a:underline-offset-4 prose-blockquote:border-primary prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-muted prose-pre:p-4 prose-ul:list-disc prose-ol:list-decimal"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
                />

                {embedPosition === "after-content" ? <ProductMerchandising store={store} post={post} products={products} /> : null}

                {settings.showTags && (post.tags ?? []).length > 0 ? (
                  <div className="mt-9 flex flex-wrap items-center gap-2 border-t border-border pt-6">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {(post.tags ?? []).map((tag) => <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{tag}</span>)}
                  </div>
                ) : null}
              </div>
            </article>
          </main>
        </StorefrontLayout>
      </StoreThemeScope>
    </StoreProvider>
  );
}
