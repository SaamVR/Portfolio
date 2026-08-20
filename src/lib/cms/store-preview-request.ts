import { headers } from "next/headers";
import {
  STORE_PREVIEW_SLUG_HEADER,
  STORE_PREVIEW_TOKEN_HEADER,
} from "@/lib/cms/store-preview-constants";

export async function getStorePreviewTokenFromRequest(storeSlug: string) {
  const requestHeaders = await headers();
  const previewStoreSlug = requestHeaders.get(STORE_PREVIEW_SLUG_HEADER)?.trim() ?? "";
  const previewToken = requestHeaders.get(STORE_PREVIEW_TOKEN_HEADER)?.trim() ?? "";

  if (!previewToken || previewStoreSlug !== storeSlug) {
    return undefined;
  }

  return previewToken;
}
