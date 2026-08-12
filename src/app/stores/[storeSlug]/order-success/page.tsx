import StoreOrderSuccessClient from "@/app/stores/[storeSlug]/order-success/StoreOrderSuccessClient";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: "/order-success" });

  if (!store) {
    notFound();
  }

  return <StoreOrderSuccessClient store={store} />;
}
