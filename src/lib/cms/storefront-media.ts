export type StorefrontImagePositionPreset =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const presetPositions: Record<StorefrontImagePositionPreset, string> = {
  center: "50% 50%",
  top: "50% 0%",
  bottom: "50% 100%",
  left: "0% 50%",
  right: "100% 50%",
  "top-left": "0% 0%",
  "top-right": "100% 0%",
  "bottom-left": "0% 100%",
  "bottom-right": "100% 100%",
};

function normalizePercent(value: unknown): number | null {
  const numericValue = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : Number.NaN;

  if (!Number.isFinite(numericValue)) return null;
  return Math.max(0, Math.min(100, numericValue));
}

export function resolveStorefrontImageObjectPosition(options?: {
  position?: unknown;
  focalX?: unknown;
  focalY?: unknown;
}) {
  const focalX = normalizePercent(options?.focalX);
  const focalY = normalizePercent(options?.focalY);

  if (focalX !== null || focalY !== null) {
    return `${focalX ?? 50}% ${focalY ?? 50}%`;
  }

  const preset = typeof options?.position === "string"
    ? options.position as StorefrontImagePositionPreset
    : "center";

  return presetPositions[preset] ?? presetPositions.center;
}
