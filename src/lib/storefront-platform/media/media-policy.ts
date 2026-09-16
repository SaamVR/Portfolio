export type StorefrontMediaRole = "hero" | "product-card" | "gallery" | "content" | "thumbnail";

export type StorefrontMediaPolicy = {
  sizes: string;
  priority: boolean;
  loading: "eager" | "lazy";
  recommendedAspectRatio: string | null;
};

const rolePolicy: Record<StorefrontMediaRole, Omit<StorefrontMediaPolicy, "priority" | "loading">> = {
  hero: { sizes: "100vw", recommendedAspectRatio: null },
  "product-card": { sizes: "(max-width: 430px) 50vw, (max-width: 1024px) 33vw, 25vw", recommendedAspectRatio: "4 / 5" },
  gallery: { sizes: "(max-width: 767px) 100vw, 50vw", recommendedAspectRatio: "4 / 5" },
  content: { sizes: "(max-width: 767px) 100vw, 800px", recommendedAspectRatio: null },
  thumbnail: { sizes: "(max-width: 430px) 25vw, 160px", recommendedAspectRatio: "1 / 1" },
};

export function resolveStorefrontMediaPolicy({ role, isLcp = false }: { role: StorefrontMediaRole; isLcp?: boolean }): StorefrontMediaPolicy {
  const priority = role === "hero" && isLcp;
  return { ...rolePolicy[role], priority, loading: priority ? "eager" : "lazy" };
}

export function resolveStorefrontObjectPosition(focalPoint?: { x?: number | null; y?: number | null } | null) {
  const clamp = (value: number | null | undefined, fallback: number) =>
    Math.min(100, Math.max(0, typeof value === "number" && Number.isFinite(value) ? value : fallback));
  return `${clamp(focalPoint?.x, 50)}% ${clamp(focalPoint?.y, 50)}%`;
}

export function isProductionMediaSourceAllowed(src?: string | null, maxInlineBytes = 32 * 1024) {
  const value = src?.trim() ?? "";
  if (!value.startsWith("data:image/")) return true;
  const comma = value.indexOf(",");
  if (comma < 0) return false;
  const payload = value.slice(comma + 1);
  try {
    const estimatedBytes = value.includes(";base64,") ? Math.ceil(payload.length * 0.75) : decodeURIComponent(payload).length;
    return estimatedBytes <= maxInlineBytes;
  } catch {
    return false;
  }
}
