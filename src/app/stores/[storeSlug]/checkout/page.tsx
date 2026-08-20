import StoreCheckoutClient from "@/app/stores/[storeSlug]/checkout/StoreCheckoutClient";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { getStorePreviewTokenFromRequest } from "@/lib/cms/store-preview-request";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const previewToken = await getStorePreviewTokenFromRequest(storeSlug);
  const store = await getStoreShellBySlug(storeSlug, previewToken, { requestedPageSlug: "/checkout" });

  if (!store) {
    notFound();
  }

  return <StoreCheckoutClient store={store} />;
}
