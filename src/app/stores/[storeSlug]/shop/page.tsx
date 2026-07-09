import StoreShopPageClient from "@/app/stores/[storeSlug]/shop/StoreShopPageClient";
import { getStoreBySlug } from "@/lib/cms/store-resolver";
import { buildStoreShopMetadata } from "@/lib/cms/store-metadata";
import { notFound } from "next/navigation";

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

  return buildStoreShopMetadata(store);
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

  return <StoreShopPageClient store={store} />;
}
