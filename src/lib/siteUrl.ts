const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

export const siteUrl =
  configuredSiteUrl ||
  (typeof window !== "undefined" ? window.location.origin : "https://commerce-engine.local");

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}
