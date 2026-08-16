import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const TRUSTED_STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

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

function isTrustedEzcomoLoadBalancer(request: Pick<NextRequest, "headers">) {
  const receivedSecret = request.headers.get("x-ezcomo-lb-secret") ?? "";
  const expectedHash = process.env.EZCOMO_LB_PROXY_SECRET_SHA256?.trim().toLowerCase() ?? "";

  if (!receivedSecret || !SHA256_HEX_PATTERN.test(expectedHash)) {
    return false;
  }

  const receivedHash = createHash("sha256").update(receivedSecret).digest();
  const expectedHashBytes = Buffer.from(expectedHash, "hex");

  return expectedHashBytes.length === receivedHash.length
    && timingSafeEqual(receivedHash, expectedHashBytes);
}

export function getEzcomoRequestHostname(request: Pick<NextRequest, "headers">) {
  const directHostname = normalizeRequestHost(request.headers.get("host")) ?? "";
  const forwardedHostname = normalizeRequestHost(request.headers.get("x-ezcomo-hostname")) ?? "";

  if ((isTrustedEzcomoProxy(request) || isTrustedEzcomoLoadBalancer(request)) && forwardedHostname) {
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
