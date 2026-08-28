import type { Product } from "@/data/products";

type FactSource = Record<string, unknown> | null | undefined;

function normalizedValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (typeof value === "number" && Number.isFinite(value)) return [String(value)];
  return [];
}

export function getExplicitFactValues(product: Product, keys: string[], previewSource?: FactSource) {
  for (const key of keys) {
    const metricValues = product.metricValues?.[key]?.map((value) => value.trim()).filter(Boolean);
    if (metricValues?.length) return metricValues;
  }

  if (previewSource) {
    for (const key of keys) {
      const values = normalizedValues(previewSource[key]);
      if (values.length) return values;
    }
  }

  return [];
}

export function getExplicitFactText(product: Product, keys: string[], previewSource?: FactSource) {
  return getExplicitFactValues(product, keys, previewSource)[0] ?? "";
}

export function getExplicitFactNumber(product: Product, keys: string[], previewSource?: FactSource): number | null {
  const raw = getExplicitFactText(product, keys, previewSource);
  if (!raw) return null;
  const parsed = Number.parseFloat(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}
