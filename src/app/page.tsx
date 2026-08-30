import { headers } from "next/headers";
import { CommercialTruthLandingPage } from "@/components/marketing/CommercialTruthLandingPage";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { StoreNotFoundView } from "@/components/storefront/StoreNotFoundView";
import { loadPublicPlanCatalog } from "@/lib/billing/plans";
import { getRequestStore } from "@/lib/cms/request-store";
import { getHomepage, isLocalStorefrontHostname } from "@/lib/cms/store-resolver";
import { buildStorePageMetadata } from "@/lib/cms/store-metadata";
import { getEzcomoRequestHostname, getPreferredRequestHost } from "@/lib/platform/request-host";
import { getCmsRootDomain, getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";

function isPlatformHost(hostname?: string | null) {
  const normalized = getPreferredRequestHost({ host: hostname });
  if (!normalized) return true;
  if (isLocalStorefrontHostname(normalized)) return true;

  const cmsRootDomain = getCmsRootDomain();
  const storeBaseDomain = getStoreSubdomainBaseDomain();

  return (
    normalized === cmsRootDomain ||
    normalized === `www.${cmsRootDomain}` ||
    normalized === storeBaseDomain ||
    normalized === `www.${storeBaseDomain}`
  );
}

export async function generateMetadata() {
  const requestHeaders = await headers();
  const requestHost = getEzcomoRequestHostname({ headers: requestHeaders });
  if (isPlatformHost(requestHost)) return {};

  const store = await getRequestStore({ requestedPageSlug: "/" });
  if (!store) return {};
  return buildStorePageMetadata(store, getHomepage(store), "/");
}

export const revalidate = 60;

export default async function Page() {
  const requestHeaders = await headers();
  const requestHost = getEzcomoRequestHostname({ headers: requestHeaders });

  if (!isPlatformHost(requestHost)) {
    const store = await getRequestStore({ requestedPageSlug: "/" });
    if (store) return <StorefrontPage store={store} page={getHomepage(store)} />;
    return <StoreNotFoundView hostname={requestHost} reason="not_found" />;
  }

  const planCatalog = await loadPublicPlanCatalog();
  return <CommercialTruthLandingPage planCatalog={planCatalog} />;
}
