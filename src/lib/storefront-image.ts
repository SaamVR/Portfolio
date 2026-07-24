const unstableDemoHosts = new Set([
  "loremflickr.com",
  "placehold.co",
]);

const stableOptimizedHosts = [
  "res.cloudinary.com",
  "images.unsplash.com",
];

function normalizeUrlCandidate(value: string | null | undefined) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

export function isBrokenSeedAssetUrl(value: string | null | undefined) {
  const normalized = normalizeUrlCandidate(value);
  if (!normalized) {
    return true;
  }

  return normalized.includes("/seed-assets/");
}

export function resolveStorefrontImageSrc(
  src: string | null | undefined,
  fallbackSrc?: string | null,
) {
  const normalizedSrc = normalizeUrlCandidate(src);
  const normalizedFallback = normalizeUrlCandidate(fallbackSrc);

  if (!normalizedSrc || normalizedSrc.includes("/seed-assets/")) {
    return normalizedFallback ?? "/placeholder.svg";
  }

  if (normalizedSrc.startsWith("/")) {
    return normalizedSrc;
  }

  try {
    const parsed = new URL(normalizedSrc);
    if (!parsed.protocol.startsWith("http")) {
      return normalizedFallback ?? "/placeholder.svg";
    }
    return normalizedSrc;
  } catch {
    return normalizedFallback ?? "/placeholder.svg";
  }
}

export function getStorefrontImageHostname(src: string | null | undefined) {
  const normalizedSrc = normalizeUrlCandidate(src);
  if (!normalizedSrc || normalizedSrc.startsWith("/")) {
    return null;
  }

  try {
    return new URL(normalizedSrc).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function shouldBypassNextImageOptimizer(src: string | null | undefined) {
  const hostname = getStorefrontImageHostname(src);
  return hostname ? unstableDemoHosts.has(hostname) : false;
}

export function canUseNextImageOptimizer(src: string | null | undefined) {
  const hostname = getStorefrontImageHostname(src);
  if (!hostname) {
    return true;
  }

  if (unstableDemoHosts.has(hostname)) {
    return false;
  }

  return stableOptimizedHosts.includes(hostname) || hostname.endsWith(".supabase.co") || hostname.endsWith(".vercel-storage.com");
}
