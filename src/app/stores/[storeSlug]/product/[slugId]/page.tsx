import StoreProductPageClient from "@/app/stores/[storeSlug]/product/[slugId]/StoreProductPageClient";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { buildStoreProductMetadata, getProductMetadataBySlugId } from "@/lib/cms/store-metadata";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string; slugId: string }>;
}) {
  const { storeSlug, slugId } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: `/product/${slugId}` });
  const product = store ? await getProductMetadataBySlugId(store.id, slugId) : null;

  if (!store || !product) {
    return {};
  }

  return buildStoreProductMetadata(store, product, slugId);
}

export default async function Page({
  params,
}: {
  params: Promise<{ storeSlug: string; slugId: string }>;
}) {
  const { storeSlug, slugId } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: `/product/${slugId}` });

  if (!store) {
    notFound();
  }

  return <StoreProductPageClient store={store} />;
}
