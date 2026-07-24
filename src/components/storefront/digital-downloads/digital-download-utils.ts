import type { Product } from "@/data/products";

export type DigitalLicenseOption = {
  id: string;
  label: string;
  description: string;
  price: number;
};

const fileFormatPattern = /\b(ai|eps|fig|figma|indd|jpg|jpeg|key|mp3|mp4|pdf|png|pptx|psd|svg|ttf|wav|xd|xmp|zip)\b/gi;
const compatibilityPattern = /\b(photoshop|illustrator|lightroom|figma|canva|premiere pro|after effects|procreate|word|powerpoint|keynote)\b/gi;
const licenses = ["personal", "commercial", "extended", "team", "studio"];

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function parseNumberMetric(source: string, pattern: RegExp) {
  const match = source.match(pattern);
  return match?.[1]?.trim() || null;
}

export function getDigitalFormats(product: Product) {
  const source = `${product.name} ${product.description} ${product.category} ${product.type} ${product.sizes.join(" ")} ${product.colors.join(" ")}`;
  const matchedFormats = Array.from(source.matchAll(fileFormatPattern)).map((match) => match[1]?.toUpperCase() || "");
  const normalized = uniqueStrings(matchedFormats).map((value) => value === "FIGMA" ? "FIG" : value);

  if (normalized.length > 0) {
    return normalized.slice(0, 4);
  }

  if (/font|type/i.test(source)) return ["OTF", "TTF"];
  if (/preset|lightroom/i.test(source)) return ["XMP", "DNG"];
  if (/audio|beat|music/i.test(source)) return ["WAV", "MP3"];
  if (/template|deck|presentation/i.test(source)) return ["PPTX", "PDF"];
  return ["ZIP"];
}

export function getDigitalCompatibility(product: Product) {
  const source = `${product.name} ${product.description} ${product.category} ${product.type}`;
  const matched = Array.from(source.matchAll(compatibilityPattern)).map((match) => match[1] || "");
  const normalized = uniqueStrings(matched).map((value) => toTitleCase(value));

  if (normalized.length > 0) {
    return normalized.slice(0, 3);
  }

  if (/font|type/i.test(source)) return ["Photoshop", "Illustrator", "Canva"];
  if (/preset|photo/i.test(source)) return ["Lightroom", "Photoshop"];
  if (/template|mockup/i.test(source)) return ["Photoshop", "Canva"];
  if (/audio|beat|music/i.test(source)) return ["Desktop DAWs", "Mobile editors"];
  return ["Desktop and mobile apps"];
}

export function getDigitalFileSize(product: Product) {
  const source = `${product.name} ${product.description}`;
  const explicit = parseNumberMetric(source, /(\d+(?:\.\d+)?)\s?(kb|mb|gb)\b/i);
  if (explicit) {
    const unitMatch = source.match(/(\d+(?:\.\d+)?)\s?(kb|mb|gb)\b/i);
    return `${explicit} ${unitMatch?.[2]?.toUpperCase() || "MB"}`;
  }

  if ((product.images?.length || 0) > 3) {
    return `${Math.max(120, (product.images.length || 1) * 85)} MB`;
  }

  return product.stock && product.stock > 20 ? "95 MB" : "180 MB";
}

export function getIncludedFileCount(product: Product) {
  const source = `${product.name} ${product.description}`;
  const explicit = parseNumberMetric(source, /(\d+)\s+(?:files|assets|items|templates|pages|slides)\b/i);
  if (explicit) {
    return Number(explicit);
  }

  return Math.max(4, (product.images?.length || 1) * 2);
}

export function getDigitalLicenses(product: Product): DigitalLicenseOption[] {
  const detected = product.sizes
    .map((size) => size.trim())
    .filter((size) => licenses.some((license) => size.toLowerCase().includes(license)));

  const baseLabels = detected.length > 0
    ? detected
    : ["Personal", "Commercial", "Extended"];

  return baseLabels.slice(0, 3).map((label, index) => ({
    id: label.toLowerCase().replace(/\s+/g, "-"),
    label: toTitleCase(label),
    description: index === 0
      ? "For personal or single-brand use."
      : index === 1
        ? "Covers client, commercial, or resale-ready work."
        : "Expanded rights for larger campaigns or teams.",
    price: index === 0
      ? product.price
      : index === 1
        ? Math.round(product.price * 1.35)
        : Math.round(product.price * 1.7),
  }));
}

export function getInstantDownloadInfo(product: Product) {
  if ((product.stock ?? 0) > 25) return "Secure access sent after payment confirmation";
  if ((product.stock ?? 0) > 5) return "Fast digital delivery with merchant verification";
  return "Delivered after payment review";
}

export function getDigitalCategoryDescription(category: string) {
  const source = category.toLowerCase();
  if (source.includes("font")) return "Typeface packs and lettering assets";
  if (source.includes("audio") || source.includes("music")) return "Tracks, loops, and audio resources";
  if (source.includes("photo") || source.includes("preset")) return "Creative edits and enhancement packs";
  if (source.includes("template")) return "Ready-made files for faster launches";
  return "Digital assets ready for secure purchase";
}
