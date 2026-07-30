import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { getHomepage, getStoreBySlug } from "@/lib/cms/store-resolver";
import { buildStorePageMetadata } from "@/lib/cms/store-metadata";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { storeSlug } = await params;
  const { preview } = await searchParams;
  const store = await getStoreBySlug(storeSlug, preview);

  if (!store) {
    return {};
  }

  return buildStorePageMetadata(store, getHomepage(store), `/stores/${encodeURIComponent(store.slug)}`);
}

// Enable 60-second Incremental Static Regeneration / Edge Caching
export const revalidate = 60;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { storeSlug } = await params;
  const { preview } = await searchParams;
  const store = await getStoreBySlug(storeSlug, preview);

  if (!store) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <StorefrontPage store={store} page={getHomepage(store)} />
    </Suspense>
  );
}
