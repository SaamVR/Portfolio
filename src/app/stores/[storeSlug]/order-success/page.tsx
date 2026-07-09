import StoreOrderSuccessClient from "@/app/stores/[storeSlug]/order-success/StoreOrderSuccessClient";
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

  return <StoreOrderSuccessClient store={store} />;
}
