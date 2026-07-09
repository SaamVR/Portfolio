import StoreCheckoutClient from "@/app/stores/[storeSlug]/checkout/StoreCheckoutClient";
import { getStoreBySlug } from "@/lib/cms/store-resolver";
import { notFound } from "next/navigation";

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

  return <StoreCheckoutClient store={store} />;
}
