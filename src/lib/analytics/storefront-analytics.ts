export type AnalyticsEventName =
  | "page_view"
  | "view_item"
  | "quick_view_open"
  | "search"
  | "tag_click"
  | "search_result_click"
  | "filter_used"
  | "sort_changed"
  | "add_to_cart"
  | "remove_from_cart"
  | "cart_quantity_changed"
  | "clear_cart"
  | "view_cart"
  | "begin_checkout"
  | "purchase"
  | "track_order_search"
  | "track_order_result"
  | "add_to_wishlist"
  | "remove_from_wishlist";

export type AnalyticsSettings = {
  firstPartyEnabled?: boolean;
  ga4Enabled?: boolean;
  ga4MeasurementId?: string;
  metaPixelEnabled?: boolean;
  metaPixelId?: string;
  trackPageViews?: boolean;
  trackSearches?: boolean;
  trackCart?: boolean;
  trackWishlist?: boolean;
  trackCheckout?: boolean;
  trackTrafficSources?: boolean;
};

export type AnalyticsAttribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

export type StorefrontAnalyticsEvent = {
  eventName: AnalyticsEventName;
  eventCategory?: string;
  pagePath?: string;
  pageType?: string;
  referrer?: string;
  searchQuery?: string;
  productId?: string;
  orderId?: string;
  orderNumber?: string;
  quantity?: number;
  value?: number;
  currencyCode?: string;
  skipFirstParty?: boolean;
  metadata?: Record<string, unknown>;
};

export const analyticsSettingsKey = "analytics_tracking";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeMeasurementId(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toUpperCase();
  return /^G-[A-Z0-9]+$/.test(trimmed) ? trimmed : "";
}

export function sanitizeMetaPixelId(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^\d{8,20}$/.test(trimmed) ? trimmed : "";
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function normalizeAnalyticsSettings(value: unknown): AnalyticsSettings {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    firstPartyEnabled: record.firstPartyEnabled !== false,
    ga4Enabled: record.ga4Enabled === true,
    ga4MeasurementId: sanitizeMeasurementId(record.ga4MeasurementId),
    metaPixelEnabled: record.metaPixelEnabled === true,
    metaPixelId: sanitizeMetaPixelId(record.metaPixelId),
    trackPageViews: record.trackPageViews !== false,
    trackSearches: record.trackSearches !== false,
    trackCart: record.trackCart !== false,
    trackWishlist: record.trackWishlist !== false,
    trackCheckout: record.trackCheckout !== false,
    trackTrafficSources: record.trackTrafficSources !== false,
  };
}

export function inferPageType(pathname: string) {
  if (pathname.includes("/product/")) return "product";
  if (pathname.endsWith("/shop")) return "shop";
  if (pathname.endsWith("/cart")) return "cart";
  if (pathname.endsWith("/checkout")) return "checkout";
  if (pathname.includes("/order-success")) return "order_success";
  if (pathname.endsWith("/track-order")) return "track_order";
  if (pathname.endsWith("/wishlist")) return "wishlist";
  if (pathname.endsWith("/account")) return "account";
  if (pathname.endsWith("/contact")) return "contact";
  if (pathname.endsWith("/about")) return "about";
  if (pathname.endsWith("/faq")) return "faq";
  return "page";
}

function normalizeReferrer(referrer: string, currentHostname: string) {
  if (!referrer) return "";
  try {
    const url = new URL(referrer);
    if (url.hostname === currentHostname) return "";
    return referrer;
  } catch {
    return referrer;
  }
}

export function extractAttribution(
  searchParams: URLSearchParams,
  referrer: string,
  currentHostname: string,
): AnalyticsAttribution {
  const utmSource = searchParams.get("utm_source")?.trim();
  const utmMedium = searchParams.get("utm_medium")?.trim();
  const utmCampaign = searchParams.get("utm_campaign")?.trim();
  const utmTerm = searchParams.get("utm_term")?.trim();
  const utmContent = searchParams.get("utm_content")?.trim();

  if (utmSource || utmMedium || utmCampaign || utmTerm || utmContent) {
    return {
      source: utmSource || undefined,
      medium: utmMedium || undefined,
      campaign: utmCampaign || undefined,
      term: utmTerm || undefined,
      content: utmContent || undefined,
    };
  }

  if (searchParams.get("gclid")) {
    return {
      source: "google",
      medium: "cpc",
      campaign: searchParams.get("utm_campaign") ?? undefined,
    };
  }

  if (searchParams.get("fbclid")) {
    return {
      source: "facebook",
      medium: "paid_social",
      campaign: searchParams.get("utm_campaign") ?? undefined,
    };
  }

  const safeReferrer = normalizeReferrer(referrer, currentHostname);
  if (!safeReferrer) {
    return {
      source: "direct",
      medium: "none",
    };
  }

  try {
    const referrerUrl = new URL(safeReferrer);
    return {
      source: referrerUrl.hostname.replace(/^www\./, ""),
      medium: "referral",
    };
  } catch {
    return {
      source: "referral",
      medium: "referral",
    };
  }
}

export function createAnalyticsId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildAnalyticsStorageKey(storeId: string, suffix: string) {
  return `storefront-analytics:${storeId}:${suffix}`;
}

export function mapEventToGa4(event: StorefrontAnalyticsEvent) {
  const params: Record<string, unknown> = {
    page_path: event.pagePath,
    page_type: event.pageType,
    search_term: event.searchQuery,
    currency: event.currencyCode ?? "BDT",
    value: event.value,
    quantity: event.quantity,
    item_id: event.productId,
    transaction_id: event.orderNumber,
    ...event.metadata,
  };

  switch (event.eventName) {
    case "view_item":
    case "add_to_cart":
    case "remove_from_cart":
    case "add_to_wishlist":
      params.items = [{ item_id: event.productId, quantity: event.quantity ?? 1 }];
      break;
    case "purchase":
      params.transaction_id = event.orderNumber;
      params.items = Array.isArray(event.metadata?.items) ? event.metadata?.items : undefined;
      break;
    default:
      break;
  }

  return params;
}

export function mapEventToMeta(event: StorefrontAnalyticsEvent) {
  const payload: Record<string, unknown> = {
    value: event.value,
    currency: event.currencyCode ?? "BDT",
    content_ids: event.productId ? [event.productId] : undefined,
    content_name: typeof event.metadata?.productName === "string" ? event.metadata.productName : undefined,
    search_string: event.searchQuery,
    num_items: event.quantity,
  };

  switch (event.eventName) {
    case "page_view":
      return { event: "PageView", payload: {} };
    case "view_item":
      return { event: "ViewContent", payload };
    case "add_to_cart":
      return { event: "AddToCart", payload };
    case "add_to_wishlist":
      return { event: "AddToWishlist", payload };
    case "begin_checkout":
      return { event: "InitiateCheckout", payload };
    case "purchase":
      return { event: "Purchase", payload };
    case "search":
      return { event: "Search", payload };
    default:
      return null;
  }
}
