import { headers } from "next/headers";
import { DEFAULT_STORE_ID } from "@/lib/cms/default-store";
import { getStoreBySlug, getStoreShellBySlug, getStoreShellById, isLocalStorefrontHostname, resolveStoreByHostname } from "@/lib/cms/store-resolver";
import { getEzcomoRequestHostname, getEzcomoRequestStoreSlug, normalizeRequestHost } from "@/lib/platform/request-host";

type RequestStoreOptions = {
  requestedPageSlug?: string | null;
};

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

export async function getRequestStore(options?: RequestStoreOptions) {
  const requestHeaders = await headers();
  const forwardedStoreSlug = getEzcomoRequestStoreSlug({ headers: requestHeaders });
  if (forwardedStoreSlug) {
    return getStoreBySlug(forwardedStoreSlug, undefined, options);
  }

  const requestHost = getEzcomoRequestHostname({ headers: requestHeaders }) || undefined;
  const resolved = await resolveStoreByHostname(requestHost, options);

  if (resolved && !shouldTryLocalStoreSlugFallback(requestHost, resolved.id)) {
    return resolved;
  }

  if (isLocalStorefrontHostname(requestHost)) {
    for (const slug of getLocalStoreSlugCandidates()) {
      const localStore = await getStoreBySlug(slug, undefined, options);
      if (localStore) {
        return localStore;
      }
    }
  }

  return resolved;
}

export async function getRequestStoreShell(options?: RequestStoreOptions) {
  const requestHeaders = await headers();
  const forwardedStoreSlug = getEzcomoRequestStoreSlug({ headers: requestHeaders });
  if (forwardedStoreSlug) {
    return getStoreShellBySlug(forwardedStoreSlug, undefined, options);
  }

  const requestHost = getEzcomoRequestHostname({ headers: requestHeaders }) || undefined;
  const resolved = await resolveStoreByHostname(requestHost, options);

  if (resolved && !shouldTryLocalStoreSlugFallback(requestHost, resolved.id)) {
    return getStoreShellById(resolved.id, options);
  }

  if (isLocalStorefrontHostname(requestHost)) {
    for (const slug of getLocalStoreSlugCandidates()) {
      const localStore = await getStoreShellBySlug(slug, undefined, options);
      if (localStore) {
        return localStore;
      }
    }
  }

  return resolved ? await getStoreShellById(resolved.id, options) : resolved;
}
