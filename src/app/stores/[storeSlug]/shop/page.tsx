import StoreShopPageClient from "@/app/stores/[storeSlug]/shop/StoreShopPageClient";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { getStorePreviewTokenFromRequest } from "@/lib/cms/store-preview-request";
import { buildStoreShopMetadata } from "@/lib/cms/store-metadata";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const previewToken = await getStorePreviewTokenFromRequest(storeSlug);
  const store = await getStoreShellBySlug(storeSlug, previewToken, { requestedPageSlug: "/shop" });

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
  const previewToken = await getStorePreviewTokenFromRequest(storeSlug);
  const store = await getStoreShellBySlug(storeSlug, previewToken, { requestedPageSlug: "/shop" });

  if (!store) {
    notFound();
  }

  return <StoreShopPageClient store={store} />;
}
