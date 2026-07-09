import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { getRequestStore } from "@/lib/cms/request-store";
import { getPageBySlug } from "@/lib/cms/store-resolver";
import { buildStorePageMetadata } from "@/lib/cms/store-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getRequestStore();
  const page = getPageBySlug(store, `/${slug}`);

  if (!page) {
    return {};
  }

  return buildStorePageMetadata(store, page, `/${encodeURIComponent(slug)}`);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getRequestStore();
  const page = getPageBySlug(store, `/${slug}`);

  if (!page) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <StorefrontPage store={store} page={page} />
    </Suspense>
  );
}
