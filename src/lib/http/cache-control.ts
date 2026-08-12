import { NextResponse } from "next/server";

export const PRIVATE_NO_STORE_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";

export function withNoStoreHeaders(init?: ResponseInit): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", PRIVATE_NO_STORE_CACHE_CONTROL);
  return {
    ...init,
    headers,
  };
}

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, withNoStoreHeaders(init));
}
