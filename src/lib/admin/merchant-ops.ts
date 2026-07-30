import { supabase } from "@/integrations/supabase/client";
import { buildPageBuilderPath } from "@/lib/admin-paths";
import { isSubscriptionLive } from "@/lib/billing/plans";

type SiteSettingsRow = {
  key: string;
  value: any;
};

export type MerchantOpsStore = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  custom_domain: string | null;
  is_published: boolean | null;
  currency_code: string | null;
  locale: string | null;
};

export type MerchantOpsOrder = {
  id: string;
  status: string | null;
  total: number | null;
  payment_method?: string | null;
  shipping_city?: string | null;
  created_at: string;
};

export type MerchantOpsSubscription = {
  plan_id: string | null;
  status: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
};

export type MerchantOpsDomain = {
  id: string;
  hostname: string;
  status: string;
  is_primary?: boolean | null;
  verified?: boolean | null;
  misconfigured?: boolean | null;
  last_checked_at?: string | null;
  activated_at?: string | null;
  last_vercel_error?: { message?: string } | null;
};

export type MerchantNotificationEvent = {
  id: string;
  template_name: string | null;
  recipient: string | null;
  channel: string | null;
  status: string | null;
  delivery_status: string | null;
  provider: string | null;
  provider_message_id: string | null;
  error: string | null;
  retry_count: number | null;
  next_retry_at: string | null;
  last_attempt_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  dead_lettered_at: string | null;
  operator_escalated_at: string | null;
  operator_escalation_reason: string | null;
  created_at: string;
};

export type MerchantAnalyticsEvent = {
  event_name: string;
  visitor_id?: string | null;
  session_id?: string | null;
  traffic_source?: string | null;
  search_query?: string | null;
  event_timestamp?: string | null;
};

export type MerchantOpsSnapshot = {
  store: MerchantOpsStore | null;
  products: Array<{ id: string; stock: number | null; featured: boolean | null }>;
  orders: MerchantOpsOrder[];
  pages: Array<{ id: string; slug: string; is_homepage: boolean | null }>;
  blocks: Array<{ page_id: string; is_visible: boolean | null }>;
  settings: Record<string, any>;
  subscription: MerchantOpsSubscription | null;
  analyticsEvents: MerchantAnalyticsEvent[];
  notificationEvents: MerchantNotificationEvent[];
  domains: MerchantOpsDomain[];
  unreadMessages: number;
  pendingReviews: number;
};

export type LaunchChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  severity: "blocked" | "warning";
  points: number;
  action: string;
  href: string;
  detail?: string;
};

export type LaunchReadinessSummary = {
  score: number;
  blockers: LaunchChecklistItem[];
  warnings: LaunchChecklistItem[];
  completed: LaunchChecklistItem[];
  homepageVisibleBlocks: number;
  customPageCount: number;
};

export type DiagnosticsCard = {
  id: string;
  label: string;
  tone: "healthy" | "warning" | "failing";
  summary: string;
  detail: string;
  href: string;
};

const SETTINGS_KEYS = [
  "payment_settings",
  "delivery_settings",
  "whatsapp_support",
  "contact_page",
  "notification_settings",
] as const;

function readObject(value: unknown) {
  return typeof value === "object" && value !== null ? value as Record<string, any> : {};
}

export function summarizeDomainIssue(message?: string | null, hostname?: string | null) {
  const safeHost = hostname?.trim() || "This domain";
  const normalized = message?.trim() || "";

  if (!normalized) {
    return `${safeHost} still needs DNS or SSL verification before it can replace the platform storefront link.`;
  }

  if (/vercel|project domain not found|changed env vars recently/i.test(normalized)) {
    return `${safeHost} still needs a fresh DNS and hostname check. Keep the platform storefront link live, recheck the DNS records, and try the domain check again.`;
  }

  return normalized;
}

export function normalizeNotificationSettings(value: unknown) {
  const settings = readObject(value);
  return {
    emailReceipts: settings.email_receipts ?? true,
    emailAlerts: settings.email_alerts ?? true,
    smsEnabled: settings.sms_enabled ?? false,
    smsTemplateReceived: typeof settings.sms_template_received === "string" ? settings.sms_template_received : "",
    smsTemplateShipped: typeof settings.sms_template_shipped === "string" ? settings.sms_template_shipped : "",
  };
}

export function isPaymentConfigured(value: unknown) {
  const settings = readObject(value);
  return Boolean(
    settings.cod_enabled ||
    settings.bkash_enabled ||
    settings.nagad_enabled ||
    settings.bkash_number ||
    settings.nagad_number ||
    settings.bkash_gateway_enabled,
  );
}

export function isContactConfigured(whatsappValue: unknown, contactValue: unknown) {
  const whatsapp = readObject(whatsappValue);
  const contact = readObject(contactValue);
  return Boolean(
    (whatsapp.enabled && whatsapp.number) ||
    contact.phone ||
    contact.email ||
    contact.address,
  );
}

export function getHomepageVisibleBlocks(snapshot: MerchantOpsSnapshot) {
  const homepage = snapshot.pages.find((page) => page.is_homepage || page.slug === "/");
  return snapshot.blocks.filter((block) => block.page_id === homepage?.id && block.is_visible !== false).length;
}

export function getCustomPageCount(snapshot: MerchantOpsSnapshot) {
  return snapshot.pages.filter((page) => !page.is_homepage && page.slug !== "/").length;
}

export function buildLaunchReadinessSummary(snapshot: MerchantOpsSnapshot): LaunchReadinessSummary {
  const notificationSettings = normalizeNotificationSettings(snapshot.settings.notification_settings);
  const paymentConfigured = isPaymentConfigured(snapshot.settings.payment_settings);
  const contactConfigured = isContactConfigured(snapshot.settings.whatsapp_support, snapshot.settings.contact_page);
  const homepageVisibleBlocks = getHomepageVisibleBlocks(snapshot);
  const customPageCount = getCustomPageCount(snapshot);
  const healthySubscription = !snapshot.subscription || isSubscriptionLive(snapshot.subscription);
  const hasRecentSentNotification = snapshot.notificationEvents.some((event) => event.status === "sent");
  const hasActiveCustomDomain = snapshot.domains.some((domain) => domain.status === "active" && domain.verified !== false && domain.misconfigured !== true);

  const items: LaunchChecklistItem[] = [
    {
      id: "published",
      label: "Storefront is published",
      done: Boolean(snapshot.store?.is_published),
      severity: "blocked",
      points: 15,
      action: "Publish the storefront only after the final preview looks trustworthy.",
      href: "/admin/onboarding",
    },
    {
      id: "store-copy",
      label: "Store description is ready",
      done: (snapshot.store?.description ?? "").trim().length >= 40,
      severity: "warning",
      points: 10,
      action: "Write a clearer store summary for trust, SEO, and first impressions.",
      href: "/admin/onboarding",
    },
    {
      id: "branding",
      label: "Branding assets are present",
      done: Boolean(snapshot.store?.logo_url),
      severity: "warning",
      points: 10,
      action: "Upload the logo so the storefront and receipts feel complete.",
      href: "/admin/site-settings",
    },
    {
      id: "catalog",
      label: "At least one product or offer is live",
      done: snapshot.products.length >= 1,
      severity: "blocked",
      points: 15,
      action: "Add the first product, service, or shoppable offer before launch.",
      href: "/admin/products?action=add",
    },
    {
      id: "homepage",
      label: "Homepage has enough visible sections",
      done: homepageVisibleBlocks >= 3,
      severity: "warning",
      points: 10,
      action: "Add or unhide a few more homepage sections so shoppers get enough context.",
      href: buildPageBuilderPath("basic"),
      detail: `${homepageVisibleBlocks} visible section${homepageVisibleBlocks === 1 ? "" : "s"} found.`,
    },
    {
      id: "information-pages",
      label: "At least one support or policy page exists",
      done: customPageCount >= 1,
      severity: "warning",
      points: 10,
      action: "Create an About, Contact, FAQ, Return, or Policy page.",
      href: buildPageBuilderPath("advanced"),
      detail: `${customPageCount} custom page${customPageCount === 1 ? "" : "s"} found.`,
    },
    {
      id: "checkout-path",
      label: "Ordering path is configured",
      done: paymentConfigured || contactConfigured,
      severity: "blocked",
      points: 10,
      action: "Configure payments or a clear contact/inquiry path so visitors know how to buy.",
      href: "/admin/site-settings?tab=payment",
    },
    {
      id: "payment",
      label: "Payment methods are configured",
      done: paymentConfigured,
      severity: "warning",
      points: 10,
      action: "Enable COD or digital payment methods before you drive serious traffic.",
      href: "/admin/site-settings?tab=payment",
    },
    {
      id: "contact",
      label: "Support contact is configured",
      done: contactConfigured,
      severity: "warning",
      points: 10,
      action: "Add WhatsApp, phone, email, or address so shoppers can reach the store.",
      href: "/admin/site-settings?tab=contact",
    },
    {
      id: "billing",
      label: "Billing / entitlement state is healthy",
      done: healthySubscription,
      severity: "blocked",
      points: 10,
      action: "Resolve the current billing state before relying on paid features.",
      href: "/admin/billing",
      detail: snapshot.subscription?.status ? `Current status: ${snapshot.subscription.status}.` : "No blocking subscription issue detected.",
    },
    {
      id: "notifications",
      label: "Notifications are configured",
      done: notificationSettings.emailReceipts || notificationSettings.emailAlerts || notificationSettings.smsEnabled,
      severity: "warning",
      points: 5,
      action: "Turn on receipts, merchant alerts, or SMS notifications for operational visibility.",
      href: "/admin/site-settings?tab=notifications",
    },
    {
      id: "notification-health",
      label: "Recent notification delivery looks healthy",
      done: snapshot.notificationEvents.length === 0 || hasRecentSentNotification,
      severity: "warning",
      points: 5,
      action: "Review failed deliveries so launch-day alerts do not go missing.",
      href: "/admin/notifications",
    },
    {
      id: "domain",
      label: "Store has a clear launch URL",
      done: Boolean(snapshot.store?.slug),
      severity: "blocked",
      points: 5,
      action: "Make sure the store keeps its platform subdomain or a verified custom domain.",
      href: "/admin/diagnostics",
      detail: hasActiveCustomDomain ? "Custom domain is active." : "Platform subdomain remains the fallback launch URL.",
    },
  ];

  return {
    score: items.reduce((sum, item) => sum + (item.done ? item.points : 0), 0),
    blockers: items.filter((item) => !item.done && item.severity === "blocked"),
    warnings: items.filter((item) => !item.done && item.severity === "warning"),
    completed: items.filter((item) => item.done),
    homepageVisibleBlocks,
    customPageCount,
  };
}

export function buildNotificationHealthSummary(events: MerchantNotificationEvent[]) {
  const successfulStatuses = new Set(["sent", "delivered"]);
  const failureStatuses = new Set(["failed", "bounced", "dead_letter"]);
  const queueStatuses = new Set(["queued", "retrying"]);
  const sent = events.filter((event) => event.status && successfulStatuses.has(event.status)).length;
  const failed = events.filter((event) => event.status && failureStatuses.has(event.status)).length;
  const pending = events.filter((event) => event.status && queueStatuses.has(event.status)).length;
  const delivered = events.filter((event) => event.status === "delivered" || event.delivery_status === "delivered").length;
  const bounced = events.filter((event) => event.status === "bounced" || event.delivery_status === "bounced").length;
  const deadLetters = events.filter((event) => event.status === "dead_letter").length;
  const queuedForRetry = events.filter((event) => event.status === "retrying" && event.next_retry_at).length;
  const escalated = events.filter((event) => event.operator_escalated_at).length;
  const lastSuccess = events.find((event) => event.status && successfulStatuses.has(event.status)) ?? null;
  const lastFailure = events.find((event) => event.status && failureStatuses.has(event.status)) ?? null;

  return {
    total: events.length,
    sent,
    failed,
    pending,
    delivered,
    bounced,
    deadLetters,
    queuedForRetry,
    escalated,
    lastSuccess,
    lastFailure,
    successRate: events.length > 0 ? sent / events.length : 0,
  };
}

export function buildDiagnosticsCards(snapshot: MerchantOpsSnapshot): DiagnosticsCard[] {
  const paymentConfigured = isPaymentConfigured(snapshot.settings.payment_settings);
  const contactConfigured = isContactConfigured(snapshot.settings.whatsapp_support, snapshot.settings.contact_page);
  const notificationSettings = normalizeNotificationSettings(snapshot.settings.notification_settings);
  const notificationHealth = buildNotificationHealthSummary(snapshot.notificationEvents);
  const deliverySettings = readObject(snapshot.settings.delivery_settings);
  const activeDomain = snapshot.domains.find((domain) => domain.status === "active" && domain.verified !== false && domain.misconfigured !== true) ?? null;
  const misconfiguredDomain = snapshot.domains.find((domain) => domain.misconfigured || domain.status === "misconfigured") ?? null;
  const pendingOrders = snapshot.orders.filter((order) => ["pending", "pending_payment", "processing"].includes(order.status ?? "")).length;
  const healthySubscription = !snapshot.subscription || isSubscriptionLive(snapshot.subscription);
  const cityCounts = new Map<string, number>();

  snapshot.orders.forEach((order) => {
    const city = typeof order.shipping_city === "string" ? order.shipping_city.trim() : "";
    if (!city) return;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  });

  const distinctCities = cityCounts.size;
  const topCityEntry = [...cityCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
  const deliveryEnabled = Boolean(deliverySettings.enabled);

  return [
    {
      id: "domain",
      label: "Domain",
      tone: misconfiguredDomain ? "failing" : activeDomain || snapshot.store?.slug ? "healthy" : "warning",
      summary: misconfiguredDomain
        ? "Custom domain still needs DNS or verification fixes."
        : activeDomain
          ? `${activeDomain.hostname} is active.`
          : snapshot.store?.slug
            ? "Platform subdomain is still the active fallback."
            : "Store URL is incomplete.",
      detail: misconfiguredDomain
        ? summarizeDomainIssue(misconfiguredDomain.last_vercel_error?.message, misconfiguredDomain.hostname)
        : (activeDomain ? "Traffic can keep using the active host." : "Keep the platform subdomain live until the custom domain is fully active."),
      href: "/admin/diagnostics",
    },
    {
      id: "billing",
      label: "Billing & entitlement",
      tone: healthySubscription ? "healthy" : "failing",
      summary: healthySubscription
        ? "No blocking billing issue detected."
        : `Subscription is currently ${snapshot.subscription?.status ?? "unhealthy"}.`,
      detail: healthySubscription
        ? "Paid features should remain available according to the current subscription state."
        : "Resolve billing before depending on restricted package features.",
      href: "/admin/billing",
    },
    {
      id: "payments",
      label: "Payments",
      tone: paymentConfigured ? "healthy" : contactConfigured ? "warning" : "failing",
      summary: paymentConfigured
        ? "Checkout methods are configured."
        : contactConfigured
          ? "Shoppers can still contact the merchant, but checkout setup is thin."
          : "There is no clear buying path configured yet.",
      detail: paymentConfigured
        ? "COD or digital/manual prepaid methods are available."
        : "Review payment methods and delivery expectations before launch.",
      href: "/admin/site-settings?tab=payment",
    },
    {
      id: "notifications",
      label: "Notifications",
      tone: notificationHealth.failed > 0 && notificationHealth.sent === 0
        ? "failing"
        : (notificationSettings.emailReceipts || notificationSettings.emailAlerts || notificationSettings.smsEnabled)
          ? "healthy"
          : "warning",
      summary: notificationHealth.total === 0
        ? "No recent delivery history yet."
        : `${notificationHealth.sent} sent, ${notificationHealth.failed} failed, ${notificationHealth.pending} pending.`,
      detail: notificationHealth.lastFailure?.error
        || (notificationHealth.lastSuccess ? "Recent sends reached recipients successfully." : "Enable receipts or alerts so issues are visible sooner."),
      href: "/admin/notifications",
    },
    {
      id: "operations",
      label: "Operator load",
      tone: pendingOrders > 10 ? "warning" : "healthy",
      summary: pendingOrders > 0
        ? `${pendingOrders} orders still need attention.`
        : "Order queue looks clear right now.",
      detail: snapshot.unreadMessages > 0 || snapshot.pendingReviews > 0
        ? `${snapshot.unreadMessages} unread message${snapshot.unreadMessages === 1 ? "" : "s"} and ${snapshot.pendingReviews} pending review${snapshot.pendingReviews === 1 ? "" : "s"} are still open.`
        : "Messages and review moderation look under control.",
      href: "/admin/orders",
    },
    {
      id: "delivery-footprint",
      label: "Delivery footprint",
      tone: distinctCities > 3 && !deliveryEnabled ? "warning" : distinctCities > 0 ? "healthy" : "warning",
      summary: distinctCities > 0
        ? `${distinctCities} delivery cit${distinctCities === 1 ? "y" : "ies"} seen in recent orders.`
        : "No recent delivery geography yet.",
      detail: topCityEntry
        ? `${topCityEntry[0]} leads recent demand with ${topCityEntry[1]} order${topCityEntry[1] === 1 ? "" : "s"}. ${deliveryEnabled ? "Delivery settings are enabled." : "Delivery settings still need a closer check for multi-city demand."}`
        : deliveryEnabled
          ? "Delivery settings are enabled, but no recent order-city signal is available yet."
          : "Enable and review delivery settings before you push more orders into multiple zones.",
      href: "/admin/site-settings?tab=delivery",
    },
  ];
}

export async function loadMerchantOpsSnapshot(storeId: string): Promise<MerchantOpsSnapshot> {
  const thirtyDaysAgo = new Date(Date.now() - (1000 * 60 * 60 * 24 * 30)).toISOString();
  const [
    { data: store },
    { data: products },
    { data: orders },
    { data: pages },
    { data: blocks },
    { data: siteSettingsRows },
    { data: subscription },
    { data: analyticsEvents },
    { data: notificationEvents },
    { data: domains },
    { count: unreadMessages },
    { count: pendingReviews },
  ] = await Promise.all([
    supabase.from("stores").select("id, name, slug, description, logo_url, custom_domain, is_published, currency_code, locale").eq("id", storeId).maybeSingle(),
    supabase.from("products").select("id, stock, featured").eq("store_id", storeId),
    supabase.from("orders").select("id, status, total, payment_method, shipping_city, created_at").eq("store_id", storeId).order("created_at", { ascending: false }).limit(100),
    supabase.from("store_pages").select("id, slug, is_homepage").eq("store_id", storeId),
    supabase.from("store_page_blocks").select("page_id, is_visible").eq("store_id", storeId),
    supabase.from("site_settings").select("key, value").eq("store_id", storeId).in("key", [...SETTINGS_KEYS]),
    supabase.from("store_subscriptions").select("plan_id, status, trial_ends_at, current_period_ends_at").eq("store_id", storeId).maybeSingle(),
    (supabase as any).from("store_analytics_events").select("event_name, visitor_id, session_id, traffic_source, search_query, event_timestamp").eq("store_id", storeId).gte("event_timestamp", thirtyDaysAgo).order("event_timestamp", { ascending: false }).limit(3000),
    supabase
      .from("email_events")
      .select("id, template_name, recipient, channel, status, delivery_status, provider, provider_message_id, error, retry_count, next_retry_at, last_attempt_at, delivered_at, bounced_at, dead_lettered_at, operator_escalated_at, operator_escalation_reason, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(40),
    (supabase as any)
      .from("store_domains")
      .select(
        "id, hostname, status, is_primary, verified:vercel_verified, misconfigured:vercel_misconfigured, last_checked_at, activated_at, last_vercel_error",
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false }),
    supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("store_id", storeId).eq("is_read", false),
    supabase.from("product_reviews").select("*", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "pending"),
  ]);

  const settings = Object.fromEntries(((siteSettingsRows as SiteSettingsRow[] | null) ?? []).map((row) => [row.key, row.value]));

  return {
    store: (store as MerchantOpsStore | null) ?? null,
    products: (products as Array<{ id: string; stock: number | null; featured: boolean | null }> | null) ?? [],
    orders: (orders as MerchantOpsOrder[] | null) ?? [],
    pages: (pages as Array<{ id: string; slug: string; is_homepage: boolean | null }> | null) ?? [],
    blocks: (blocks as Array<{ page_id: string; is_visible: boolean | null }> | null) ?? [],
    settings,
    subscription: (subscription as MerchantOpsSubscription | null) ?? null,
    analyticsEvents: (analyticsEvents as MerchantAnalyticsEvent[] | null) ?? [],
    notificationEvents: (notificationEvents as MerchantNotificationEvent[] | null) ?? [],
    domains: (domains as MerchantOpsDomain[] | null) ?? [],
    unreadMessages: unreadMessages ?? 0,
    pendingReviews: pendingReviews ?? 0,
  };
}
