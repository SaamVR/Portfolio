import type {
  StorefrontVariantOptionValueMap,
  StorefrontVariantOptions,
} from "@/lib/cms/storefront-platform/variants/variant-option-contract";

export type SectionAlignmentPresentation = {
  textClassName: string;
  itemsClassName: string;
  marginClassName: string;
  justifyClassName: string;
};

export type SectionEmphasisPresentation = {
  titleClassName: string;
  copyClassName: string;
};

const EMPTY_ALIGNMENT: SectionAlignmentPresentation = {
  textClassName: "",
  itemsClassName: "",
  marginClassName: "",
  justifyClassName: "",
};

const EMPTY_EMPHASIS: SectionEmphasisPresentation = {
  titleClassName: "",
  copyClassName: "",
};
export function resolveSectionAlignment(
  value: StorefrontVariantOptionValueMap["alignment"] | undefined,
): SectionAlignmentPresentation {
  if (value === "left") return { textClassName: "text-left", itemsClassName: "items-start", marginClassName: "mr-auto", justifyClassName: "justify-start" };
  if (value === "center") return { textClassName: "text-center", itemsClassName: "items-center", marginClassName: "mx-auto", justifyClassName: "justify-center" };
  if (value === "right") return { textClassName: "text-right", itemsClassName: "items-end", marginClassName: "ml-auto", justifyClassName: "justify-end" };
  return EMPTY_ALIGNMENT;
}

export function resolveSectionWidth(
  value: StorefrontVariantOptionValueMap["contentWidth"] | undefined,
): string {
  if (value === "narrow") return "max-w-3xl";
  if (value === "standard") return "max-w-6xl";
  if (value === "wide") return "max-w-[1500px]";
  return "";
}

export function resolveSectionSpacing(
  value: StorefrontVariantOptionValueMap["spacing"] | undefined,
): string {
  if (value === "tight") return "py-6 sm:py-6 md:py-8 lg:py-8";
  if (value === "compact") return "py-8 sm:py-8 md:py-12 lg:py-12";
  if (value === "comfortable") return "py-12 sm:py-12 md:py-20 lg:py-20";
  if (value === "airy") return "py-16 sm:py-16 md:py-28 lg:py-28";
  return "";
}

export function resolveSectionMediaFit(
  value: StorefrontVariantOptionValueMap["mediaFit"] | undefined,
): string {
  if (value === "cover") return "object-cover";
  if (value === "contain") return "object-contain";
  return "";
}

export function resolveSectionEmphasis(
  value: StorefrontVariantOptionValueMap["emphasis"] | undefined,
): SectionEmphasisPresentation {
  if (value === "quiet") return { titleClassName: "font-medium", copyClassName: "opacity-80" };
  if (value === "strong") return { titleClassName: "font-black", copyClassName: "font-medium" };
  if (value === "balanced") return EMPTY_EMPHASIS;
  return EMPTY_EMPHASIS;
}

export function resolveSectionMobileBehavior(
  value: StorefrontVariantOptionValueMap["mobileBehavior"] | undefined,
) {
  return {
    mode: value ?? null,
    isStack: value === "stack",
    isScroll: value === "scroll",
    isCompact: value === "compact",
  } as const;
}

export function resolveSectionOptionClasses(options: StorefrontVariantOptions | undefined) {
  return {
    alignment: resolveSectionAlignment(options?.alignment),
    contentWidthClassName: resolveSectionWidth(options?.contentWidth),
    mediaFitClassName: resolveSectionMediaFit(options?.mediaFit),
    emphasis: resolveSectionEmphasis(options?.emphasis),
    spacingClassName: resolveSectionSpacing(options?.spacing),
    mobile: resolveSectionMobileBehavior(options?.mobileBehavior),
  };
}
