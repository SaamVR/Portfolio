import type { NextRequest } from "next/server";

const TRUSTED_STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeRequestHost(hostname?: string | null) {
  if (!hostname) {
    return null;
  }

  return hostname
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .replace(/\.$/, "") || null;
}

export function getPreferredRequestHost(
  values: {
    host?: string | null;
    forwardedHost?: string | null;
  },
) {
  return normalizeRequestHost(values.host) ?? normalizeRequestHost(values.forwardedHost);
}

function isTrustedEzcomoProxy(request: Pick<NextRequest, "headers">) {
  const receivedSecret = request.headers.get("x-ezcomo-proxy-secret");
  return Boolean(process.env.EZCOMO_PROXY_SECRET)
    && receivedSecret === process.env.EZCOMO_PROXY_SECRET;
}

export function getEzcomoRequestHostname(request: Pick<NextRequest, "headers">) {
  const directHostname = normalizeRequestHost(request.headers.get("host")) ?? "";
  const forwardedHostname = normalizeRequestHost(request.headers.get("x-ezcomo-hostname")) ?? "";

  if (isTrustedEzcomoProxy(request) && forwardedHostname) {
    return forwardedHostname;
  }

  return directHostname;
}

export function getEzcomoRequestStoreSlug(request: Pick<NextRequest, "headers">) {
  if (!isTrustedEzcomoProxy(request)) {
    return null;
  }

  const forwardedStoreSlug = request.headers.get("x-ezcomo-store-slug")?.trim().toLowerCase() ?? "";
  if (!forwardedStoreSlug || !TRUSTED_STORE_SLUG_PATTERN.test(forwardedStoreSlug)) {
    return null;
  }

  return forwardedStoreSlug;
}
