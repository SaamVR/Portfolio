import Link from "next/link";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import type { Store } from "@/lib/cms/schema";
import { buildBlogIndexUrl, formatBlogDate, markdownToHtml, type BlogPostRecord } from "@/lib/cms/blog";

export function BlogPostPage({
  store,
  post,
}: {
  store: Store;
  post: BlogPostRecord;
}) {
  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <StorefrontLayout>
          <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-[28px] border border-border bg-card/70 p-6 shadow-sm sm:p-8">
              <Link href={buildBlogIndexUrl(store.slug)} className="text-sm font-medium text-primary hover:underline">
                Back to blog
              </Link>
              <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{formatBlogDate(post.published_at)}</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{post.title}</h1>
              {(post.excerpt || post.seo_description) ? (
                <p className="mt-4 text-base leading-7 text-muted-foreground">{post.excerpt || post.seo_description}</p>
              ) : null}
              {post.featured_image ? (
                <img src={post.featured_image} alt="" className="mt-6 h-auto w-full rounded-[24px] border border-border object-cover" />
              ) : null}
              <article
                className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:mb-4 prose-p:leading-8 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-muted prose-pre:p-4 prose-ul:list-disc prose-ol:list-decimal"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
              />
            </div>
          </main>
        </StorefrontLayout>
      </StoreThemeScope>
    </StoreProvider>
  );
}
