import { headers } from "next/headers";
import {
  STORE_PREVIEW_COOKIE_PREFIX,
  STORE_PREVIEW_SLUG_HEADER,
  STORE_PREVIEW_TOKEN_HEADER,
} from "@/lib/cms/store-preview-constants";
import { validatePreviewToken } from "@/lib/cms/store-resolver";

export async function getStorePreviewTokenFromRequest(storeSlug: string) {
  const requestHeaders = await headers();
  const previewStoreSlug = requestHeaders.get(STORE_PREVIEW_SLUG_HEADER)?.trim() ?? "";
  const previewToken = requestHeaders.get(STORE_PREVIEW_TOKEN_HEADER)?.trim() ?? "";

  if (!previewToken || previewStoreSlug !== storeSlug) {
    return undefined;
  }

  return previewToken;
}


export async function getValidatedStorePreviewTokenFromApiRequest(request: Request, storeId: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const candidates = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const separator = entry.indexOf("=");
      if (separator <= 0) return [];
      const name = entry.slice(0, separator).trim();
      if (!name.startsWith(STORE_PREVIEW_COOKIE_PREFIX)) return [];
      const value = entry.slice(separator + 1).trim();
      if (!value) return [];
      try {
        return [decodeURIComponent(value)];
      } catch {
        return [value];
      }
    });

  for (const token of candidates) {
    if (await validatePreviewToken(storeId, token)) {
      return token;
    }
  }

  return undefined;
}
