import { z } from "zod";

export const STOREFRONT_VARIANT_OPTION_VALUES = {
  alignment: ["left", "center", "right"],
  contentWidth: ["narrow", "standard", "wide"],
  mediaFit: ["cover", "contain"],
  emphasis: ["quiet", "balanced", "strong"],
  spacing: ["tight", "compact", "comfortable", "airy"],
  mobileBehavior: ["stack", "scroll", "compact"],
} as const;

export type StorefrontVariantOptionKey = keyof typeof STOREFRONT_VARIANT_OPTION_VALUES;
export type StorefrontVariantOptionValueMap = {
  [K in StorefrontVariantOptionKey]: (typeof STOREFRONT_VARIANT_OPTION_VALUES)[K][number];
};
export type StorefrontVariantOptions = Partial<StorefrontVariantOptionValueMap>;

export type StorefrontVariantOptionCapability<K extends StorefrontVariantOptionKey = StorefrontVariantOptionKey> = {
  allowedValues: readonly StorefrontVariantOptionValueMap[K][];
  defaultValue?: StorefrontVariantOptionValueMap[K];
  label?: string;
  help?: string;
};
export type StorefrontVariantOptionCapabilities = {
  [K in StorefrontVariantOptionKey]?: StorefrontVariantOptionCapability<K>;
};

export const STOREFRONT_VARIANT_OPTION_CATALOG: {
  [K in StorefrontVariantOptionKey]: {
    label: string;
    help: string;
    values: readonly StorefrontVariantOptionValueMap[K][];
  };
} = {
  alignment: { label: "Alignment", help: "Align section content within the selected style.", values: STOREFRONT_VARIANT_OPTION_VALUES.alignment },
  contentWidth: { label: "Content width", help: "Choose a bounded content width for this section.", values: STOREFRONT_VARIANT_OPTION_VALUES.contentWidth },
  mediaFit: { label: "Media fit", help: "Control whether media fills or fits inside its approved frame.", values: STOREFRONT_VARIANT_OPTION_VALUES.mediaFit },
  emphasis: { label: "Emphasis", help: "Adjust the visual strength of this section without changing content.", values: STOREFRONT_VARIANT_OPTION_VALUES.emphasis },
  spacing: { label: "Section spacing", help: "Override spacing for this section only; global theme spacing is unchanged.", values: STOREFRONT_VARIANT_OPTION_VALUES.spacing },
  mobileBehavior: { label: "Mobile behavior", help: "Choose among approved mobile compositions for this style.", values: STOREFRONT_VARIANT_OPTION_VALUES.mobileBehavior },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeCanonicalVariantOptions(value: unknown): StorefrontVariantOptions | undefined {
  if (!isPlainObject(value)) return undefined;
  const normalized: StorefrontVariantOptions = {};
  for (const key of Object.keys(STOREFRONT_VARIANT_OPTION_VALUES) as StorefrontVariantOptionKey[]) {
    const candidate = value[key];
    const allowed = STOREFRONT_VARIANT_OPTION_VALUES[key] as readonly unknown[];
    if (allowed.includes(candidate)) {
      (normalized as Record<string, unknown>)[key] = candidate;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export const storefrontVariantOptionsSchema = z.preprocess(
  normalizeCanonicalVariantOptions,
  z.object({
    alignment: z.enum(STOREFRONT_VARIANT_OPTION_VALUES.alignment).optional(),
    contentWidth: z.enum(STOREFRONT_VARIANT_OPTION_VALUES.contentWidth).optional(),
    mediaFit: z.enum(STOREFRONT_VARIANT_OPTION_VALUES.mediaFit).optional(),
    emphasis: z.enum(STOREFRONT_VARIANT_OPTION_VALUES.emphasis).optional(),
    spacing: z.enum(STOREFRONT_VARIANT_OPTION_VALUES.spacing).optional(),
    mobileBehavior: z.enum(STOREFRONT_VARIANT_OPTION_VALUES.mobileBehavior).optional(),
  }).optional(),
);
