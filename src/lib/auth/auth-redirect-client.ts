"use client";

import {
  parseAuthEntryIntent,
  sanitizeInternalReturnPath,
  type AuthDestination,
  type AuthEntryIntent,
} from "@/lib/auth/post-auth-destination";

export function buildAuthRedirectPath(options: {
  intent?: AuthEntryIntent;
  nextPath?: string | null;
  storeSlug?: string | null;
} = {}) {
  const params = new URLSearchParams();
  const intent = options.intent ?? "auto";
  if (intent !== "auto") params.set("intent", intent);

  const nextPath = sanitizeInternalReturnPath(options.nextPath);
  if (nextPath) params.set("next", nextPath);

  const storeSlug = options.storeSlug?.trim().toLowerCase();
  if (storeSlug) params.set("store", storeSlug);

  const query = params.toString();
  return query ? `/auth/redirect?${query}` : "/auth/redirect";
}

export async function fetchAuthDestination(options: {
  accessToken: string;
  intent?: string | null;
  nextPath?: string | null;
  storeSlug?: string | null;
  signal?: AbortSignal;
}): Promise<AuthDestination> {
  const params = new URLSearchParams();
  const intent = parseAuthEntryIntent(options.intent);
  if (intent !== "auto") params.set("intent", intent);

  const nextPath = sanitizeInternalReturnPath(options.nextPath);
  if (nextPath) params.set("next", nextPath);

  if (options.storeSlug?.trim()) params.set("store", options.storeSlug.trim());

  const response = await fetch(`/api/auth/destination?${params.toString()}`, {
    headers: { Authorization: `Bearer ${options.accessToken}` },
    cache: "no-store",
    signal: options.signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.path) {
    throw new Error(payload?.error || "Could not determine where to open your account.");
  }

  return payload as AuthDestination;
}
