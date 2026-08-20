import { notFound } from "next/navigation";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { getStorePreviewTokenFromRequest } from "@/lib/cms/store-preview-request";

export const dynamic = "force-dynamic";

export default async function StoreCustomerPagesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const previewToken = await getStorePreviewTokenFromRequest(storeSlug);
  const store = await getStoreShellBySlug(storeSlug, previewToken, { requestedPageSlug: "/account" });

  if (!store) {
    notFound();
  }

  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>{children}</StoreThemeScope>
    </StoreProvider>
  );
}
