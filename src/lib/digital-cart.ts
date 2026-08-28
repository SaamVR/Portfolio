export const DIGITAL_CART_VARIANT_PREFIX = "digital::";

type DigitalVariantParts = {
  license: string;
  formats: string[];
};

function sanitizePart(value: string) {
  return value.replace(/[|:]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeFormats(formats: string[]) {
  return formats
    .map((format) => sanitizePart(format).toUpperCase())
    .filter(Boolean)
    .slice(0, 4);
}

export function encodeDigitalCartVariant({
  license = "",
  formats = [],
}: {
  license?: string;
  formats?: string[];
}) {
  const normalizedLicense = sanitizePart(license);
  const normalizedFormats = normalizeFormats(formats);
  return `${DIGITAL_CART_VARIANT_PREFIX}${normalizedLicense}::${normalizedFormats.join("|")}`;
}

export function isDigitalCartVariant(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(DIGITAL_CART_VARIANT_PREFIX);
}

export function parseDigitalCartVariant(value: string | null | undefined): DigitalVariantParts | null {
  if (!isDigitalCartVariant(value)) {
    return null;
  }

  const rawValue = (value ?? "").slice(DIGITAL_CART_VARIANT_PREFIX.length);
  const [rawLicense, rawFormats] = rawValue.split("::");
  return {
    license: sanitizePart(rawLicense || ""),
    formats: normalizeFormats((rawFormats || "").split("|")),
  };
}

export function getCartVariantDisplayLabel(value: string | null | undefined) {
  const digital = parseDigitalCartVariant(value);
  if (!digital) {
    return value?.trim() || "Default option";
  }

  if (digital.license && digital.formats.length > 0) {
    return `${digital.license} - ${digital.formats.join(", ")}`;
  }
  if (digital.license) return digital.license;
  if (digital.formats.length > 0) return digital.formats.join(", ");
  return "Digital item";
}

export function isDigitalOnlyCart<TItem extends { size?: string | null }>(items: TItem[]) {
  return items.length > 0 && items.every((item) => isDigitalCartVariant(item.size));
}
