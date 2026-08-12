import StoreCheckoutClient from "@/app/stores/[storeSlug]/checkout/StoreCheckoutClient";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: "/checkout" });

  if (!store) {
    notFound();
  }

  return <StoreCheckoutClient store={store} />;
}
