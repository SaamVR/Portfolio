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
  license,
  formats = [],
}: {
  license: string;
  formats?: string[];
}) {
  const normalizedLicense = sanitizePart(license) || "Personal";
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
    license: sanitizePart(rawLicense || "Personal") || "Personal",
    formats: normalizeFormats((rawFormats || "").split("|")),
  };
}

export function getCartVariantDisplayLabel(value: string | null | undefined) {
  const digital = parseDigitalCartVariant(value);
  if (!digital) {
    return value?.trim() || "Default option";
  }

  return digital.formats.length > 0
    ? `${digital.license} license - ${digital.formats.join(", ")}`
    : `${digital.license} license`;
}

export function isDigitalOnlyCart<TItem extends { size?: string | null }>(items: TItem[]) {
  return items.length > 0 && items.every((item) => isDigitalCartVariant(item.size));
}
