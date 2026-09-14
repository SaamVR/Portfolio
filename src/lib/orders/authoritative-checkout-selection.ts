import { isDigitalCartVariant, parseDigitalCartVariant } from "@/lib/digital-cart";

export type AuthoritativeCheckoutSelectionItem = {
  productId: string;
  size: string;
};

export type AuthoritativeCheckoutSelectionProduct = {
  id: string;
  type?: string | null;
  sizes?: unknown;
  colors?: unknown;
  metric_values?: unknown;
};

function normalizedStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function metricRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizedKey(value: string) {
  return value.trim().toLowerCase();
}

function isDigitalProductType(value: unknown) {
  return typeof value === "string" && /(digital|download|template|preset|asset|license)/i.test(value);
}

function collectMetricOptions(metrics: Record<string, unknown>) {
  return Object.values(metrics).flatMap((value) => normalizedStrings(value));
}

function metricOptionsForKeys(metrics: Record<string, unknown>, keys: string[]) {
  const keySet = new Set(keys.map(normalizedKey));
  return Object.entries(metrics)
    .filter(([key]) => keySet.has(normalizedKey(key)))
    .flatMap(([, value]) => normalizedStrings(value));
}

export function validateAuthoritativeCheckoutSelections({
  items,
  products,
}: {
  items: AuthoritativeCheckoutSelectionItem[];
  products: AuthoritativeCheckoutSelectionProduct[];
}) {
  const productsById = new Map(products.map((product) => [product.id, product]));

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new Error("Cart contains a product that is unavailable");
    }

    const selection = item.size.trim();
    const metrics = metricRecord(product.metric_values);

    if (isDigitalProductType(product.type)) {
      if (!isDigitalCartVariant(selection)) {
        throw new Error("Digital product checkout options are not configured");
      }

      const digital = parseDigitalCartVariant(selection);
      if (!digital) {
        throw new Error("Cart contains an invalid digital option");
      }

      const licenses = metricOptionsForKeys(metrics, ["licenses", "license", "license_type", "license_tier"]);
      if (licenses.length > 0 && !licenses.some((value) => normalizedKey(value) === normalizedKey(digital.license))) {
        throw new Error("Cart contains an invalid digital license");
      }

      const formats = metricOptionsForKeys(metrics, ["formats", "file_formats", "format"]);
      const allowedFormats = new Set(formats.map(normalizedKey));
      if (allowedFormats.size > 0 && digital.formats.some((format) => !allowedFormats.has(normalizedKey(format)))) {
        throw new Error("Cart contains an invalid digital format");
      }
      continue;
    }

    if (isDigitalCartVariant(selection)) {
      throw new Error("Cart contains an invalid product option");
    }

    const allowedOptions = new Set([
      ...normalizedStrings(product.sizes),
      ...normalizedStrings(product.colors),
      ...collectMetricOptions(metrics),
    ].map(normalizedKey));

    if (allowedOptions.size === 0) {
      const normalizedSelection = normalizedKey(selection);
      if (normalizedSelection === "default" || normalizedSelection === "free size") {
        continue;
      }
      throw new Error("Cart contains an invalid product option");
    }

    const selectedOptions = selection.split("•").map((value) => normalizedKey(value)).filter(Boolean);
    if (selectedOptions.length === 0 || selectedOptions.some((value) => !allowedOptions.has(value))) {
      throw new Error("Cart contains an invalid product option");
    }
  }
}
