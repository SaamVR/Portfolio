import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Search, X } from "lucide-react";
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
  type BlogPostRecord,
} from "@/lib/cms/blog";
import type { BlogSettings } from "@/lib/cms/blog-settings";
import { cn } from "@/lib/utils";

type ActiveBlogFilter = {
  type: "search" | "category" | "tag";
  value: string;
} | null;

function BlogMeta({ post, settings, store }: { post: BlogPostRecord; settings: BlogSettings; store: Store }) {
  const items: React.ReactNode[] = [];
  if (settings.showCategory && post.category) {
    const params = new URLSearchParams({ category: post.category });
    items.push(
      <Link key="category" href={`${buildBlogIndexUrl(store.slug)}?${params.toString()}`} className="font-semibold text-primary hover:underline">
        {post.category}
      </Link>,
    );
  }
  if (settings.showAuthor && post.author_name) {
    items.push(<span key="author">By {post.author_name}</span>);
  }
  if (settings.showDate) {
    items.push(<span key="date">{formatBlogDate(post.published_at || post.created_at)}</span>);
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

function ArticleImage({ post, className, eager = false }: { post: BlogPostRecord; className?: string; eager?: boolean }) {
  if (!post.featured_image) {
    return <div className={cn("flex items-center justify-center bg-muted", className)}><BookOpen className="h-9 w-9 text-muted-foreground" /></div>;
  }
  return (
    <img
      src={post.featured_image}
      alt={post.featured_image_alt || post.title}
      className={cn("object-cover", className)}
      loading={eager ? "eager" : "lazy"}
    />
  );
}

function ArticleCard({ store, post, settings, compact = false }: { store: Store; post: BlogPostRecord; settings: BlogSettings; compact?: boolean }) {
  const href = buildBlogPostUrl(store.slug, post.slug);
  if (compact) {
    return (
      <Link href={href} className="group grid gap-4 border-b border-border/70 py-5 transition last:border-b-0 sm:grid-cols-[180px_1fr] sm:items-center">
        <ArticleImage post={post} className="aspect-[16/10] w-full rounded-2xl" />
        <div className="min-w-0">
          <BlogMeta post={post} settings={settings} store={store} />
          <h2 className="mt-2 font-heading text-xl font-semibold text-foreground transition group-hover:text-primary">{post.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block min-w-0">
      <div className="overflow-hidden rounded-2xl bg-muted">
        <ArticleImage post={post} className="aspect-[16/10] w-full transition duration-500 group-hover:scale-[1.025]" />
      </div>
      <div className="pt-4">
        <BlogMeta post={post} settings={settings} store={store} />
        <h2 className="mt-2 font-heading text-xl font-semibold leading-tight text-foreground transition group-hover:text-primary">{post.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
      </div>
    </Link>
  );
}

function LatestStory({ store, post, settings }: { store: Store; post: BlogPostRecord; settings: BlogSettings }) {
  return (
    <Link href={buildBlogPostUrl(store.slug, post.slug)} className="group grid grid-cols-[108px_1fr] gap-4 border-b border-border/70 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <ArticleImage post={post} className="aspect-[4/3] h-full min-h-[82px] w-full rounded-xl" />
      <div className="min-w-0 self-center">
        {settings.showCategory && post.category ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{post.category}</p> : null}
        <h3 className="mt-1 line-clamp-3 font-heading text-base font-semibold leading-snug text-foreground transition group-hover:text-primary">{post.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{formatBlogDate(post.published_at || post.created_at)}</p>
      </div>
    </Link>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-2 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}
        <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      </div>
      {description ? <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function BlogIndexPage({
  store,
  posts,
  settings,
  activeFilter = null,
}: {
  store: Store;
  posts: BlogPostRecord[];
  settings: BlogSettings;
  activeFilter?: ActiveBlogFilter;
}) {
  const orderedPosts = [...posts].sort((left, right) => {
    const featuredDelta = Number(Boolean(right.is_featured)) - Number(Boolean(left.is_featured));
    if (featuredDelta !== 0) return featuredDelta;
    return new Date(right.published_at || right.created_at || 0).getTime() - new Date(left.published_at || left.created_at || 0).getTime();
  });
  const lead = orderedPosts[0];
  const sidebarStories = orderedPosts.slice(1, 4);
  const remainingStories = orderedPosts.slice(4);
  const indexHref = buildBlogIndexUrl(store.slug);
  const categories = Array.from(new Set(posts.map((post) => post.category?.trim()).filter((value): value is string => Boolean(value)))).slice(0, 10);
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags ?? []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 14);
  const pageTitle = settings.indexTitle.trim() || "Blog";

  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <StorefrontLayout>
          <div className="min-h-screen bg-background">
            <header className="border-b border-border/70 bg-card/20">
              <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{store.name} · {settings.indexEyebrow}</p>
                    <h1 className="mt-3 font-heading text-4xl font-bold tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">{pageTitle}</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{settings.indexDescription}</p>
                  </div>

                  <form action={indexHref} method="get" className="flex h-12 items-center gap-2 border-b border-foreground/25 bg-transparent">
                    <label htmlFor="blog-search" className="sr-only">Search articles</label>
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      id="blog-search"
                      name="q"
                      defaultValue={activeFilter?.type === "search" ? activeFilter.value : ""}
                      placeholder="Search the blog"
                      className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <button type="submit" className="shrink-0 text-sm font-semibold text-foreground transition hover:text-primary">Search</button>
                  </form>
                </div>
              </div>

              {categories.length > 0 ? (
                <nav aria-label="Blog categories" className="border-t border-border/70">
                  <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
                    <Link href={indexHref} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition", !activeFilter ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>All stories</Link>
                    {categories.map((category) => {
                      const params = new URLSearchParams({ category });
                      const active = activeFilter?.type === "category" && activeFilter.value.toLowerCase() === category.toLowerCase();
                      return (
                        <Link
                          key={category}
                          href={`${indexHref}?${params.toString()}`}
                          className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition", active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                        >
                          {category}
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              ) : null}
            </header>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {activeFilter ? (
                <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-border/70 pb-5 text-sm">
                  <span className="text-muted-foreground">{activeFilter.type === "search" ? "Search" : activeFilter.type === "category" ? "Category" : "Topic"}</span>
                  <span className="font-semibold text-foreground">{activeFilter.type === "tag" ? `#${activeFilter.value}` : activeFilter.value}</span>
                  <Link href={indexHref} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><X className="h-3.5 w-3.5" /> Clear filter</Link>
                </div>
              ) : null}

              {orderedPosts.length === 0 ? (
                <section className="py-20 text-center sm:py-28">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h2 className="mt-5 font-heading text-2xl font-semibold text-foreground">{activeFilter ? "No matching articles" : "No published articles yet"}</h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                    {activeFilter ? "Try another search, category, or topic." : "Published stories will appear here with their featured images, categories, and reading details."}
                  </p>
                  {activeFilter ? <Link href={indexHref} className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">View all stories</Link> : null}
                </section>
              ) : activeFilter ? (
                <section className="py-10 sm:py-14">
                  <SectionTitle eyebrow="Results" title={settings.indexTitle} description={`${orderedPosts.length} ${orderedPosts.length === 1 ? "article" : "articles"}`} />
                  <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                    {orderedPosts.map((post) => <ArticleCard key={post.id} store={store} post={post} settings={settings} />)}
                  </div>
                </section>
              ) : settings.indexLayout === "compact" ? (
                <section className="py-10 sm:py-14">
                  <SectionTitle eyebrow="Latest" title="Latest stories" />
                  <div className="mx-auto max-w-4xl">
                    {orderedPosts.map((post) => <ArticleCard key={post.id} store={store} post={post} settings={settings} compact />)}
                  </div>
                </section>
              ) : settings.indexLayout === "grid" ? (
                <section className="py-10 sm:py-14">
                  <SectionTitle eyebrow="Latest" title="Latest stories" />
                  <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                    {orderedPosts.map((post) => <ArticleCard key={post.id} store={store} post={post} settings={settings} />)}
                  </div>
                </section>
              ) : lead ? (
                <>
                  <section className="py-10 sm:py-14">
                    <SectionTitle eyebrow="Featured" title="Top story" description="A highlighted story from the latest articles, guides, and product knowledge." />
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)] lg:items-stretch">
                      <Link href={buildBlogPostUrl(store.slug, lead.slug)} className="group grid min-w-0 overflow-hidden border border-border/70 bg-card/30 md:grid-cols-[1.15fr_0.85fr]">
                        <div className="overflow-hidden bg-muted">
                          <ArticleImage post={lead} eager className="h-full min-h-[300px] w-full transition duration-700 group-hover:scale-[1.02] md:min-h-[430px]" />
                        </div>
                        <div className="flex flex-col justify-center p-6 sm:p-8">
                          <BlogMeta post={lead} settings={settings} store={store} />
                          <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-[-0.025em] text-foreground transition group-hover:text-primary sm:text-4xl">{lead.title}</h2>
                          <p className="mt-4 line-clamp-5 text-sm leading-7 text-muted-foreground sm:text-base">{buildBlogExcerpt(lead.content, lead.excerpt)}</p>
                          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read story <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                        </div>
                      </Link>

                      <aside className="border-t border-border/70 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Fresh reads</p>
                            <h2 className="mt-1 font-heading text-xl font-bold text-foreground">Latest stories</h2>
                          </div>
                        </div>
                        {sidebarStories.length > 0 ? (
                          <div>{sidebarStories.map((post) => <LatestStory key={post.id} store={store} post={post} settings={settings} />)}</div>
                        ) : (
                          <p className="text-sm leading-6 text-muted-foreground">More stories will appear here as they are published.</p>
                        )}
                      </aside>
                    </div>
                  </section>

                  {remainingStories.length > 0 ? (
                    <section className="border-t border-border/70 py-10 sm:py-14">
                      <SectionTitle eyebrow="Discover" title="More from the blog" />
                      <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                        {remainingStories.map((post) => <ArticleCard key={post.id} store={store} post={post} settings={settings} />)}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}

              {tags.length > 0 ? (
                <section className="border-t border-border/70 py-10 sm:py-12">
                  <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Explore</p>
                      <h2 className="mt-1 font-heading text-2xl font-bold text-foreground">Browse topics</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const params = new URLSearchParams({ tag });
                        return (
                          <Link key={tag} href={`${indexHref}?${params.toString()}`} className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary">
                            #{tag}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </StorefrontLayout>
      </StoreThemeScope>
    </StoreProvider>
  );
}
