import { headers } from "next/headers";
import { CmsLandingPage } from "@/components/marketing/CmsLandingPage";
import { CmsPricing } from "@/components/marketing/CmsPricing";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { getRequestStore } from "@/lib/cms/request-store";
import { getHomepage, isLocalStorefrontHostname } from "@/lib/cms/store-resolver";
import { buildStorePageMetadata } from "@/lib/cms/store-metadata";
import { getCmsRootDomain, getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";

function normalizeRequestHost(hostname?: string | null) {
  if (!hostname) return null;
  return hostname
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .split(":")[0] || null;
}

function isPlatformHost(hostname?: string | null) {
  const normalized = normalizeRequestHost(hostname);
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
  const requestHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
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
  const requestHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

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
