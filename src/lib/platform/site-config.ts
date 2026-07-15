function normalizeHost(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0]
    .trim()
    .toLowerCase() || null;
}

function ensureHttps(hostOrUrl?: string | null) {
  const host = normalizeHost(hostOrUrl);
  return host ? `https://${host}` : null;
}

export const PLATFORM_BRAND_NAME = "EZComo";
export const PLATFORM_PRIMARY_DOMAIN = "ezcomo.shop";

export function getCmsRootDomain(env: Record<string, string | undefined> = process.env) {
  return normalizeHost(
    env.NEXT_PUBLIC_CMS_ROOT_DOMAIN
    || env.CMS_ROOT_DOMAIN
    || env.NEXT_PUBLIC_SITE_URL
    || env.SITE_URL,
  ) || PLATFORM_PRIMARY_DOMAIN;
}

export function getStoreSubdomainBaseDomain(env: Record<string, string | undefined> = process.env) {
  return normalizeHost(
    env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE_DOMAIN
    || env.STORE_SUBDOMAIN_BASE_DOMAIN
    || env.NEXT_PUBLIC_CMS_ROOT_DOMAIN
    || env.CMS_ROOT_DOMAIN
    || env.NEXT_PUBLIC_SITE_URL
    || env.SITE_URL,
  ) || PLATFORM_PRIMARY_DOMAIN;
}

export function getPlatformSiteUrl(env: Record<string, string | undefined> = process.env) {
  return ensureHttps(
    env.NEXT_PUBLIC_SITE_URL
    || env.SITE_URL
    || env.NEXT_PUBLIC_APP_URL,
  ) || `https://${getCmsRootDomain(env)}`;
}
