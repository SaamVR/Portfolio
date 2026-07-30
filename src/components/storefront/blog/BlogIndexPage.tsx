import Link from "next/link";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import type { Store } from "@/lib/cms/schema";
import { buildBlogExcerpt, buildBlogPostUrl, formatBlogDate, type BlogPostRecord } from "@/lib/cms/blog";

export function BlogIndexPage({
  store,
  posts,
}: {
  store: Store;
  posts: BlogPostRecord[];
}) {
  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <StorefrontLayout>
          <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="rounded-[28px] border border-border bg-card/60 p-8 shadow-sm">
              <p className="text-sm font-medium text-primary">Store blog</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{store.name} journal</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Product education, launch notes, buying guidance, and merchant storytelling that keep discovery traffic warm.
              </p>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <article key={post.id} className="overflow-hidden rounded-[28px] border border-border bg-card/70 shadow-sm">
                  {post.featured_image ? (
                    <img src={post.featured_image} alt="" className="h-52 w-full object-cover" />
                  ) : null}
                  <div className="space-y-3 p-6">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{formatBlogDate(post.published_at)}</p>
                    <h2 className="text-xl font-semibold text-foreground">{post.title}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
                    <Link href={buildBlogPostUrl(store.slug, post.slug)} className="inline-flex text-sm font-medium text-primary hover:underline">
                      Read article
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          </main>
        </StorefrontLayout>
      </StoreThemeScope>
    </StoreProvider>
  );
}
