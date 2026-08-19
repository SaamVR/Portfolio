export type BlogIndexLayout = "magazine" | "grid" | "compact";
export type BlogHomepageWidgetLayout = "featured-grid" | "cards" | "compact" | "carousel";

export type BlogSettings = {
  enabled: boolean;
  indexEyebrow: string;
  indexTitle: string;
  indexDescription: string;
  indexLayout: BlogIndexLayout;
  postsPerPage: number;
  showAuthor: boolean;
  showDate: boolean;
  showReadingTime: boolean;
  showCategory: boolean;
  showTags: boolean;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  homepageWidgetEnabled: boolean;
  homepageWidgetLayout: BlogHomepageWidgetLayout;
  homepageWidgetEyebrow: string;
  homepageWidgetTitle: string;
  homepageWidgetSubtitle: string;
  homepageWidgetLimit: number;
};

export const defaultBlogSettings: BlogSettings = {
  enabled: true,
  indexEyebrow: "Stories & guides",
  indexTitle: "Journal",
  indexDescription: "Buying guides, product education, launch stories, and useful updates from the store.",
  indexLayout: "magazine",
  postsPerPage: 12,
  showAuthor: true,
  showDate: true,
  showReadingTime: true,
  showCategory: true,
  showTags: true,
  seoTitle: "",
  seoDescription: "",
  ogImage: "",
  homepageWidgetEnabled: false,
  homepageWidgetLayout: "featured-grid",
  homepageWidgetEyebrow: "From the journal",
  homepageWidgetTitle: "Stories worth reading",
  homepageWidgetSubtitle: "Helpful guides, product stories, and updates before you shop.",
  homepageWidgetLimit: 3,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function normalizeBlogSettings(value: unknown): BlogSettings {
  const raw = asRecord(value);
  const indexLayout = raw.indexLayout === "grid" || raw.indexLayout === "compact" || raw.indexLayout === "magazine"
    ? raw.indexLayout
    : defaultBlogSettings.indexLayout;
  const homepageWidgetLayout = raw.homepageWidgetLayout === "cards"
    || raw.homepageWidgetLayout === "compact"
    || raw.homepageWidgetLayout === "carousel"
    || raw.homepageWidgetLayout === "featured-grid"
    ? raw.homepageWidgetLayout
    : defaultBlogSettings.homepageWidgetLayout;

  return {
    enabled: booleanValue(raw.enabled, defaultBlogSettings.enabled),
    indexEyebrow: stringValue(raw.indexEyebrow, defaultBlogSettings.indexEyebrow),
    indexTitle: stringValue(raw.indexTitle, defaultBlogSettings.indexTitle),
    indexDescription: stringValue(raw.indexDescription, defaultBlogSettings.indexDescription),
    indexLayout,
    postsPerPage: numberValue(raw.postsPerPage, defaultBlogSettings.postsPerPage, 3, 48),
    showAuthor: booleanValue(raw.showAuthor, defaultBlogSettings.showAuthor),
    showDate: booleanValue(raw.showDate, defaultBlogSettings.showDate),
    showReadingTime: booleanValue(raw.showReadingTime, defaultBlogSettings.showReadingTime),
    showCategory: booleanValue(raw.showCategory, defaultBlogSettings.showCategory),
    showTags: booleanValue(raw.showTags, defaultBlogSettings.showTags),
    seoTitle: stringValue(raw.seoTitle, defaultBlogSettings.seoTitle),
    seoDescription: stringValue(raw.seoDescription, defaultBlogSettings.seoDescription),
    ogImage: stringValue(raw.ogImage, defaultBlogSettings.ogImage),
    homepageWidgetEnabled: booleanValue(raw.homepageWidgetEnabled, defaultBlogSettings.homepageWidgetEnabled),
    homepageWidgetLayout,
    homepageWidgetEyebrow: stringValue(raw.homepageWidgetEyebrow, defaultBlogSettings.homepageWidgetEyebrow),
    homepageWidgetTitle: stringValue(raw.homepageWidgetTitle, defaultBlogSettings.homepageWidgetTitle),
    homepageWidgetSubtitle: stringValue(raw.homepageWidgetSubtitle, defaultBlogSettings.homepageWidgetSubtitle),
    homepageWidgetLimit: numberValue(raw.homepageWidgetLimit, defaultBlogSettings.homepageWidgetLimit, 2, 8),
  };
}

export function getStoreBlogSettings(store?: { siteSettings?: Record<string, unknown> | null } | null) {
  return normalizeBlogSettings(store?.siteSettings?.blog);
}
