import Link from "next/link";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import type { Store } from "@/lib/cms/schema";
import {
  buildBlogExcerpt,
  buildBlogPostUrl,
  calculateBlogReadingTime,
  formatBlogDate,
  type BlogPostRecord,
} from "@/lib/cms/blog";
import type { BlogSettings } from "@/lib/cms/blog-settings";
import { cn } from "@/lib/utils";

function BlogMeta({ post, settings }: { post: BlogPostRecord; settings: BlogSettings }) {
  const items: React.ReactNode[] = [];
  if (settings.showCategory && post.category) {
    items.push(<span key="category" className="font-semibold text-primary">{post.category}</span>);
  }
  if (settings.showAuthor && post.author_name) {
    items.push(<span key="author">By {post.author_name}</span>);
  }
  if (settings.showDate) {
    items.push(<span key="date">{formatBlogDate(post.published_at)}</span>);
  }
  if (settings.showReadingTime) {
    items.push(
      <span key="reading" className="inline-flex items-center gap-1">
        <Clock3 className="h-3.5 w-3.5" /> {calculateBlogReadingTime(post.content)} min read
      </span>,
    );
  }
  return items.length ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{items}</div> : null;
}

function ArticleImage({ post, className }: { post: BlogPostRecord; className?: string }) {
  if (!post.featured_image) {
    return <div className={cn("flex items-center justify-center bg-muted", className)}><BookOpen className="h-9 w-9 text-muted-foreground" /></div>;
  }
  return <img src={post.featured_image} alt={post.featured_image_alt || post.title} className={cn("object-cover", className)} loading="lazy" />;
}

function ArticleCard({ store, post, settings, compact = false }: { store: Store; post: BlogPostRecord; settings: BlogSettings; compact?: boolean }) {
  const href = buildBlogPostUrl(store.slug, post.slug);
  if (compact) {
    return (
      <Link href={href} className="group grid gap-4 rounded-2xl border border-border bg-card/60 p-4 transition hover:border-primary/30 hover:bg-primary/[0.03] sm:grid-cols-[180px_1fr] sm:items-center">
        <ArticleImage post={post} className="aspect-[16/10] w-full rounded-xl" />
        <div className="min-w-0">
          <BlogMeta post={post} settings={settings} />
          <h2 className="mt-2 font-heading text-xl font-semibold text-foreground transition group-hover:text-primary">{post.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
      <ArticleImage post={post} className="aspect-[16/10] w-full transition duration-500 group-hover:scale-[1.02]" />
      <div className="p-5 sm:p-6">
        <BlogMeta post={post} settings={settings} />
        <h2 className="mt-3 font-heading text-xl font-semibold text-foreground transition group-hover:text-primary">{post.title}</h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
      </div>
    </Link>
  );
}

export function BlogIndexPage({
  store,
  posts,
  settings,
}: {
  store: Store;
  posts: BlogPostRecord[];
  settings: BlogSettings;
}) {
  const orderedPosts = [...posts].sort((left, right) => {
    const featuredDelta = Number(Boolean(right.is_featured)) - Number(Boolean(left.is_featured));
    if (featuredDelta !== 0) return featuredDelta;
    return new Date(right.published_at || 0).getTime() - new Date(left.published_at || 0).getTime();
  });
  const lead = orderedPosts[0];
  const rest = orderedPosts.slice(1);

  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <StorefrontLayout>
          <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <section className="overflow-hidden rounded-[32px] border border-border bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 shadow-sm sm:p-9 lg:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{settings.indexEyebrow}</p>
              <h1 className="mt-3 max-w-4xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{settings.indexTitle || `${store.name} journal`}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{settings.indexDescription}</p>
            </section>

            {orderedPosts.length === 0 ? (
              <section className="mt-8 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 font-heading text-2xl font-semibold text-foreground">Stories are coming soon</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">This store has not published any articles yet. Check back for guides, product education, and updates.</p>
              </section>
            ) : settings.indexLayout === "compact" ? (
              <section className="mt-8 space-y-4">
                {orderedPosts.map((post) => <ArticleCard key={post.id} store={store} post={post} settings={settings} compact />)}
              </section>
            ) : settings.indexLayout === "magazine" && lead ? (
              <section className="mt-8 space-y-6">
                <Link href={buildBlogPostUrl(store.slug, lead.slug)} className="group grid overflow-hidden rounded-[30px] border border-border bg-card/70 shadow-sm lg:grid-cols-[1.15fr_0.85fr]">
                  <ArticleImage post={lead} className="h-full min-h-[300px] w-full lg:min-h-[440px]" />
                  <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                    <div className="mb-3 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Featured story</div>
                    <BlogMeta post={lead} settings={settings} />
                    <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground transition group-hover:text-primary sm:text-4xl">{lead.title}</h2>
                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-muted-foreground sm:text-base">{buildBlogExcerpt(lead.content, lead.excerpt)}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read featured article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                  </div>
                </Link>
                {rest.length ? (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {rest.map((post) => <ArticleCard key={post.id} store={store} post={post} settings={settings} />)}
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {orderedPosts.map((post) => <ArticleCard key={post.id} store={store} post={post} settings={settings} />)}
              </section>
            )}
          </main>
        </StorefrontLayout>
      </StoreThemeScope>
    </StoreProvider>
  );
}
