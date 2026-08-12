"use client";

import type { Store } from "@/lib/cms/schema";
import { storefrontPath } from "@/lib/slug";

type StorefrontProfileRecord = Record<string, unknown>;

function getStorefrontProfileFromStore(store?: Pick<Store, "siteSettings" | "slug"> | null) {
  if (typeof store?.siteSettings?.storefront_profile === "object" && store.siteSettings?.storefront_profile) {
    return store.siteSettings.storefront_profile as StorefrontProfileRecord;
  }

  return {};
}

export function resolveAllowGuestCheckout(storefrontProfile?: StorefrontProfileRecord | null) {
  if (typeof storefrontProfile?.allow_guest_checkout === "boolean") {
    return storefrontProfile.allow_guest_checkout;
  }

  return true;
}

export function resolveAllowGuestCheckoutForStore(store?: Pick<Store, "siteSettings" | "slug"> | null) {
  return resolveAllowGuestCheckout(getStorefrontProfileFromStore(store));
}

export function getCurrentRelativePath(fallbackPath = "/") {
  if (typeof window === "undefined") {
    return fallbackPath;
  }

  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return path.startsWith("/") ? path : fallbackPath;
}

export function buildCustomerAuthPath(nextPath: string, storeSlug?: string | null) {
  return storefrontPath(`/auth?next=${encodeURIComponent(nextPath)}`, storeSlug);
}
