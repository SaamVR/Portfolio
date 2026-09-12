import type { StorePageBlock } from "@/lib/cms/schema";

export type StorefrontEditorQualityIssue = {
  id: string;
  severity: "warning" | "info";
  title: string;
  detail: string;
};

const MEDIA_FIELDS = ["mediaUrl", "imageUrl", "videoUrl"] as const;
const PRIMARY_ACTION_FIELDS = ["ctaText", "buttonText", "primaryCtaText"] as const;

function stringProp(props: Record<string, unknown>, key: string) {
  const value = props[key];
  return typeof value === "string" ? value.trim() : "";
}

export function getStorefrontEditorQualityIssues(block: StorePageBlock): StorefrontEditorQualityIssue[] {
  const props = (block.props ?? {}) as Record<string, unknown>;
  const issues: StorefrontEditorQualityIssue[] = [];

  const needsPrimaryMedia = block.type === "hero" || (block.type === "rich-text" && block.layoutVariant === "brand-story");
  if (needsPrimaryMedia && !MEDIA_FIELDS.some((field) => stringProp(props, field))) {
    issues.push({
      id: "missing-mobile-media",
      severity: "warning",
      title: "Add mobile-ready media",
      detail: "This layout depends on imagery, but no primary media is configured. Add an image so the section does not collapse into a text-only fallback on phones.",
    });
  }

  const actionCapable = block.type === "hero" || block.type === "promo-banner";
  if (actionCapable && !PRIMARY_ACTION_FIELDS.some((field) => stringProp(props, field))) {
    issues.push({
      id: "missing-primary-action",
      severity: "info",
      title: "Primary action is missing",
      detail: "Consider one clear action for mobile shoppers so the section has an obvious next step.",
    });
  }

  const imageList = Array.isArray(props.images) ? props.images : [];
  if (imageList.length > 8) {
    issues.push({
      id: "heavy-media-list",
      severity: "warning",
      title: "Potentially heavy mobile section",
      detail: `This section currently references ${imageList.length} images. Consider a shorter first-load set for mobile shoppers.`,
    });
  }

  const limit = typeof props.limit === "number" ? props.limit : Number(props.limit);
  if ((block.type === "featured-products" || block.type === "category-showcase") && Number.isFinite(limit) && limit > 12) {
    issues.push({
      id: "heavy-item-limit",
      severity: "info",
      title: "High mobile item count",
      detail: `The section is configured for ${limit} items. A smaller initial set can reduce mobile scanning and rendering cost.`,
    });
  }

  return issues;
}
