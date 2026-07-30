import type { NextRequest } from "next/server";

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

export function getEzcomoRequestHostname(request: Pick<NextRequest, "headers">) {
  const directHostname = normalizeRequestHost(request.headers.get("host")) ?? "";
  const forwardedHostname = normalizeRequestHost(request.headers.get("x-ezcomo-hostname")) ?? "";
  const receivedSecret = request.headers.get("x-ezcomo-proxy-secret");

  const isTrustedProxy = Boolean(process.env.EZCOMO_PROXY_SECRET)
    && receivedSecret === process.env.EZCOMO_PROXY_SECRET;

  if (isTrustedProxy && forwardedHostname) {
    return forwardedHostname;
  }

  return directHostname;
}
