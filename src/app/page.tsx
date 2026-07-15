import { headers } from "next/headers";
import { CmsLandingPage } from "@/components/marketing/CmsLandingPage";
import { CmsPricing } from "@/components/marketing/CmsPricing";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { getRequestStore } from "@/lib/cms/request-store";
import { getHomepage, isLocalStorefrontHostname } from "@/lib/cms/store-resolver";
import { buildStorePageMetadata } from "@/lib/cms/store-metadata";
import { getPreferredRequestHost } from "@/lib/platform/request-host";
import { getCmsRootDomain, getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";

function isPlatformHost(hostname?: string | null) {
  const normalized = getPreferredRequestHost({ host: hostname });
  if (!normalized) return true;
  if (isLocalStorefrontHostname(normalized)) return true;

  const cmsRootDomain = getCmsRootDomain();
  const storeBaseDomain = getStoreSubdomainBaseDomain();

  return normalized === cmsRootDomain
    || normalized === `www.${cmsRootDomain}`
    || normalized === storeBaseDomain
    || normalized === `www.${storeBaseDomain}`;
}

export async function generateMetadata() {
  const requestHeaders = await headers();
  const requestHost = getPreferredRequestHost({
    host: requestHeaders.get("host"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
  });
  if (isPlatformHost(requestHost)) {
    return {};
  }

  const store = await getRequestStore();
  if (!store) {
    return {};
  }

  return buildStorePageMetadata(store, getHomepage(store), "/");
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const requestHeaders = await headers();
  const requestHost = getPreferredRequestHost({
    host: requestHeaders.get("host"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
  });

  if (!isPlatformHost(requestHost)) {
    const store = await getRequestStore();
    if (store) {
      return <StorefrontPage store={store} page={getHomepage(store)} />;
    }
  }

  return (
    <CmsLandingPage>
      <CmsPricing />
    </CmsLandingPage>
  );
}
