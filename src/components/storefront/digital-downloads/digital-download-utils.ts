import type { Product } from "@/data/products";

export type DigitalLicenseOption = {
  id: string;
  label: string;
  description: string;
  price: number;
};

type DigitalSpecs = Record<string, unknown> | null | undefined;

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function specStrings(product: Product, specs: DigitalSpecs, keys: string[]) {
  for (const key of keys) {
    const value = specs?.[key];
    if (Array.isArray(value)) {
      const normalized = uniqueStrings(value.map((item) => String(item)));
      if (normalized.length > 0) return normalized;
    }
    if (typeof value === "string" && value.trim()) {
      return uniqueStrings(value.split(/[,|]/));
    }

    const metricValues = product.metricValues?.[key];
    if (Array.isArray(metricValues)) {
      const normalized = uniqueStrings(metricValues);
      if (normalized.length > 0) return normalized;
    }
  }
  return [];
}

function firstSpecString(product: Product, specs: DigitalSpecs, keys: string[]) {
  return specStrings(product, specs, keys)[0] ?? "";
}

export function getDigitalFormats(product: Product, specs?: DigitalSpecs) {
  return specStrings(product, specs, ["formats", "file_formats", "format"])
    .map((value) => value.toUpperCase())
    .slice(0, 4);
}

export function getDigitalCompatibility(product: Product, specs?: DigitalSpecs) {
  return specStrings(product, specs, ["software_compatibility", "compatibility", "supported_software"])
    .slice(0, 4);
}

export function getDigitalFileSize(product: Product, specs?: DigitalSpecs) {
  return firstSpecString(product, specs, ["file_size", "download_size"]);
}

export function getIncludedFileCount(product: Product, specs?: DigitalSpecs): number | null {
  const raw = firstSpecString(product, specs, ["included_files", "file_count"]);
  if (!raw) return null;
  const parsed = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDigitalLicenses(product: Product, specs?: DigitalSpecs): DigitalLicenseOption[] {
  const labels = specStrings(product, specs, ["licenses", "license", "license_type", "license_tier"]);
  return labels.slice(0, 4).map((label) => ({
    id: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    description: "Merchant-configured license option.",
    price: product.price,
  }));
}

export function getInstantDownloadInfo(product: Product, specs?: DigitalSpecs) {
  return firstSpecString(product, specs, ["delivery_time", "access_time", "fulfillment_time"]);
}

export function getDigitalCategoryDescription(category: string) {
  const source = category.toLowerCase();
  if (source.includes("font")) return "Typeface packs and lettering assets";
  if (source.includes("audio") || source.includes("music")) return "Tracks, loops, and audio resources";
  if (source.includes("photo") || source.includes("preset")) return "Creative edits and enhancement packs";
  if (source.includes("template")) return "Ready-made files for faster launches";
  return "Digital assets";
}
