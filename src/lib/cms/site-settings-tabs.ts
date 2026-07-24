import {
  supportsDedicatedShopPage,
  supportsLoyaltyAndUpsells,
  supportsTransactionalCheckout,
} from "@/lib/cms/storefront-compat";
import type {
  StoreBusinessFamily,
  StoreCatalogMode,
  StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";

export const mobilePinnedSettingTabs = [
  "brand_seo",
  "themes",
  "payment",
  "delivery",
  "support",
  "contact",
  "page_builder",
] as const;

export type SettingsTabValue =
  | "brand_seo"
  | "home_sections"
  | "hero"
  | "promo"
  | "announcement"
  | "navigation"
  | "themes"
  | "upsells"
  | "payment"
  | "delivery"
  | "loyalty"
  | "support"
  | "about"
  | "faq"
  | "contact"
  | "shop_page"
  | "footer"
  | "domain"
  | "notifications"
  | "page_builder";

export type SettingsTabOption = {
  value: SettingsTabValue;
  label: string;
  category: string;
  keywords: string;
};

type StorefrontSettingsContext = {
  pageLabel: string;
  itemLabelPlural: string;
  itemLabelSingular: string;
  browseVerb: string;
  conversionLabel: string;
  supportSummary: string;
};

type SettingsTabDefinition = {
  value: SettingsTabValue;
  category: string;
  keywords: string;
  legacy?: boolean;
  resolveLabel: (context: StorefrontSettingsContext, templateId: StorefrontTemplateId) => string;
  isVisible?: (
    businessFamily: StoreBusinessFamily,
    catalogMode: StoreCatalogMode,
    templateId: StorefrontTemplateId,
  ) => boolean;
};

export const validSettingTabs = new Set<SettingsTabValue>([
  "brand_seo",
  "home_sections",
  "hero",
  "promo",
  "announcement",
  "navigation",
  "themes",
  "upsells",
  "payment",
  "delivery",
  "loyalty",
  "support",
  "about",
  "faq",
  "contact",
  "shop_page",
  "footer",
  "domain",
  "notifications",
  "page_builder",
]);

export function resolveStorefrontSettingsContext(
  businessFamily: StoreBusinessFamily,
  catalogMode: StoreCatalogMode,
): StorefrontSettingsContext {
  if (businessFamily === "booking") {
    return {
      pageLabel: "Booking Page",
      itemLabelPlural: "services",
      itemLabelSingular: "service",
      browseVerb: "book",
      conversionLabel: "booking requests",
      supportSummary: "Use page copy, contact details, and notifications to guide guests from discovery into booking requests.",
    };
  }

  if (businessFamily === "listing") {
    return {
      pageLabel: "Listing Page",
      itemLabelPlural: "listings",
      itemLabelSingular: "listing",
      browseVerb: "explore",
      conversionLabel: "inquiries",
      supportSummary: "Use page copy, contact details, and notifications to guide visitors into qualified listing inquiries.",
    };
  }

  if (businessFamily === "service") {
    return {
      pageLabel: "Services Page",
      itemLabelPlural: "services",
      itemLabelSingular: "service",
      browseVerb: "explore",
      conversionLabel: "service inquiries",
      supportSummary: "Use page copy, contact details, and notifications to turn visitors into service leads.",
    };
  }

  if (businessFamily === "donation") {
    return {
      pageLabel: "Campaign Page",
      itemLabelPlural: "campaigns",
      itemLabelSingular: "campaign",
      browseVerb: "support",
      conversionLabel: "contributions",
      supportSummary: "Use page copy, contact details, and notifications to build trust and increase contribution intent.",
    };
  }

  switch (catalogMode) {
    case "landing_only":
      return {
        pageLabel: "Landing Page",
        itemLabelPlural: "offers",
        itemLabelSingular: "offer",
        browseVerb: "explore",
        conversionLabel: "direct inquiries",
        supportSummary: "Use page copy, contact details, and WhatsApp-oriented messaging to move visitors into direct inquiries.",
      };
    case "menu":
      return {
        pageLabel: "Menu Page",
        itemLabelPlural: "menu items",
        itemLabelSingular: "menu item",
        browseVerb: "order",
        conversionLabel: "orders",
        supportSummary: "Use menu copy, delivery setup, and notifications to make ordering smoother for guests.",
      };
    case "digital_download":
      return {
        pageLabel: "Downloads Page",
        itemLabelPlural: "downloads",
        itemLabelSingular: "download",
        browseVerb: "download",
        conversionLabel: "digital orders",
        supportSummary: "Use page copy and support details to help shoppers understand digital delivery and trust the checkout flow.",
      };
    case "multi_vendor":
      return {
        pageLabel: "Marketplace Page",
        itemLabelPlural: "products",
        itemLabelSingular: "product",
        browseVerb: "shop",
        conversionLabel: "orders",
        supportSummary: "Use page copy, support details, and notifications to help shoppers navigate a multi-vendor catalog confidently.",
      };
    case "pre_order":
      return {
        pageLabel: "Pre-order Page",
        itemLabelPlural: "pre-order items",
        itemLabelSingular: "pre-order item",
        browseVerb: "reserve",
        conversionLabel: "pre-orders",
        supportSummary: "Use page copy and support details to set delivery expectations and increase reservation confidence.",
      };
    case "inquiry_only":
      return {
        pageLabel: "Inquiry Catalog",
        itemLabelPlural: "products",
        itemLabelSingular: "product",
        browseVerb: "explore",
        conversionLabel: "qualified inquiries",
        supportSummary: "Use page copy, contact details, and notifications to help visitors ask about the right products without a checkout flow.",
      };
    default:
      return {
        pageLabel: "Shop Page",
        itemLabelPlural: "products",
        itemLabelSingular: "product",
        browseVerb: "shop",
        conversionLabel: "orders",
        supportSummary: "Use storefront copy, contact details, and notifications to guide shoppers from browsing into completed orders.",
      };
  }
}

const settingsTabDefinitions: SettingsTabDefinition[] = [
  {
    value: "brand_seo",
    category: "Store Identity",
    keywords: "brand title description seo logo highlight name",
    resolveLabel: () => "Brand & SEO",
  },
  {
    value: "home_sections",
    category: "Legacy Fallbacks",
    keywords: "legacy fallback featured category tagline catalog title homepage migration",
    legacy: true,
    resolveLabel: () => "Fallback Home Sections",
  },
  {
    value: "hero",
    category: "Legacy Fallbacks",
    keywords: "legacy fallback hero background image video media title tagline overlay button cta homepage migration",
    legacy: true,
    resolveLabel: () => "Fallback Hero Fields",
  },
  {
    value: "promo",
    category: "Legacy Fallbacks",
    keywords: "legacy fallback promo discount sale button text color card opacity homepage migration",
    legacy: true,
    resolveLabel: () => "Fallback Promo Fields",
  },
  {
    value: "announcement",
    category: "Store Identity",
    keywords: "announcement rotation text bar color bg message",
    resolveLabel: () => "Announcement Bar",
  },
  {
    value: "navigation",
    category: "Store Identity",
    keywords: "header navbar mobile menu home logo links search account wishlist cart",
    resolveLabel: () => "Navigation",
  },
  {
    value: "themes",
    category: "Design System",
    keywords: "theme colors palette presets font layout border radius container width preset presets typography style styles",
    resolveLabel: () => "Themes Customizer",
  },
  {
    value: "upsells",
    category: "Checkout & Log",
    keywords: "popup count-down upsells discount coupon exit-intent popups modal drawer card",
    resolveLabel: () => "Upsells & Popups",
    isVisible: (businessFamily, catalogMode) => supportsLoyaltyAndUpsells(businessFamily, catalogMode),
  },
  {
    value: "payment",
    category: "Checkout & Log",
    keywords: "payment bkash nagad api cash on delivery prepayment incentive method credentials gateway credentials",
    resolveLabel: () => "Payment Config",
    isVisible: (businessFamily, catalogMode, templateId) =>
      templateId !== "digital-downloads"
      && supportsTransactionalCheckout(businessFamily, catalogMode),
  },
  {
    value: "delivery",
    category: "Checkout & Log",
    keywords: "delivery fee shipping rate primary secondary zone threshold free shipping weight",
    resolveLabel: () => "Delivery Options",
    isVisible: (businessFamily, catalogMode, templateId) =>
      templateId !== "digital-downloads"
      && templateId !== "subscriptions"
      && supportsTransactionalCheckout(businessFamily, catalogMode),
  },
  {
    value: "loyalty",
    category: "Checkout & Log",
    keywords: "loyalty rewards point balance rate cashback checkout signup bonus points reward rewards",
    resolveLabel: () => "Loyalty & Rewards",
    isVisible: (businessFamily, catalogMode) => supportsLoyaltyAndUpsells(businessFamily, catalogMode),
  },
  {
    value: "support",
    category: "Information",
    keywords: "support whatsapp help phone message number contact support support number helpline",
    resolveLabel: () => "Support & WhatsApp",
  },
  {
    value: "about",
    category: "Information",
    keywords: "about us page text details description history values story team",
    resolveLabel: () => "About Page",
  },
  {
    value: "faq",
    category: "Information",
    keywords: "faq questions answers return refund policy returns exchange queries shipping returns policy policy policies",
    resolveLabel: () => "FAQ & Return Policy",
  },
  {
    value: "contact",
    category: "Information",
    keywords: "contact email form submit queries address office hours contact page map location",
    resolveLabel: (context) =>
      context.conversionLabel === "orders" ? "Contact Inquiries" : "Leads & Contact",
  },
  {
    value: "shop_page",
    category: "Storefront",
    keywords: "catalog listing search filters shop title description empty state size guide store page",
    resolveLabel: (context) => context.pageLabel,
    isVisible: (businessFamily, catalogMode) => supportsDedicatedShopPage(businessFamily, catalogMode),
  },
  {
    value: "footer",
    category: "Store Identity",
    keywords: "footer link social copyright pay text message description information links copy footer settings social social links",
    resolveLabel: () => "Footer Details",
  },
  {
    value: "domain",
    category: "Store Identity",
    keywords: "custom domain dns website url address connect",
    resolveLabel: () => "Custom Domain",
  },
  {
    value: "notifications",
    category: "Information",
    keywords: "sms email notifications order receipt shipped tracking tracking sms alert email gateway resend greenweb sms api key",
    resolveLabel: () => "Notifications",
  },
  {
    value: "page_builder",
    category: "Storefront",
    keywords: "page builder pages blocks homepage custom page revisions seo slug layout rich text storefront sections",
    resolveLabel: () => "Page Builder",
  },
];

export function getAvailableSettingsTabs({
  businessFamily,
  catalogMode,
  templateId,
}: {
  businessFamily: StoreBusinessFamily;
  catalogMode: StoreCatalogMode;
  templateId: StorefrontTemplateId;
}): SettingsTabOption[] {
  const context = resolveStorefrontSettingsContext(businessFamily, catalogMode);

  return settingsTabDefinitions
    .filter((definition) => definition.isVisible
      ? definition.isVisible(businessFamily, catalogMode, templateId)
      : true)
    .map((definition) => ({
      value: definition.value,
      label: definition.resolveLabel(context, templateId),
      category: definition.category,
      keywords: [
        definition.keywords,
        context.pageLabel,
        context.itemLabelPlural,
        context.itemLabelSingular,
        context.browseVerb,
        context.conversionLabel,
        context.supportSummary,
        templateId,
      ].join(" ").toLowerCase(),
    }));
}

export function isLegacySettingsTab(value: SettingsTabValue) {
  return settingsTabDefinitions.some((definition) => definition.value === value && definition.legacy);
}
