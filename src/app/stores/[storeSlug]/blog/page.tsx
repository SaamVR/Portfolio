import { notFound } from "next/navigation";
import { BlogIndexPage } from "@/components/storefront/blog/BlogIndexPage";
import { getStoreBySlug } from "@/lib/cms/store-resolver";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import type { BlogPostRecord } from "@/lib/cms/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) return {};
  return {
    title: `${store.name} Blog`,
    description: `Stories, guides, and updates from ${store.name}.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  const supabase = getCmsSupabaseServerClient();
  if (!store || !supabase) notFound();

  const { data } = await (supabase as any)
    .from("blog_posts")
    .select("*")
    .eq("store_id", store.id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  return <BlogIndexPage store={store} posts={(data ?? []) as BlogPostRecord[]} />;
}
