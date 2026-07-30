import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { getPageBySlug, getStoreBySlug } from "@/lib/cms/store-resolver";
import { buildStorePageMetadata } from "@/lib/cms/store-metadata";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string; pageSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { storeSlug, pageSlug } = await params;
  const { preview } = await searchParams;
  const store = await getStoreBySlug(storeSlug, preview);
  const page = store ? getPageBySlug(store, `/${pageSlug}`) : null;

  if (!store || !page) {
    return {};
  }

  return buildStorePageMetadata(store, page, `/stores/${encodeURIComponent(store.slug)}/${encodeURIComponent(pageSlug)}`);
}

// Enable 60-second Incremental Static Regeneration / Edge Caching
export const revalidate = 60;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string; pageSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { storeSlug, pageSlug } = await params;
  const { preview } = await searchParams;
  const store = await getStoreBySlug(storeSlug, preview);

  if (!store) {
    notFound();
  }

  const page = getPageBySlug(store, `/${pageSlug}`);
  if (!page) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <StorefrontPage store={store} page={page} />
    </Suspense>
  );
}
