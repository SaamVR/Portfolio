import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  applyTemplateDemoContentToPages,
  buildTemplateCatalogSeedRows,
} from "../../../src/lib/cms/template-demo-seeds.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type BlueprintRecord = {
  id: string;
  name?: string | null;
  business_family: string | null;
  catalog_mode: string | null;
  store_description: string | null;
  default_theme: Record<string, unknown> | null;
  default_site_settings: Record<string, unknown> | null;
  recommended_page_set?: unknown[] | null;
  recommended_block_set?: unknown[] | null;
  hero_payload?: Record<string, unknown> | null;
};

type OwnerMembershipRecord = {
  store_id: string;
};

type OwnedStoreRecord = {
  id: string;
};

type StoreSubscriptionRecord = {
  store_id: string;
  plan_id: string | null;
  status: string | null;
  trial_ends_at?: string | null;
};

type StorePlanRecord = {
  id: string;
  monthly_price: number | null;
  store_limit: number | null;
  trial_days?: number | null;
  contact_only?: boolean | null;
};

type ThemePackageRecord = {
  id: string;
  version?: number | null;
  preset_id: string | null;
  mode: "light" | "dark" | null;
  custom_css?: string | null;
  tokens: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
    typography?: {
      headingFont?: string;
      bodyFont?: string;
    };
    components?: {
      borderRadius?: string;
    };
  } | null;
};

const storefrontTemplateIds = new Set([
  "landing",
  "beauty",
  "fashion",
  "electronics",
  "food",
  "crafts",
  "subscriptions",
  "digital-downloads",
  "single-product",
  "inquiry-catalog",
  "service",
  "general-catalog",
  "booking",
  "hotel",
  "real-estate",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildThemeSeed(
  defaultTheme: Record<string, unknown> | null,
  themePackage: ThemePackageRecord | null,
) {
  const mode = defaultTheme?.mode === "light" ? "light" : "dark";
  const typography = isPlainObject(themePackage?.tokens?.typography)
    ? themePackage?.tokens?.typography
    : {};
  const components = isPlainObject(themePackage?.tokens?.components)
    ? themePackage?.tokens?.components
    : {};
  const resolvedTokens = mode === "light"
    ? themePackage?.tokens?.light ?? {}
    : themePackage?.tokens?.dark ?? {};

  return {
    preset_id: typeof defaultTheme?.presetId === "string"
      ? defaultTheme.presetId
      : (themePackage?.preset_id ?? themePackage?.id ?? "default"),
    theme_package_id: themePackage?.id ?? null,
    theme_package_version: typeof themePackage?.version === "number" ? themePackage.version : null,
    mode,
    typography: {
      headingFont: typeof defaultTheme?.headingFont === "string"
        ? defaultTheme.headingFont
        : (typeof typography.headingFont === "string" ? typography.headingFont : null),
      bodyFont: typeof defaultTheme?.bodyFont === "string"
        ? defaultTheme.bodyFont
        : (typeof typography.bodyFont === "string" ? typography.bodyFont : null),
    },
    components: {
      borderRadius: typeof defaultTheme?.borderRadius === "string"
        ? defaultTheme.borderRadius
        : (typeof components.borderRadius === "string" ? components.borderRadius : null),
    },
    colors: resolvedTokens,
    resolved_tokens: {
      light: themePackage?.tokens?.light ?? {},
      dark: themePackage?.tokens?.dark ?? {},
    },
    custom_css: typeof themePackage?.custom_css === "string" ? themePackage.custom_css : null,
  };
}

function buildSiteSettingRows(storeId: string, defaultSiteSettings: Record<string, unknown> | null) {
  if (!isPlainObject(defaultSiteSettings)) {
    return [];
  }

  return Object.entries(defaultSiteSettings)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      store_id: storeId,
      key,
      value: value ?? {},
    }));
}

function mergeStorefrontTemplateSetting(
  defaultSiteSettings: Record<string, unknown> | null,
  templateId: string | null,
) {
  if (!templateId || !storefrontTemplateIds.has(templateId)) {
    return defaultSiteSettings;
  }

  const nextSettings = isPlainObject(defaultSiteSettings)
    ? { ...defaultSiteSettings }
    : {};
  const storefrontProfile = isPlainObject(nextSettings.storefront_profile)
    ? { ...nextSettings.storefront_profile }
    : {};

  storefrontProfile.template_id = templateId;
  nextSettings.storefront_profile = storefrontProfile;
  return nextSettings;
}

type SeedPage = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  isHomepage: boolean;
  blocks: Array<{
    id: string;
    type: string;
    props: Record<string, unknown>;
    sortOrder: number;
    isVisible: boolean;
  }>;
};

const pageBlueprintAliasMap: Record<string, string> = {
  about: "about",
  "about-kitchen": "about",
  contact: "contact-us",
  home: "",
  policy: "policy",
};

const supportedBlockTypes = new Set([
  "hero",
  "countdown",
  "promo-banner",
  "category-showcase",
  "featured-products",
  "recently-viewed",
  "rich-text",
  "social-feed",
  "video-reel",
  "faq-accordion",
  "trust-badges",
  "testimonials",
]);

const shopEligibleCatalogModes = new Set([
  "multi_product",
  "menu",
  "digital_download",
  "multi_vendor",
  "pre_order",
  "inquiry_only",
]);

function createDefaultBlock(type: string, sortOrder: number) {
  const base = {
    id: crypto.randomUUID(),
    type,
    sortOrder,
    isVisible: true,
    props: {},
  };

  switch (type) {
    case "hero":
      return {
        ...base,
        props: {
          tagline: "Welcome",
          title: "Start",
          highlight: "Selling",
          subtitle: "Customize this hero from your dashboard.",
          ctaText: "Shop Now",
          ctaLink: "/shop",
          secondaryCtaText: "Learn More",
          secondaryCtaLink: "/about-brand",
        },
      };
    case "promo-banner":
      return {
        ...base,
        props: {
          title: "Featured Offer",
          subtitle: "Highlight your current campaign, launch, or strongest reason to buy.",
          ctaText: "Browse Offers",
          ctaLink: "/shop",
          badgeText: "Now Live",
          bgStyle: "gradient",
          textAlignment: "center",
        },
      };
    case "category-showcase":
      return {
        ...base,
        props: {
          tagline: "Browse",
          title: "Shop by Category",
        },
      };
    case "featured-products":
      return {
        ...base,
        props: {
          limit: 6,
          title: "Featured Products",
          tagline: "Recommended",
        },
      };
    case "faq-accordion":
      return {
        ...base,
        props: {
          title: "Questions before ordering",
          subtitle: "Answer the common doubts that can slow down first-time buyers.",
          faqs: [
            { q: "How long does delivery take?", a: "Add your delivery timing by area so customers know what to expect." },
            { q: "Which payment methods are available?", a: "Explain how customers can pay or confirm their order." },
            { q: "How can customers get support?", a: "Share the best contact method and your normal response time." },
          ],
        },
      };
    case "trust-badges":
      return {
        ...base,
        props: {
          title: "Why customers can trust this store",
          badges: [
            { icon: "payment", label: "Clear checkout", description: "Show buyers how payment and confirmation work." },
            { icon: "truck", label: "Delivery visibility", description: "Explain timing, regions, or pickup details clearly." },
            { icon: "support", label: "Responsive support", description: "Make it easy for customers to reach you before or after ordering." },
          ],
        },
      };
    case "testimonials":
      return {
        ...base,
        props: {
          title: "Customer proof",
          subtitle: "Add real buyer feedback here once orders start coming in.",
          reviews: [],
        },
      };
    case "social-feed":
      return {
        ...base,
        props: {
          title: "Store moments",
          subtitle: "Show product, behind-the-scenes, or campaign visuals here.",
          images: [],
        },
      };
    case "rich-text":
      return {
        ...base,
        props: {
          eyebrow: "About this store",
          title: "Explain why customers should choose you",
          body: "Use this section to describe your offer, who it is for, and what makes ordering feel trustworthy.",
          align: "left",
        },
      };
    default:
      return base;
  }
}

function createTemplatePage(templateId: string): SeedPage | null {
  if (templateId === "about") {
    return {
      id: crypto.randomUUID(),
      slug: "/about-brand",
      title: "About",
      seoTitle: "About This Business",
      seoDescription: "Share your story, values, and what makes the business worth choosing.",
      isHomepage: false,
      blocks: [
        {
          id: crypto.randomUUID(),
          type: "rich-text",
          sortOrder: 0,
          isVisible: true,
          props: {
            eyebrow: "Our Story",
            title: "Tell customers what this business is about",
            body: "Use this page to explain your origin, the people behind the business, and why your offer matters.",
            align: "left",
          },
        },
        {
          id: crypto.randomUUID(),
          type: "rich-text",
          sortOrder: 1,
          isVisible: true,
          props: {
            eyebrow: "Approach",
            title: "What customers can count on",
            body: "Explain your standards, process, sourcing, service model, or anything that helps customers trust the business.",
            align: "left",
          },
        },
      ],
    };
  }

  if (templateId === "policy") {
    return {
      id: crypto.randomUUID(),
      slug: "/policy",
      title: "Policies",
      seoTitle: "Store Policy",
      seoDescription: "Refunds, shipping, exchange policy, and customer support notes.",
      isHomepage: false,
      blocks: [
        {
          id: crypto.randomUUID(),
          type: "rich-text",
          sortOrder: 0,
          isVisible: true,
          props: {
            eyebrow: "Store Policy",
            title: "Set clear expectations before purchase",
            body: "Summarize delivery times, return windows, payment terms, exchange rules, and support availability.",
            align: "left",
          },
        },
        {
          id: crypto.randomUUID(),
          type: "faq-accordion",
          sortOrder: 1,
          isVisible: true,
          props: {
            title: "Policy FAQs",
            subtitle: "Use these answers to reduce confusion before the customer orders.",
            faqs: [
              { q: "What is your exchange or return window?", a: "Explain how many days customers have and how support requests should be submitted." },
              { q: "How are delivery charges calculated?", a: "Clarify delivery charges by area and when free delivery applies." },
              { q: "How are order issues resolved?", a: "Explain the steps customers should follow if something goes wrong with an order." },
            ],
          },
        },
      ],
    };
  }

  if (templateId === "contact-us") {
    return {
      id: crypto.randomUUID(),
      slug: "/contact-us",
      title: "Contact Us",
      seoTitle: "Contact Us",
      seoDescription: "Find support hours, WhatsApp contact details, and order help.",
      isHomepage: false,
      blocks: [
        {
          id: crypto.randomUUID(),
          type: "rich-text",
          sortOrder: 0,
          isVisible: true,
          props: {
            eyebrow: "Support",
            title: "Make help easy to reach",
            body: "Add your WhatsApp number, response hours, order support process, and the best way for customers to contact you.",
            align: "left",
          },
        },
      ],
    };
  }

  return null;
}

function shouldIncludeShopPage(blueprint: BlueprintRecord | null) {
  return blueprint?.business_family === "commerce"
    && blueprint.catalog_mode !== "single_product"
    && shopEligibleCatalogModes.has(blueprint.catalog_mode ?? "");
}

function buildShopPage(storeName: string, blueprint: BlueprintRecord | null): SeedPage {
  const isMenu = blueprint?.catalog_mode === "menu";
  return {
    id: crypto.randomUUID(),
    slug: "/shop",
    title: isMenu ? "Menu" : "Shop",
    seoTitle: isMenu ? `Menu | ${storeName}` : `Shop | ${storeName}`,
    seoDescription: isMenu
      ? "Browse available menu items and current offers."
      : "Browse products, collections, and current offers.",
    isHomepage: false,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "rich-text",
        sortOrder: 0,
        isVisible: false,
        props: {
          eyebrow: isMenu ? "Menu" : "Shop",
          title: isMenu ? "Browse the menu" : "Browse the catalog",
          body: "This storefront uses the dedicated shop route for product browsing.",
          align: "left",
        },
      },
    ],
  };
}

function buildSeedPages(storeName: string, blueprint: BlueprintRecord | null): SeedPage[] {
  const hero = isPlainObject(blueprint?.hero_payload) ? blueprint.hero_payload : null;
  const recommendedBlockSet = Array.isArray(blueprint?.recommended_block_set)
    ? blueprint.recommended_block_set.filter((item): item is string => typeof item === "string" && supportedBlockTypes.has(item))
    : [];
  const homepageBlocks = (recommendedBlockSet.length > 0 ? recommendedBlockSet : ["hero", "promo-banner", "featured-products", "rich-text", "faq-accordion"])
    .map((blockType, index) => {
      const block = createDefaultBlock(blockType, index);
      if (block.type === "hero") {
        block.props = {
          ...block.props,
          tagline: typeof hero?.tagline === "string" ? hero.tagline : block.props.tagline,
          title: typeof hero?.title === "string" ? hero.title : block.props.title,
          highlight: typeof hero?.highlight === "string" ? hero.highlight : block.props.highlight,
          subtitle: typeof hero?.subtitle === "string" ? hero.subtitle : block.props.subtitle,
        };
      }

      if (blueprint?.catalog_mode === "landing_only" && block.type === "hero") {
        block.props = {
          ...block.props,
          ctaText: "Order via WhatsApp",
          ctaLink: "#whatsapp",
          secondaryCtaText: undefined,
          secondaryCtaLink: undefined,
        };
      }

      if (blueprint?.catalog_mode === "landing_only" && block.type === "featured-products") {
        block.props = {
          ...block.props,
          title: "Offerings",
          tagline: "Direct Order",
        };
      }

      if (blueprint?.catalog_mode === "inquiry_only" && block.type === "promo-banner") {
        block.props = {
          ...block.props,
          title: "Talk with the seller before checkout",
          subtitle: "Use WhatsApp, phone, or contact details when pricing or availability needs a conversation first.",
          ctaText: "Start a Conversation",
        };
      }

      return block;
    });

  const pages: SeedPage[] = [
    {
      id: crypto.randomUUID(),
      slug: "/",
      title: "Home",
      seoTitle: `${blueprint?.name ?? storeName} Home`,
      seoDescription: blueprint?.store_description ?? `${storeName} storefront`,
      isHomepage: true,
      blocks: homepageBlocks,
    },
  ];

  const recommendedPages = Array.isArray(blueprint?.recommended_page_set)
    ? Array.from(new Set(blueprint.recommended_page_set.filter((item): item is string => typeof item === "string")))
    : [];

  for (const pageId of recommendedPages) {
    const mappedTemplateId = pageBlueprintAliasMap[pageId] ?? pageId;
    if (!mappedTemplateId) continue;

    const templatePage = createTemplatePage(mappedTemplateId);
    if (templatePage) {
      pages.push(templatePage);
    }
  }

  if (shouldIncludeShopPage(blueprint) && !pages.some((page) => page.slug === "/shop")) {
    pages.push(buildShopPage(storeName, blueprint));
  }

  return pages;
}

function buildSeedRows(storeId: string, pages: SeedPage[]) {
  return {
    pageRows: pages.map((page) => ({
      id: page.id,
      store_id: storeId,
      slug: page.slug,
      title: page.title,
      seo_title: page.seoTitle,
      seo_description: page.seoDescription,
      is_homepage: page.isHomepage,
    })),
    blockRows: pages.flatMap((page) =>
      page.blocks.map((block) => ({
        id: block.id,
        page_id: page.id,
        store_id: storeId,
        block_type: block.type,
        props: block.props,
        sort_order: block.sortOrder,
        is_visible: block.isVisible,
      }))),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "You must be signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const ownerName = String(payload.owner_name ?? "").trim();
    const siteUrl = String(payload.site_url ?? "").trim();
    const storeName = String(payload.store_name ?? "").trim();
    const requestedSlug = String(payload.store_slug ?? "").trim();
    const businessType = String(payload.business_type ?? "general-catalog").trim() || "general-catalog";
    const requestedTemplateId = String(payload.storefront_template_id ?? "").trim();
    const requestedPlanId = String(payload.plan_id ?? "").trim();
    const sourceStoreId = String(payload.source_store_id ?? "").trim();
    const intent = String(payload.intent ?? "").trim();
    const isAdditionalStoreFlow = intent === "new-store";

    if (!storeName) {
      return new Response(JSON.stringify({ error: "Store name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeSlug = slugify(requestedSlug || storeName);
    if (!storeSlug) {
      return new Response(JSON.stringify({ error: "A valid store slug is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [
      { data: merchantAccountStatus },
      { data: existingStoreBySlug },
      { data: ownedStores },
      { data: ownerMemberships },
      { data: blueprintRecord },
    ] = await Promise.all([
      supabaseAdmin
        .from("merchant_account_statuses")
        .select("can_create_store, status_note")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin.from("stores").select("id").eq("slug", storeSlug).maybeSingle(),
      supabaseAdmin.from("stores").select("id").eq("owner_id", user.id),
      supabaseAdmin.from("store_memberships").select("store_id").eq("user_id", user.id).eq("role", "owner"),
      supabaseAdmin
        .from("store_blueprints")
        .select("id, name, business_family, catalog_mode, store_description, default_theme, default_site_settings, recommended_page_set, recommended_block_set, hero_payload")
        .eq("id", businessType)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (merchantAccountStatus?.can_create_store === false) {
      return new Response(JSON.stringify({
        error: typeof merchantAccountStatus?.status_note === "string" && merchantAccountStatus.status_note.trim()
          ? merchantAccountStatus.status_note
          : "Your account cannot create new stores right now. Please contact support.",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingStoreBySlug) {
      return new Response(JSON.stringify({ error: "That store slug is already taken" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blueprint = (blueprintRecord as BlueprintRecord | null) ?? null;
    const resolvedBusinessType = blueprint?.id ?? "general-catalog";
    const defaultTheme = isPlainObject(blueprint?.default_theme) ? blueprint.default_theme : null;
    const defaultSiteSettings = mergeStorefrontTemplateSetting(
      isPlainObject(blueprint?.default_site_settings) ? blueprint.default_site_settings : null,
      requestedTemplateId || null,
    );
    const defaultThemePresetId = typeof defaultTheme?.presetId === "string" ? defaultTheme.presetId : null;
    const { data: themePackageRecord } = defaultThemePresetId
      ? await supabaseAdmin
        .from("theme_packages")
        .select("id, version, preset_id, mode, tokens, custom_css")
        .or(`id.eq.${defaultThemePresetId},preset_id.eq.${defaultThemePresetId},slug.eq.${defaultThemePresetId}`)
        .limit(1)
        .maybeSingle()
      : { data: null };
    const themeSeed = buildThemeSeed(defaultTheme, (themePackageRecord as ThemePackageRecord | null) ?? null);

    const ownedStoreIds = Array.from(new Set([
      ...(((ownedStores as OwnedStoreRecord[] | null) ?? []).map((row) => row.id).filter(Boolean)),
      ...(((ownerMemberships as OwnerMembershipRecord[] | null) ?? []).map((row) => row.store_id).filter(Boolean)),
    ]));

    const requestedPlan = !isAdditionalStoreFlow && requestedPlanId
      ? await supabaseAdmin
        .from("cms_plans")
        .select("id, name, monthly_price, store_limit, trial_days, contact_only")
        .eq("id", requestedPlanId)
        .eq("is_active", true)
        .maybeSingle()
      : { data: null };

    let inheritedPlanId = requestedPlan.data?.id ?? null;
    let inheritedPlanRecord = (requestedPlan.data as StorePlanRecord | null) ?? null;
    let inheritedTrialEndsAt: string | null = null;

    if (ownedStoreIds.length > 0) {
      const { data: ownedSubscriptions } = await supabaseAdmin
        .from("store_subscriptions")
        .select("store_id, plan_id, status, trial_ends_at")
        .in("store_id", ownedStoreIds);

      const activePaidSubscriptions = ((ownedSubscriptions as StoreSubscriptionRecord[] | null) ?? []).filter(
        (row) => row.status === "active" && typeof row.plan_id === "string" && row.plan_id.length > 0,
      );

      const activeOrTrialSubscriptions = ((ownedSubscriptions as StoreSubscriptionRecord[] | null) ?? []).filter(
        (row) => (row.status === "active" || row.status === "trialing") && typeof row.plan_id === "string" && row.plan_id.length > 0,
      );

      if (isAdditionalStoreFlow) {
        if (sourceStoreId && !ownedStoreIds.includes(sourceStoreId)) {
          return new Response(JSON.stringify({ error: "The selected source store does not belong to your account." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const preferredSubscription = sourceStoreId
          ? activeOrTrialSubscriptions.find((row) => row.store_id === sourceStoreId)
          : activeOrTrialSubscriptions[0];

        inheritedPlanId = preferredSubscription?.plan_id ?? inheritedPlanId;
        inheritedTrialEndsAt = preferredSubscription?.status === "trialing"
          ? (preferredSubscription.trial_ends_at ?? null)
          : null;
      }

      if (activePaidSubscriptions.length === 0) {
        return new Response(JSON.stringify({
          error: "Trial accounts can create only one store. Complete payment on your first store to unlock the rest of your plan capacity.",
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const activePlanIds = Array.from(new Set(activePaidSubscriptions.map((row) => row.plan_id).filter(Boolean))) as string[];
      const { data: activePlans } = activePlanIds.length > 0
        ? await supabaseAdmin.from("cms_plans").select("id, name, store_limit, monthly_price, trial_days, contact_only").in("id", activePlanIds)
        : { data: [] };

      if (isAdditionalStoreFlow && inheritedPlanId) {
        inheritedPlanRecord = ((activePlans as StorePlanRecord[] | null) ?? []).find((plan) => plan.id === inheritedPlanId) ?? inheritedPlanRecord;
      }

      const maxAllowedStores = ((activePlans as StorePlanRecord[] | null) ?? []).reduce<number>((max, plan) => {
        if (plan.store_limit === null) {
          return Number.POSITIVE_INFINITY;
        }
        const limit = Math.max(0, Number(plan.store_limit ?? 0) || 0);
        return Math.max(max, limit);
      }, 0);

      if (Number.isFinite(maxAllowedStores) && ownedStoreIds.length >= maxAllowedStores) {
        return new Response(JSON.stringify({
          error: `Your active package allows up to ${maxAllowedStores} store${maxAllowedStores === 1 ? "" : "s"}. Upgrade or contact support to unlock more.`,
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const effectivePlan = inheritedPlanRecord;
    if (effectivePlan?.contact_only) {
      return new Response(JSON.stringify({ error: "This plan is activated through support. Please contact support to continue." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPlanId = effectivePlan?.id ?? (isAdditionalStoreFlow ? "basic" : requestedPlanId || "free");
    const monthlyPrice = Math.max(0, Number(effectivePlan?.monthly_price ?? 0) || 0);
    const trialLengthDays = Math.max(0, Number(effectivePlan?.trial_days ?? (monthlyPrice > 0 ? 14 : 0)) || 0);
    const trialEndsAt = trialLengthDays > 0
      ? (inheritedTrialEndsAt ?? new Date(Date.now() + trialLengthDays * 24 * 60 * 60 * 1000).toISOString())
      : null;
    const planRequiresPayment = false;
    const subscriptionStatus = trialEndsAt ? "trialing" : "active";

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .insert({
        owner_id: user.id,
        name: storeName,
        slug: storeSlug,
        description: blueprint?.store_description ?? `${storeName} storefront powered by EZComo.`,
        currency_code: "BDT",
        locale: "en-BD",
        plan: finalPlanId,
        store_type: resolvedBusinessType,
        is_published: true,
      })
      .select("id, slug, name")
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Failed to create store workspace", details: storeError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedTemplateSeedId = requestedTemplateId || resolvedBusinessType;
    const catalogSeed = buildTemplateCatalogSeedRows(store.id, resolvedTemplateSeedId);
    const seededPages = applyTemplateDemoContentToPages(
      buildSeedPages(storeName, blueprint),
      resolvedTemplateSeedId,
    );
    const { pageRows, blockRows } = buildSeedRows(store.id, seededPages);
    const siteSettingRows = buildSiteSettingRows(store.id, {
      ...(isPlainObject(defaultSiteSettings) ? defaultSiteSettings : {}),
      ...catalogSeed.siteSettings,
    });
    const [
      { error: membershipError },
      { error: subscriptionError },
      { error: leadError },
      { error: businessProfileError },
      { error: themeError },
      siteSettingsResult,
    ] = await Promise.all([
      supabaseAdmin.from("store_memberships").insert({
        store_id: store.id,
        user_id: user.id,
        role: "owner",
      }),
      supabaseAdmin.from("store_subscriptions").upsert({
        store_id: store.id,
        plan_id: finalPlanId,
        status: subscriptionStatus,
        trial_ends_at: trialEndsAt,
      }, { onConflict: "store_id" }),
      supabaseAdmin.from("cms_signup_leads").insert({
        email: user.email,
        name: ownerName || (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null),
        business_type: resolvedBusinessType,
        desired_plan: finalPlanId,
        status: "converted",
        metadata: { store_id: store.id, store_slug: store.slug, site_url: siteUrl || null },
      }),
      supabaseAdmin.from("store_business_profiles").upsert({
        store_id: store.id,
        blueprint_id: resolvedBusinessType,
        blueprint_version: 1,
        business_family: blueprint?.business_family ?? "commerce",
        catalog_mode: blueprint?.catalog_mode ?? "multi_product",
      }, { onConflict: "store_id" }),
      supabaseAdmin.from("store_themes").upsert({
        store_id: store.id,
        ...themeSeed,
      }, { onConflict: "store_id" }),
      siteSettingRows.length > 0
        ? supabaseAdmin.from("site_settings").upsert(siteSettingRows, { onConflict: "store_id,key" })
        : Promise.resolve({ error: null }),
    ]);

    if (membershipError || subscriptionError || businessProfileError || themeError || siteSettingsResult.error) {
      return new Response(JSON.stringify({
        error: "Store workspace was created but setup could not finish",
        details: membershipError?.message
          || subscriptionError?.message
          || businessProfileError?.message
          || themeError?.message
          || siteSettingsResult.error?.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageResult = pageRows.length > 0
      ? await supabaseAdmin.from("store_pages").upsert(pageRows, { onConflict: "id" })
      : { error: null };

    if (pageResult.error) {
      return new Response(JSON.stringify({
        error: "Store workspace was created but setup could not finish",
        details: pageResult.error.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blockResult = blockRows.length > 0
      ? await supabaseAdmin.from("store_page_blocks").upsert(blockRows, { onConflict: "id" })
      : { error: null };

    if (blockResult.error) {
      return new Response(JSON.stringify({
        error: "Store workspace was created but setup could not finish",
        details: membershipError?.message
          || subscriptionError?.message
          || businessProfileError?.message
          || themeError?.message
          || blockResult.error?.message
          || siteSettingsResult.error?.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [categoryResult, productTypeResult, productResult] = await Promise.all([
      catalogSeed.categoryRows.length > 0
        ? supabaseAdmin.from("product_categories").upsert(catalogSeed.categoryRows, { onConflict: "id" })
        : Promise.resolve({ error: null }),
      catalogSeed.productTypeRows.length > 0
        ? supabaseAdmin.from("product_types").upsert(catalogSeed.productTypeRows, { onConflict: "store_id,name" })
        : Promise.resolve({ error: null }),
      catalogSeed.productRows.length > 0
        ? supabaseAdmin.from("products").upsert(catalogSeed.productRows, { onConflict: "id" })
        : Promise.resolve({ error: null }),
    ]);

    if (categoryResult.error || productTypeResult.error || productResult.error) {
      return new Response(JSON.stringify({
        error: "Store workspace was created but setup could not finish",
        details: categoryResult.error?.message
          || productTypeResult.error?.message
          || productResult.error?.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (leadError) {
      console.warn("merchant-signup lead insert failed:", leadError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      store_id: store.id,
      store_slug: store.slug,
      published: true,
      storefront_url: siteUrl || null,
      dashboard_path: `/admin?storeId=${store.id}`,
      payment_required: planRequiresPayment,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("merchant-signup unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
