export type ProductMetricKind = "multi_value_text";
export type ProductMetricSource = "template" | "store";

export interface ProductMetricDefinition {
  key: string;
  label: string;
  kind: ProductMetricKind;
  source: ProductMetricSource;
}

const fallbackTemplateMetrics: ProductMetricDefinition[] = [
  { key: "size", label: "Size", kind: "multi_value_text", source: "template" },
  { key: "color", label: "Color", kind: "multi_value_text", source: "template" },
];

const templateMetricOverrides: Record<string, Array<Pick<ProductMetricDefinition, "key" | "label">>> = {
  hotel: [
    { key: "occupancy", label: "Occupancy" },
    { key: "room_size", label: "Room Size" },
    { key: "bed_type", label: "Bed Type" },
    { key: "amenities", label: "Amenities" },
  ],
  "real-estate": [
    { key: "address", label: "Address" },
    { key: "listing_type", label: "Listing Type" },
    { key: "property_area", label: "Property Area" },
    { key: "bedrooms", label: "Bedrooms" },
    { key: "bathrooms", label: "Bathrooms" },
  ],
};

const scalarPresentationMetricKeys = new Set([
  "occupancy",
  "room_size",
  "bed_type",
  "address",
  "listing_type",
  "property_area",
  "bedrooms",
  "bathrooms",
]);

export function normalizeProductMetricKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function normalizeMetricLabel(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeMetricDefinitions(value: unknown, source: ProductMetricSource = "store"): ProductMetricDefinition[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null).map((entry) => {
    const key = typeof entry.key === "string" ? normalizeProductMetricKey(entry.key) : "";
    const label = typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : normalizeMetricLabel(key);
    return { key, label, kind: "multi_value_text" as const, source };
  }).filter((entry) => {
    if (!entry.key || seen.has(entry.key)) return false;
    seen.add(entry.key);
    return true;
  });
}

export function getTemplateDefaultProductMetrics(templateId: string | null | undefined): ProductMetricDefinition[] {
  const templateMetrics = templateId ? templateMetricOverrides[templateId] : null;
  const source = templateMetrics?.length ? templateMetrics : fallbackTemplateMetrics;
  return source.map((metric) => ({ ...metric, kind: "multi_value_text" as const, source: "template" as const }));
}

export function getTemplateDefaultMetricKeys(templateId: string | null | undefined) {
  return getTemplateDefaultProductMetrics(templateId).map((metric) => metric.key);
}

export function mergeMetricDefinitions(templateMetrics: ProductMetricDefinition[], typeMetrics: ProductMetricDefinition[]) {
  const merged = new Map<string, ProductMetricDefinition>();
  for (const metric of templateMetrics) merged.set(metric.key, metric);
  for (const metric of typeMetrics) merged.set(metric.key, metric);
  return Array.from(merged.values());
}

export function resolveProductMetricDefinitions(templateMetrics: ProductMetricDefinition[], typeMetricSchema: unknown) {
  if (Array.isArray(typeMetricSchema)) {
    const normalizedTypeMetrics = normalizeMetricDefinitions(typeMetricSchema);
    if (normalizedTypeMetrics.length > 0) return normalizedTypeMetrics;
  }
  return templateMetrics;
}

export function normalizePresentationMetricSpecs<T extends Record<string, unknown>>(specs: T): T {
  let changed = false;
  const next: Record<string, unknown> = { ...specs };
  for (const key of scalarPresentationMetricKeys) {
    const value = next[key];
    if (!Array.isArray(value)) continue;
    const firstValue = value.find((item) => typeof item === "string" && item.trim());
    if (typeof firstValue !== "string") continue;
    next[key] = firstValue.trim();
    changed = true;
  }
  return changed ? (next as T) : specs;
}

export function normalizeMetricValues(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
    const normalizedKey = normalizeProductMetricKey(key);
    if (!normalizedKey) return null;
    if (Array.isArray(entryValue)) return [normalizedKey, entryValue.filter((item): item is string => typeof item === "string" && item.trim().length > 0)] as const;
    if (typeof entryValue === "string" && entryValue.trim()) return [normalizedKey, [entryValue.trim()]] as const;
    return null;
  }).filter((entry): entry is readonly [string, string[]] => Array.isArray(entry)));
}

export function serializeMetricInput(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function appendMetricValue(values: string[], nextValue: string) {
  const trimmedValue = nextValue.trim();
  if (!trimmedValue) return values;
  const normalizedLookup = new Set(values.map((value) => value.trim().toLowerCase()));
  if (normalizedLookup.has(trimmedValue.toLowerCase())) return values;
  return [...values, trimmedValue];
}

export function getMetricInputValue(metricKey: string, metricValues: Record<string, string[]>, legacy?: { sizes?: string[]; colors?: string[] }) {
  if (metricValues[metricKey]?.length) return metricValues[metricKey].join(", ");
  if (metricKey === "size" && legacy?.sizes?.length) return legacy.sizes.join(", ");
  if (metricKey === "color" && legacy?.colors?.length) return legacy.colors.join(", ");
  return "";
}
