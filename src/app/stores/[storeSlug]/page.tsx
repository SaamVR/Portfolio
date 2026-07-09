import { Suspense } from "react";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { getHomepage, getStoreBySlug } from "@/lib/cms/store-resolver";
import { buildStorePageMetadata } from "@/lib/cms/store-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);

  if (!store) {
    return {};
  }

  return buildStorePageMetadata(store, getHomepage(store), `/stores/${encodeURIComponent(store.slug)}`);
}

export default async function Page({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);

  if (!store) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <StorefrontPage store={store} page={getHomepage(store)} />
    </Suspense>
  );
}
