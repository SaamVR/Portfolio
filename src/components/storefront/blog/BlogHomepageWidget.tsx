"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";
import { StorefrontSectionEmpty, StorefrontSectionError, StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildBlogExcerpt, buildBlogIndexUrl, buildBlogPostUrl, calculateBlogReadingTime, formatBlogDate } from "@/lib/cms/blog";
import { normalizeBlogSettings, type BlogSettings } from "@/lib/cms/blog-settings";
import { cn } from "@/lib/utils";

type BlogWidgetPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  published_at: string | null;
};

function PostMeta({ post }: { post: BlogWidgetPost }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span>{formatBlogDate(post.published_at)}</span>
      <span className="inline-flex items-center gap-1">
        <Clock3 className="h-3.5 w-3.5" />
        {calculateBlogReadingTime(post.content)} min read
      </span>
    </div>
  );
}

export function BlogHomepageWidget() {
  const store = useOptionalStore();
  const { data: rawSettings } = useSiteSettings<BlogSettings>("blog", store?.id);
  const settings = normalizeBlogSettings(rawSettings ?? store?.siteSettings?.blog);

  const postsQuery = useQuery({
    queryKey: ["storefront-blog-home-widget", store?.id, settings.homepageWidgetLimit],
    enabled: Boolean(store?.id && settings.enabled && settings.homepageWidgetEnabled),
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("id,title,slug,excerpt,content,featured_image,published_at")
        .eq("store_id", store.id)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(settings.homepageWidgetLimit);
      if (error) throw error;
      return (data ?? []) as BlogWidgetPost[];
    },
    staleTime: 120_000,
  });

  if (!store || !settings.enabled || !settings.homepageWidgetEnabled) return null;
  if (postsQuery.isLoading) return <StorefrontSectionSkeleton title={settings.homepageWidgetTitle || "Loading articles"} cards={3} />;
  if (postsQuery.isError) return <StorefrontSectionError title="Articles could not load" description="The rest of the storefront is available. Try this section again shortly." onRetry={() => void postsQuery.refetch()} />;

  const posts = postsQuery.data ?? [];
  const indexHref = buildBlogIndexUrl(store.slug);
  if (posts.length === 0) {
    return (
      <StorefrontSectionEmpty
        eyebrow={settings.homepageWidgetEyebrow || "Journal"}
        title={settings.homepageWidgetTitle || "Articles are coming soon"}
        description="Published stories, guides, and product inspiration will appear here automatically."
        primaryLabel="Open Blog"
        primaryHref={indexHref}
      />
    );
  }

  const layout = settings.homepageWidgetLayout;

  return (
    <section data-blog-homepage-widget={layout} className="border-t border-border bg-background py-14 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{settings.homepageWidgetEyebrow}</p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">{settings.homepageWidgetTitle}</h2>
            {settings.homepageWidgetSubtitle ? <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">{settings.homepageWidgetSubtitle}</p> : null}
          </div>
          <Link href={indexHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            View all articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {layout === "compact" ? (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card/60">
            {posts.map((post) => (
              <Link key={post.id} href={buildBlogPostUrl(store.slug, post.slug)} className="group grid gap-3 p-5 transition hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <PostMeta post={post} />
                  <h3 className="mt-2 font-heading text-lg font-semibold text-foreground group-hover:text-primary">{post.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
                </div>
                <ArrowRight className="hidden h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary sm:block" />
              </Link>
            ))}
          </div>
        ) : layout === "featured-grid" ? (
          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            {posts[0] ? (
              <Link href={buildBlogPostUrl(store.slug, posts[0].slug)} className="group overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
                {posts[0].featured_image ? <img src={posts[0].featured_image} alt="" className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.02]" loading="lazy" /> : <div className="flex aspect-[16/9] items-center justify-center bg-muted"><BookOpen className="h-10 w-10 text-muted-foreground" /></div>}
                <div className="p-6">
                  <PostMeta post={posts[0]} />
                  <h3 className="mt-3 font-heading text-2xl font-bold text-foreground group-hover:text-primary">{posts[0].title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{buildBlogExcerpt(posts[0].content, posts[0].excerpt)}</p>
                </div>
              </Link>
            ) : null}
            <div className="grid gap-4">
              {posts.slice(1).map((post) => (
                <Link key={post.id} href={buildBlogPostUrl(store.slug, post.slug)} className="group grid grid-cols-[110px_1fr] overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm sm:grid-cols-[150px_1fr]">
                  {post.featured_image ? <img src={post.featured_image} alt="" className="h-full min-h-32 w-full object-cover" loading="lazy" /> : <div className="flex min-h-32 items-center justify-center bg-muted"><BookOpen className="h-7 w-7 text-muted-foreground" /></div>}
                  <div className="p-4">
                    <PostMeta post={post} />
                    <h3 className="mt-2 line-clamp-2 font-heading text-base font-semibold text-foreground group-hover:text-primary">{post.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn(
            "gap-3 sm:gap-5",
            layout === "carousel"
              ? "flex snap-x snap-mandatory overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "grid grid-cols-2 xl:grid-cols-3",
          )}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={buildBlogPostUrl(store.slug, post.slug)}
                className={cn(
                  "group overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm sm:rounded-3xl",
                  layout === "carousel" && "min-w-[82vw] snap-center sm:min-w-[360px] lg:min-w-[390px]",
                )}
              >
                {post.featured_image ? <img src={post.featured_image} alt="" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]" loading="lazy" /> : <div className="flex aspect-[16/10] items-center justify-center bg-muted"><BookOpen className="h-9 w-9 text-muted-foreground" /></div>}
                <div className="p-3 sm:p-5">
                  <PostMeta post={post} />
                  <h3 className="mt-2 line-clamp-2 font-heading text-base font-semibold text-foreground group-hover:text-primary sm:mt-3 sm:text-xl">{post.title}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">{buildBlogExcerpt(post.content, post.excerpt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
