import { headers } from "next/headers";
import { DEFAULT_STORE_ID } from "@/lib/cms/default-store";
import { getStoreBySlug, isLocalStorefrontHostname, resolveStoreByHostname } from "@/lib/cms/store-resolver";
import { getPreferredRequestHost, normalizeRequestHost } from "@/lib/platform/request-host";

export function shouldTryLocalStoreSlugFallback(hostname?: string | null, resolvedStoreId?: string | null) {
  const normalizedHost = normalizeRequestHost(hostname);
  return resolvedStoreId === DEFAULT_STORE_ID
    && (normalizedHost === "localhost" || normalizedHost === "127.0.0.1");
}

export function getLocalStoreSlugCandidates(env: Record<string, string | undefined> = process.env) {
  return Array.from(new Set([
    env.CMS_LOCAL_STORE_SLUG,
    env.STORE_LOCAL_SLUG,
    env.NEXT_PUBLIC_CMS_LOCAL_STORE_SLUG,
    env.NEXT_PUBLIC_STORE_LOCAL_SLUG,
  ].filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim())));
}

export async function getRequestStore() {
  const requestHeaders = await headers();
  const requestHost = getPreferredRequestHost({
    host: requestHeaders.get("host"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
  }) ?? undefined;
  const resolved = await resolveStoreByHostname(requestHost);

  if (resolved && !shouldTryLocalStoreSlugFallback(requestHost, resolved.id)) {
    return resolved;
  }

  if (isLocalStorefrontHostname(requestHost)) {
    for (const slug of getLocalStoreSlugCandidates()) {
      const localStore = await getStoreBySlug(slug);
      if (localStore) {
        return localStore;
      }
    }
  }

  return resolved;
}
