import { headers } from "next/headers";
import { defaultStore } from "@/lib/cms/default-store";
import { getStoreBySlug, resolveStoreByHostname } from "@/lib/cms/store-resolver";

function normalizeRequestHost(hostname?: string | null) {
  if (!hostname) return null;

  return hostname
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .split(":")[0] || null;
}

export function shouldTryLocalStoreSlugFallback(hostname?: string | null, resolvedStoreId?: string | null) {
  const normalizedHost = normalizeRequestHost(hostname);
  return resolvedStoreId === defaultStore.id
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
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = requestHeaders.get("host");
  const requestHost = forwardedHost ?? host ?? undefined;
  const resolved = await resolveStoreByHostname(requestHost);

  if (!shouldTryLocalStoreSlugFallback(requestHost, resolved.id)) {
    return resolved;
  }

  for (const slug of getLocalStoreSlugCandidates()) {
    const localStore = await getStoreBySlug(slug);
    if (localStore) {
      return localStore;
    }
  }

  return resolved;
}
