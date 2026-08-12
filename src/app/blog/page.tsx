import { notFound } from "next/navigation";
import { BlogIndexPage } from "@/components/storefront/blog/BlogIndexPage";
import { getRequestStoreShell } from "@/lib/cms/request-store";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import type { BlogPostRecord } from "@/lib/cms/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const store = await getRequestStoreShell({ requestedPageSlug: "/blog" });
  if (!store) return {};
  return {
    title: `${store.name} Blog`,
    description: `Stories, guides, and updates from ${store.name}.`,
  };
}

export default async function Page() {
  const store = await getRequestStoreShell({ requestedPageSlug: "/blog" });
  const supabase = getCmsSupabaseServerClient();

  if (!store || !supabase) {
    notFound();
  }

  const { data } = await (supabase as any)
    .from("blog_posts")
    .select("*")
    .eq("store_id", store.id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  return <BlogIndexPage store={store} posts={(data ?? []) as BlogPostRecord[]} />;
}
