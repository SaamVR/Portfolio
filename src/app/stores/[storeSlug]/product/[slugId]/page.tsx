import StoreProductPageClient from "@/app/stores/[storeSlug]/product/[slugId]/StoreProductPageClient";
import { getStoreBySlug } from "@/lib/cms/store-resolver";
import { buildStoreProductMetadata, getProductMetadataBySlugId } from "@/lib/cms/store-metadata";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string; slugId: string }>;
}) {
  const { storeSlug, slugId } = await params;
  const store = await getStoreBySlug(storeSlug);
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
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);

  if (!store) {
    notFound();
  }

  return <StoreProductPageClient store={store} />;
}
