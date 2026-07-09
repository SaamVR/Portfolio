import { Suspense } from "react";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { getPageBySlug, getStoreBySlug } from "@/lib/cms/store-resolver";
import { buildStorePageMetadata } from "@/lib/cms/store-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string; pageSlug: string }>;
}) {
  const { storeSlug, pageSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  const page = store ? getPageBySlug(store, `/${pageSlug}`) : null;

  if (!store || !page) {
    return {};
  }

  return buildStorePageMetadata(store, page, `/stores/${encodeURIComponent(store.slug)}/${encodeURIComponent(pageSlug)}`);
}

export default async function Page({
  params,
}: {
  params: Promise<{ storeSlug: string; pageSlug: string }>;
}) {
  const { storeSlug, pageSlug } = await params;
  const store = await getStoreBySlug(storeSlug);

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
