import { headers } from "next/headers";
import { defaultStore } from "@/lib/cms/default-store";
import { getStoreBySlug, resolveStoreByHostname } from "@/lib/cms/store-resolver";

export async function getRequestStore() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = requestHeaders.get("host");
  const resolved = await resolveStoreByHostname(forwardedHost ?? host ?? undefined);

  if (resolved.id !== defaultStore.id) {
    return resolved;
  }

  const localStore = await getStoreBySlug(defaultStore.slug);
  return localStore ?? resolved;
}
