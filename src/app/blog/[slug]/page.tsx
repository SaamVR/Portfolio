import { notFound } from "next/navigation";
import { BlogPostPage } from "@/components/storefront/blog/BlogPostPage";
import { getRequestStore } from "@/lib/cms/request-store";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import type { BlogPostRecord } from "@/lib/cms/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getRequestStore();
  const supabase = getCmsSupabaseServerClient();
  if (!store || !supabase) return {};
  const { data } = await (supabase as any)
    .from("blog_posts")
    .select("title, seo_title, seo_description, excerpt")
    .eq("store_id", store.id)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return {};
  return {
    title: data.seo_title || data.title,
    description: data.seo_description || data.excerpt || `Read ${data.title} from ${store.name}.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getRequestStore();
  const supabase = getCmsSupabaseServerClient();
  if (!store || !supabase) notFound();

  const { data } = await (supabase as any)
    .from("blog_posts")
    .select("*")
    .eq("store_id", store.id)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (!data) notFound();

  return <BlogPostPage store={store} post={data as BlogPostRecord} />;
}
