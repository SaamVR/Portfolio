import { headers } from "next/headers";
import { CmsLandingPage } from "@/components/marketing/CmsLandingPage";
import { CmsPricing } from "@/components/marketing/CmsPricing";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { StoreNotFoundView } from "@/components/storefront/StoreNotFoundView";
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
  if (isPlatformHost(requestHost)) {
    return {};
  }

  const store = await getRequestStore();
  if (!store) {
    return {};
  }

  return buildStorePageMetadata(store, getHomepage(store), "/");
}

// Enable ISR / CDN Edge Caching with 60-second revalidation strategy
export const revalidate = 60;

export default async function Page() {
  const requestHeaders = await headers();
  const requestHost = getEzcomoRequestHostname({ headers: requestHeaders });

  if (!isPlatformHost(requestHost)) {
    const store = await getRequestStore();
    if (store) {
      return <StorefrontPage store={store} page={getHomepage(store)} />;
    }

    // Graceful 404 for nonexistent/unpublished custom domains or store subdomains
    return <StoreNotFoundView hostname={requestHost} reason="not_found" />;
  }

  return (
    <CmsLandingPage>
      <CmsPricing />
    </CmsLandingPage>
  );
}
