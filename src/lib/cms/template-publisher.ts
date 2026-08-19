import type { Store, StorePageBlock, StoreTheme } from "./schema";
import type { ThemeExportBundle } from "./theme-export-import";

export type TemplateSafetySeverity = "warning" | "blocker";

export type TemplateSafetyFinding = {
  severity: TemplateSafetySeverity;
  code: string;
  message: string;
  path: string;
};

export type TemplateSafetyStatus = "passed" | "failed";

export interface SerializedTemplate {
  schemaVersion: number;
  metadata: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    previewImage?: string;
  };
  theme: StoreTheme;
  pages: ThemeExportBundle["pages"];
  safetyStatus: TemplateSafetyStatus;
  safetyFindings: TemplateSafetyFinding[];
}

export type MarketplaceTemplateReview = {
  bundle: ThemeExportBundle;
  safetyStatus: TemplateSafetyStatus;
  safetyFindings: TemplateSafetyFinding[];
};

const TEMPLATE_SCHEMA_VERSION = 2;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?88)?01[3-9]\d{8}|\+?\d[\d\s().-]{8,}\d/;
const PAYMENT_PATTERN = /\b(?:bkash|bKash|nagad|rocket|trx|transaction|merchant\s*id|payment\s*id)\b/i;
const TRACKING_PATTERN = /\b(?:gtag|fbq|pixel|google-analytics|googletagmanager|facebook\.com\/tr|clarity\.ms)\b/i;
const CUSTOM_CODE_PATTERN = /<\s*script|javascript:|onerror\s*=|onload\s*=|<\s*iframe/i;
const MERCHANT_ASSET_PATTERN = /\b(?:merchant-assets|private-merchant-bucket|marketplace-covers|cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?stores?\/|supabase\.co\/storage\/v1\/object\/(?:sign|private))\b/i;

function makeTemplateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `template-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function addFinding(findings: TemplateSafetyFinding[], finding: TemplateSafetyFinding) {
  findings.push(finding);
}

function scanString(value: string, path: string, findings: TemplateSafetyFinding[]) {
  if (EMAIL_PATTERN.test(value)) {
    addFinding(findings, {
      severity: "blocker",
      code: "email_detected",
      message: "Removed or replaced text that looked like an email address.",
      path,
    });
  }

  if (PHONE_PATTERN.test(value)) {
    addFinding(findings, {
      severity: "blocker",
      code: "phone_detected",
      message: "Removed or replaced text that looked like a phone number.",
      path,
    });
  }

  if (PAYMENT_PATTERN.test(value)) {
    addFinding(findings, {
      severity: "blocker",
      code: "payment_identifier_detected",
      message: "Removed or replaced text that looked like payment or transaction data.",
      path,
    });
  }

  if (TRACKING_PATTERN.test(value)) {
    addFinding(findings, {
      severity: "blocker",
      code: "tracking_pixel_detected",
      message: "Removed custom tracking or pixel-like content.",
      path,
    });
  }

  if (CUSTOM_CODE_PATTERN.test(value)) {
    addFinding(findings, {
      severity: "blocker",
      code: "custom_code_detected",
      message: "Removed unsafe custom code from the public template.",
      path,
    });
  }
}

function sanitizeText(value: unknown, fallback: string, path: string, findings: TemplateSafetyFinding[]) {
  if (typeof value !== "string") return fallback;
  scanString(value, path, findings);
  if (
    EMAIL_PATTERN.test(value)
    || PHONE_PATTERN.test(value)
    || PAYMENT_PATTERN.test(value)
    || TRACKING_PATTERN.test(value)
    || CUSTOM_CODE_PATTERN.test(value)
  ) {
    return fallback;
  }
  return value;
}

function sanitizeUrl(value: unknown, path: string, findings: TemplateSafetyFinding[]) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (EMAIL_PATTERN.test(value)) {
    addFinding(findings, {
      severity: "blocker",
      code: "email_detected",
      message: "Removed or replaced text that looked like an email address.",
      path,
    });
  }
  if (EMAIL_PATTERN.test(value) || MERCHANT_ASSET_PATTERN.test(value) || TRACKING_PATTERN.test(value) || CUSTOM_CODE_PATTERN.test(value)) {
    addFinding(findings, {
      severity: "blocker",
      code: "unsafe_url_detected",
      message: "Removed a merchant-specific, private, or tracking URL.",
      path,
    });
    return undefined;
  }
  return value;
}

function sanitizeUnknown(value: unknown, fallback: unknown, path: string, findings: TemplateSafetyFinding[]): unknown {
  if (typeof value === "string") return sanitizeText(value, String(fallback ?? ""), path, findings);
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeUnknown(item, Array.isArray(fallback) ? fallback[0] : undefined, `${path}[${index}]`, findings));
  }
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      sanitized[key] = sanitizeUnknown(item, undefined, `${path}.${key}`, findings);
    }
    return sanitized;
  }
  return value ?? fallback;
}

function sanitizeTheme(theme: StoreTheme): StoreTheme {
  return {
    presetId: theme.presetId,
    mode: theme.mode,
    headingFont: theme.headingFont,
    bodyFont: theme.bodyFont,
    borderRadius: theme.borderRadius,
    radiusScale: theme.radiusScale,
    densityScale: theme.densityScale,
    aesthetic: theme.aesthetic,
    effects: theme.effects ? { ...theme.effects } : undefined,
    paletteSource: theme.paletteSource,
    paletteSeed: theme.paletteSeed,
    customCssVars: { ...theme.customCssVars },
    customCss: undefined,
    schemaVersion: theme.schemaVersion || TEMPLATE_SCHEMA_VERSION,
  };
}

function sanitizeBlock(block: StorePageBlock, blockIndex: number, findings: TemplateSafetyFinding[]): StorePageBlock {
  const allowedProps = [
    "title", "subtitle", "tagline", "highlight", "eyebrow", "body", "ctaText", "ctaLink",
    "secondaryCtaText", "secondaryCtaLink", "anchorId", "endDate", "badgeText",
    "bgGradient", "bgStyle", "textAlignment", "paddingSize", "align",
    "overlayColor", "overlayOpacity", "cardOpacity", "limit", "mediaFit",
    "enableGlow", "enableParticles", "enableOrbs",
    "faqs", "badges", "reviews", "mediaType", "source", "category", "productType", "specLabels",
    "imageAlt", "imagePosition", "focalX", "focalY",
  ];
  const sourceProps = block.props as Record<string, unknown>;
  const sanitizedProps: Record<string, unknown> = {};
  const basePath = `pages[].blocks[${blockIndex}]`;

  for (const key of allowedProps) {
    if (key in sourceProps) {
      sanitizedProps[key] = sanitizeUnknown(sourceProps[key], undefined, `${basePath}.props.${key}`, findings);
    }
  }

  const mediaUrl = sanitizeUrl(sourceProps.mediaUrl, `${basePath}.props.mediaUrl`, findings);
  const imageUrl = sanitizeUrl(sourceProps.imageUrl, `${basePath}.props.imageUrl`, findings);
  const videoUrl = sanitizeUrl(sourceProps.videoUrl, `${basePath}.props.videoUrl`, findings);
  if (mediaUrl) sanitizedProps.mediaUrl = mediaUrl;
  if (imageUrl) sanitizedProps.imageUrl = imageUrl;
  if (videoUrl) sanitizedProps.videoUrl = videoUrl;
  if (Array.isArray(sourceProps.images)) {
    sanitizedProps.images = sourceProps.images
      .map((url, index) => sanitizeUrl(url, `${basePath}.props.images[${index}]`, findings))
      .filter(Boolean);
  }

  if (block.customHtml || block.customCss) {
    addFinding(findings, {
      severity: "blocker",
      code: "block_custom_code_stripped",
      message: "Removed block-level custom HTML/CSS before marketplace review.",
      path: basePath,
    });
  }

  return {
    id: makeTemplateId(),
    type: block.type,
    sortOrder: block.sortOrder,
    isVisible: block.isVisible !== false,
    entranceAnimation: block.entranceAnimation,
    hoverEffect: block.hoverEffect,
    effectOverride: block.effectOverride,
    layoutVariant: block.layoutVariant,
    props: sanitizedProps,
  } as StorePageBlock;
}

export function buildMarketplaceTemplateReview(store: Store): MarketplaceTemplateReview {
  const safetyFindings: TemplateSafetyFinding[] = [];
  const sanitizedPages = store.pages.map((page, pageIndex) => ({
    id: makeTemplateId(),
    slug: pageIndex === 0 ? "/" : sanitizeText(page.slug, `/page-${pageIndex + 1}`, `pages[${pageIndex}].slug`, safetyFindings),
    title: sanitizeText(page.title, pageIndex === 0 ? "Home" : `Page ${pageIndex + 1}`, `pages[${pageIndex}].title`, safetyFindings),
    seoTitle: sanitizeText(page.seoTitle, "", `pages[${pageIndex}].seoTitle`, safetyFindings),
    seoDescription: sanitizeText(page.seoDescription, "", `pages[${pageIndex}].seoDescription`, safetyFindings),
    isHomepage: page.isHomepage || pageIndex === 0,
    blocks: page.blocks.map((block, blockIndex) => sanitizeBlock(block, blockIndex, safetyFindings)),
  }));

  const safetyStatus: TemplateSafetyStatus = safetyFindings.some((finding) => finding.severity === "blocker") ? "failed" : "passed";

  return {
    safetyStatus,
    safetyFindings,
    bundle: {
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
      type: "theme-and-layout",
      theme: sanitizeTheme(store.theme),
      pages: sanitizedPages,
    },
  };
}

export function publishStoreAsTemplate(
  store: Store,
  templateMetadata: SerializedTemplate["metadata"],
): SerializedTemplate {
  const review = buildMarketplaceTemplateReview(store);
  return {
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    metadata: templateMetadata,
    theme: review.bundle.theme,
    pages: review.bundle.pages,
    safetyStatus: review.safetyStatus,
    safetyFindings: review.safetyFindings,
  };
}
