import { NextResponse } from "next/server";

export const PUBLIC_STOREFRONT_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export function withPublicStorefrontCache(init?: ResponseInit): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", PUBLIC_STOREFRONT_CACHE_CONTROL);
  return {
    ...init,
    headers,
  };
}

export function jsonPublicStorefrontCache(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, withPublicStorefrontCache(init));
}
