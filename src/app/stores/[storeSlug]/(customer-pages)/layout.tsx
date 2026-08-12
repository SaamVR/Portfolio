import { notFound } from "next/navigation";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { getStoreShellBySlug } from "@/lib/cms/store-resolver";

export const dynamic = "force-dynamic";

export default async function StoreCustomerPagesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreShellBySlug(storeSlug, undefined, { requestedPageSlug: "/account" });

  if (!store) {
    notFound();
  }

  return (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>{children}</StoreThemeScope>
    </StoreProvider>
  );
}
