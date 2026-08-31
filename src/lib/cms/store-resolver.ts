import {
  DEFAULT_STORE_CURRENCY_CODE,
  DEFAULT_STORE_DESCRIPTION,
  DEFAULT_STORE_LOCALE,
  createDefaultStore,
} from "@/lib/cms/default-store";
import { applyLegacyHomepageSettingsToPages, type SiteSettingRecord } from "@/lib/cms/homepage-settings-adapter";
import { storeSchema, type Store, type StorePage, type StorePageBlock } from "@/lib/cms/schema";
import { getSupabaseAdminClient, loadStorePlanState } from "@/lib/api/supabase-route";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import { getCmsRootDomain, getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";
import { unstable_cache } from "next/cache";
import { resolveStorefrontTemplateId, resolveStorefrontTemplateProfile } from "@/lib/cms/storefront-templates";
import { ensureRequiredStoreFlowPagesForTemplate, instantiateStorePagesFromTemplate } from "@/lib/cms/template-pages";
import { sanitizeStorePage } from "@/lib/cms/validation";
import { resolveStorefrontTemplateSeed, type StorefrontTemplateSeedDefinition } from "@/lib/cms/storefront-template-seeds";
import { fallbackThemePackages, resolveThemePackageById, loadThemePackages, type ThemePackageDefinition } from "@/lib/theme-packages";
import { resolveStorePlanState } from "@/lib/billing/plans";
import { STOREFRONT_TAXONOMY_SETTING_KEY } from "@/lib/storefront-taxonomy-snapshot";

const STORE_SETTING_KEYS_TO_PRELOAD = [
  "announcement_bar",
  "brand_settings",
  "categories_custom_data",
  "contact_page",
  "countdown_timer",
  "catalog_seed_metadata",
  "delivery_settings",
  "exit_intent",
  "faq_entries",
  "footer",
  "hero_section",
  "promo_banner",
  "home_featured",
  "home_categories",
  "loyalty_settings",
  "navigation",
  "payment_settings",
  "shop_page",
  "storefront_profile",
  "theme_customization",
  "whatsapp_support",
  "upsells",
  "about_page",
] as const;

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  custom_domain?: string | null;
  store_type?: string | null;
  description: string | null;
  currency_code: string | null;
  locale: string | null;
  is_published: boolean | null;
}

interface StoreDomainLookupRow {
  store_id: string;
  hostname: string;
}

interface StoreThemeRow {
  preset_id: string | null;
  theme_package_id?: string | null;
  mode: "light" | "dark" | null;
  typography: Record<string, unknown> | null;
  components: Record<string, unknown> | null;
  colors: Record<string, string> | null;
  custom_css?: string | null;
  resolved_tokens?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  } | null;
}

interface StoreBusinessProfileRow {
  template_id: string | null;
}

interface StoreSubscriptionRow {
  plan_id?: string | null;
  status: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
}

interface StorePageRow {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  is_homepage: boolean | null;
}

interface StoreBlockRow {
  id: string;
  page_id: string;
  block_type: StorePageBlock["type"];
  props: Record<string, unknown> | null;
  sort_order: number | null;
  is_visible: boolean | null;
}

interface StorefrontTaxonomyRow {
  id: string;
  name: string;
  sort_order: number | null;
}

type StoreResolverOptions = {
  requestedPageSlug?: string | null;
};

function normalizeRequestedPageSlug(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "/";
  }

  if (trimmed === "/") {
    return "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildStorefrontContentTags(storeId: string, requestedPageSlug?: string | null) {
  const normalizedPageSlug = normalizeRequestedPageSlug(requestedPageSlug);
  const safePageTag = normalizedPageSlug === "/"
    ? "homepage"
    : normalizedPageSlug.replace(/^\/+/, "").replace(/[^\w/-]+/g, "-");

  return [
    `store:${storeId}`,
    `store:${storeId}:content`,
    `store:${storeId}:page:${safePageTag}`,
  ];
}

export async function getDefaultStore(): Promise<Store> {
  return createDefaultStore();
}

export function isLocalStorefrontHostname(hostname?: string | null) {
  const normalized = hostname
    ?.split(",")[0]
    ?.trim()
    .toLowerCase()
    .split(":")[0] ?? null;

  return normalized === "localhost" || normalized === "127.0.0.1";
}

function normalizeHostname(hostname?: string | null) {
  if (!hostname) return null;

  const withoutPort = hostname.split(":")[0]?.trim().toLowerCase();

  if (!withoutPort || withoutPort === "localhost" || withoutPort === "127.0.0.1") {
    return null;
  }

  return withoutPort;
}

function normalizeDomainValue(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0]
    ?.trim()
    .toLowerCase() || null;
}

function getStoreSubdomainBaseDomains() {
  const configured = [
    getCmsRootDomain(),
    getStoreSubdomainBaseDomain(),
  ]
    .map(normalizeDomainValue)
    .filter((value): value is string => Boolean(value));

  const siteHost = normalizeDomainValue(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL);

  if (siteHost && !configured.includes(siteHost)) {
    configured.push(siteHost);
  }

  if (!configured.includes("localhost")) {
    configured.push("localhost");
  }

  return configured;
}

function getStoreSlugFromHostname(hostname: string) {
  for (const baseDomain of getStoreSubdomainBaseDomains()) {
    if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
      return null;
    }

    if (hostname.endsWith(`.${baseDomain}`)) {
      const slug = hostname.slice(0, -(baseDomain.length + 1));
      return slug && !slug.includes(".") ? slug : null;
    }
  }

  return null;
}

export function buildResolvedStoreFromRecords(
  store: StoreRow,
  businessProfile: StoreBusinessProfileRow | null,
  theme: StoreThemeRow | null,
  pages: StorePageRow[],
  blocks: StoreBlockRow[],
  siteSettings: SiteSettingRecord[],
  templateSeedOverride?: StorefrontTemplateSeedDefinition | null,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
): Store {
  const rawSiteSettings = siteSettings.reduce<Record<string, unknown>>((settings, setting) => {
    settings[setting.key] = setting.value;
    return settings;
  }, {});
  const initialStorefrontProfile = typeof rawSiteSettings.storefront_profile === "object" && rawSiteSettings.storefront_profile
    ? rawSiteSettings.storefront_profile as Record<string, unknown>
    : {};
  const templateProfile = resolveStorefrontTemplateProfile(initialStorefrontProfile.template_id, {
    templateSeedId: businessProfile?.template_id
      ?? store.store_type
      ?? "general-catalog",
    productVisibility: typeof initialStorefrontProfile.product_visibility === "string"
      ? initialStorefrontProfile.product_visibility
      : null,
  });
  const templateSeed = templateSeedOverride ?? resolveStorefrontTemplateSeed(templateProfile.templateSeedId);
  const seedDefinition = templateSeedOverride ?? templateProfile.seedDefinition;
  const fallbackTheme = resolveThemePackageById(
    theme?.theme_package_id,
    themePackages,
    theme?.preset_id ?? seedDefinition.defaultTheme.presetId,
  );
  const fallbackPages = templateSeedOverride
    ? instantiateStorePagesFromTemplate(templateSeedOverride)
    : instantiateStorePagesFromTemplate(templateProfile);
  const fallbackPageBySlug = new Map(fallbackPages.map((page) => [page.slug, page]));
  const mappedPages = applyLegacyHomepageSettingsToPages(
    pages
      .map((page) =>
        sanitizeStorePage({
          id: page.id,
          slug: page.slug,
          title: page.title,
          seoTitle: page.seo_title ?? undefined,
          seoDescription: page.seo_description ?? undefined,
          isHomepage: page.is_homepage ?? false,
          blocks: (() => {
            const persistedBlocks = blocks
              .filter((block) => block.page_id === page.id)
              .map((block) => ({
                id: block.id,
                type: block.block_type,
                props: block.props ?? {},
                sortOrder: block.sort_order ?? 0,
                isVisible: block.is_visible ?? true,
              }));

            if (persistedBlocks.length > 0) {
              return persistedBlocks;
            }

            return fallbackPageBySlug.get(page.slug)?.blocks ?? [];
          })(),
        }),
      )
      .filter((page): page is StorePage => Boolean(page)),
    siteSettings,
  );
  const resolvedSiteSettings = rawSiteSettings;
  const storefrontProfile = typeof resolvedSiteSettings.storefront_profile === "object" && resolvedSiteSettings.storefront_profile
    ? resolvedSiteSettings.storefront_profile as Record<string, unknown>
    : {};
  resolvedSiteSettings.storefront_profile = {
    ...storefrontProfile,
    template_id: resolveStorefrontTemplateId(storefrontProfile.template_id, {
      templateSeedId: templateSeed.id,
      productVisibility: typeof storefrontProfile.product_visibility === "string" ? storefrontProfile.product_visibility : null,
    }),
  };

  const resolvedPages = ensureRequiredStoreFlowPagesForTemplate(
    mappedPages.length > 0 ? mappedPages : fallbackPages,
    templateSeed,
  );

  return storeSchema.parse({
    id: store.id,
    name: store.name,
    slug: store.slug,
    logoUrl: store.logo_url ?? undefined,
    customDomain: store.custom_domain ?? undefined,
    description: store.description ?? seedDefinition.storeDescription ?? DEFAULT_STORE_DESCRIPTION,
    currencyCode: store.currency_code ?? DEFAULT_STORE_CURRENCY_CODE,
    locale: store.locale ?? DEFAULT_STORE_LOCALE,
    isPublished: store.is_published ?? false,
    theme: {
      presetId: theme?.preset_id ?? fallbackTheme.presetId,
      themePackageId: theme?.theme_package_id ?? fallbackTheme.id,
      mode: theme?.mode ?? seedDefinition.defaultTheme.mode,
      headingFont: typeof theme?.typography?.headingFont === "string" ? theme.typography.headingFont : (fallbackTheme.tokens.typography.headingFont ?? seedDefinition.defaultTheme.headingFont),
      bodyFont: typeof theme?.typography?.bodyFont === "string" ? theme.typography.bodyFont : (fallbackTheme.tokens.typography.bodyFont ?? seedDefinition.defaultTheme.bodyFont),
      borderRadius: typeof theme?.components?.borderRadius === "string" ? theme.components.borderRadius : (fallbackTheme.tokens.components.borderRadius ?? seedDefinition.defaultTheme.borderRadius),
      customCssVars: theme?.colors ?? theme?.resolved_tokens?.[theme?.mode ?? seedDefinition.defaultTheme.mode] ?? fallbackTheme.tokens[theme?.mode ?? seedDefinition.defaultTheme.mode],
      customCss: theme?.custom_css ?? fallbackTheme.customCss,
    },
    pages: resolvedPages,
    siteSettings: resolvedSiteSettings,
  });
}

export function canAccessStorefrontStore(
  store: Pick<StoreRow, "is_published"> | { is_published?: boolean | null; plan?: string | null } | null | undefined,
  subscription?: StoreSubscriptionRow | null,
) {
  if (!store) {
    return false;
  }

  const resolvedPlanState = resolveStorePlanState({
    subscription: subscription ?? null,
    legacyPlanId: typeof (store as { plan?: string | null })?.plan === "string"
      ? (store as { plan?: string | null }).plan ?? null
      : null,
  });

  if (!store.is_published) {
    return false;
  }

  if (!subscription) {
    return true;
  }

  return resolvedPlanState.live;
}

function getStoreResolverClient() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return getCmsSupabaseServerClient();
  }
}

const STOREFRONT_RESOLVER_REVALIDATE_SECONDS = 60;

export async function resolveStoreByHostname(hostname?: string, options?: StoreResolverOptions): Promise<Store | null> {
  const normalizedHostname = normalizeHostname(hostname);
  const supabase = getStoreResolverClient();

  if (!normalizedHostname || !supabase) {
    return isLocalStorefrontHostname(hostname) ? await getDefaultStore() : null;
  }

  const subdomainSlug = getStoreSlugFromHostname(normalizedHostname);
  let matchedStoreId: string | null = null;

  if (subdomainSlug) {
    const { data: stores, error } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", subdomainSlug)
      .limit(1);

    const matchedStore = stores?.[0] as Pick<StoreRow, "id"> | undefined;
    if (error || !matchedStore) {
      return null;
    }

    matchedStoreId = matchedStore.id;
  } else {
    const { data: domains, error } = await supabase
      .from("store_domains")
      .select("store_id, hostname")
      .eq("hostname", normalizedHostname)
      .eq("status", "active")
      .limit(1);

    const matchedDomain = domains?.[0] as StoreDomainLookupRow | undefined;
    if (error || !matchedDomain) {
      return null;
    }

    matchedStoreId = matchedDomain.store_id;
  }

  const { data: storePlanState, error: storePlanStateError } = await loadStorePlanState(supabase as never, matchedStoreId, {
    includePublished: true,
  });
  if (storePlanStateError || !canAccessStorefrontStore({ is_published: storePlanState?.isPublished ?? false, plan: storePlanState?.legacyPlanId ?? null }, (storePlanState?.subscription as StoreSubscriptionRow | null) ?? null)) {
    return null;
  }

  const store = await getStoreById(matchedStoreId, options);
  return store;
}

export async function validatePreviewToken(storeId: string, previewToken?: string | null): Promise<boolean> {
  if (!storeId || !previewToken) return false;

  const supabase = getStoreResolverClient();
  if (!supabase) return false;

  const { data: tokenRow, error } = await supabase
    .from("store_preview_tokens")
    .select("store_id, expires_at")
    .eq("id", previewToken)
    .maybeSingle();

  if (error || !tokenRow) return false;

  const row = tokenRow as { store_id: string; expires_at: string };

  // Ensure token's store_id strictly matches the store being requested
  if (row.store_id !== storeId) {
    return false;
  }

  // Ensure token has not expired
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return false;
  }

  return true;
}

export async function getStoreBySlug(slug: string, previewToken?: string | null, options?: StoreResolverOptions): Promise<Store | null> {
  const requestedPageSlug = normalizeRequestedPageSlug(options?.requestedPageSlug);
  if (!previewToken) {
    return getStoreBySlugCached(slug, requestedPageSlug);
  }

  return getStoreBySlugUncached(slug, previewToken, options);
}

async function getStoreBySlugUncached(slug: string, previewToken?: string | null, options?: StoreResolverOptions): Promise<Store | null> {
  const supabase = getStoreResolverClient();

  if (!supabase) {
    return null;
  }

  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url, custom_domain, description, currency_code, locale, is_published, store_type")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !store) {
    return null;
  }

  const isValidToken = await validatePreviewToken(store.id, previewToken);

  if (!isValidToken) {
    const { data: storePlanState, error: storePlanStateError } = await loadStorePlanState(supabase as never, store.id, {
      includePublished: true,
    });
    if (storePlanStateError || !canAccessStorefrontStore({ ...(store as Pick<StoreRow, "is_published">), plan: storePlanState?.legacyPlanId ?? null }, (storePlanState?.subscription as StoreSubscriptionRow | null) ?? null)) {
      return null;
    }
  }

  return await getStoreByIdUncached(store.id, options);
}

export async function getStoreById(storeId: string, options?: StoreResolverOptions): Promise<Store | null> {
  const requestedPageSlug = normalizeRequestedPageSlug(options?.requestedPageSlug);
  return getStoreByIdCached(storeId, requestedPageSlug);
}

async function loadStoreResolverCoreRecords(storeId: string) {
  const supabase = getStoreResolverClient();

  if (!supabase) {
    return null;
  }

  const [
    { data: store, error: storeError },
    { data: businessProfile },
    { data: theme },
    { data: siteSettings },
    { data: categories, error: categoriesError },
    { data: productTypes, error: productTypesError },
    themePackages,
  ] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug, logo_url, custom_domain, description, currency_code, locale, is_published, store_type")
      .eq("id", storeId)
      .maybeSingle(),
    supabase
      .from("store_business_profiles")
      .select("template_id")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("store_themes")
      .select("preset_id, theme_package_id, mode, typography, components, colors, custom_css, resolved_tokens")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("site_settings")
      .select("key, value")
      .eq("store_id", storeId)
      .in("key", STORE_SETTING_KEYS_TO_PRELOAD),
    supabase
      .from("product_categories")
      .select("id, name, sort_order")
      .eq("store_id", storeId)
      .order("sort_order"),
    supabase
      .from("product_types")
      .select("id, name, sort_order")
      .eq("store_id", storeId)
      .order("sort_order"),
    loadThemePackages(supabase, storeId),
  ]);

  if (storeError || !store) {
    return null;
  }

  const mapTaxonomyRows = (rows: StorefrontTaxonomyRow[] | null | undefined) =>
    (rows ?? []).map((row, index) => ({
      id: row.id,
      name: row.name,
      sort_order: row.sort_order ?? index,
    }));
  const resolvedSiteSettings = (siteSettings as SiteSettingRecord[] | null) ?? [];
  resolvedSiteSettings.push({
    key: STOREFRONT_TAXONOMY_SETTING_KEY,
    value: {
      categories: categoriesError ? [] : mapTaxonomyRows(categories as StorefrontTaxonomyRow[] | null),
      types: productTypesError ? [] : mapTaxonomyRows(productTypes as StorefrontTaxonomyRow[] | null),
    },
  });

  return {
    store: store as StoreRow,
    businessProfile: (businessProfile as StoreBusinessProfileRow | null) ?? null,
    theme: (theme as StoreThemeRow | null) ?? null,
    siteSettings: resolvedSiteSettings,
    themePackages,
  };
}

async function getStoreByIdUncached(storeId: string, options?: StoreResolverOptions): Promise<Store | null> {
  const supabase = getStoreResolverClient();

  if (!supabase) {
    return null;
  }

  const requestedPageSlug = normalizeRequestedPageSlug(options?.requestedPageSlug);

  const { data: pageRows, error: pagesError } = await supabase
    .from("store_pages")
    .select("id, slug, title, seo_title, seo_description, is_homepage")
    .eq("store_id", storeId);

  if (pagesError) {
    return null;
  }

  const pages = (pageRows as StorePageRow[] | null) ?? [];
  const homepagePage = pages.find((page) => page.is_homepage) ?? pages[0] ?? null;
  const requestedPage = pages.find((page) => page.slug === requestedPageSlug) ?? null;
  const pageIdsToLoad = Array.from(new Set(
    [homepagePage?.id, requestedPage?.id].filter((value): value is string => Boolean(value)),
  ));

  const [coreRecords, { data: blocks }] = await Promise.all([
    loadStoreResolverCoreRecords(storeId),
    supabase
      .from("store_page_blocks")
      .select("id, page_id, block_type, props, sort_order, is_visible")
      .eq("store_id", storeId)
      .in("page_id", pageIdsToLoad.length > 0 ? pageIdsToLoad : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  if (!coreRecords) {
    return null;
  }

  const templateSeedId = (coreRecords.businessProfile?.template_id ?? coreRecords.store.store_type ?? null) as string | null;
  const templateSeedDefinition = resolveStorefrontTemplateSeed(templateSeedId);

  return buildResolvedStoreFromRecords(
    coreRecords.store,
    coreRecords.businessProfile,
    coreRecords.theme,
    pages,
    (blocks as StoreBlockRow[] | null) ?? [],
    coreRecords.siteSettings,
    templateSeedDefinition,
    coreRecords.themePackages,
  );
}

export async function getStoreShellById(storeId: string, options?: StoreResolverOptions): Promise<Store | null> {
  const requestedPageSlug = normalizeRequestedPageSlug(options?.requestedPageSlug);
  return getStoreShellByIdCached(storeId, requestedPageSlug);
}

async function getStoreShellByIdUncached(storeId: string): Promise<Store | null> {
  const coreRecords = await loadStoreResolverCoreRecords(storeId);

  if (!coreRecords) {
    return null;
  }

  const templateSeedId = (coreRecords.businessProfile?.template_id ?? coreRecords.store.store_type ?? null) as string | null;
  const templateSeedDefinition = resolveStorefrontTemplateSeed(templateSeedId);

  return buildResolvedStoreFromRecords(
    coreRecords.store,
    coreRecords.businessProfile,
    coreRecords.theme,
    [],
    [],
    coreRecords.siteSettings,
    templateSeedDefinition,
    coreRecords.themePackages,
  );
}

export async function getStoreShellBySlug(slug: string, previewToken?: string | null, options?: StoreResolverOptions): Promise<Store | null> {
  const requestedPageSlug = normalizeRequestedPageSlug(options?.requestedPageSlug);
  if (!previewToken) {
    return getStoreShellBySlugCached(slug, requestedPageSlug);
  }

  const store = await getStoreBySlugUncached(slug, previewToken, options);
  if (!store) {
    return null;
  }

  return getStoreShellByIdUncached(store.id);
}

const getStoreByIdCached = (storeId: string, requestedPageSlug: string) =>
  unstable_cache(
    async () => getStoreByIdUncached(storeId, { requestedPageSlug }),
    ["storefront-store-by-id", storeId, requestedPageSlug],
    {
      revalidate: STOREFRONT_RESOLVER_REVALIDATE_SECONDS,
      tags: buildStorefrontContentTags(storeId, requestedPageSlug),
    },
  )();

const getStoreShellByIdCached = (storeId: string, requestedPageSlug: string) =>
  unstable_cache(
    async () => getStoreShellByIdUncached(storeId),
    ["storefront-store-shell-by-id", storeId, requestedPageSlug],
    {
      revalidate: STOREFRONT_RESOLVER_REVALIDATE_SECONDS,
      tags: buildStorefrontContentTags(storeId, requestedPageSlug),
    },
  )();

const getStoreBySlugCached = (slug: string, requestedPageSlug: string) =>
  unstable_cache(
    async () => getStoreBySlugUncached(slug, undefined, { requestedPageSlug }),
    ["storefront-store-by-slug", slug, requestedPageSlug],
    {
      revalidate: STOREFRONT_RESOLVER_REVALIDATE_SECONDS,
      tags: [`storefront:slug:${slug}`],
    },
  )();

const getStoreShellBySlugCached = (slug: string, requestedPageSlug: string) =>
  unstable_cache(
    async () => {
      const store = await getStoreBySlugUncached(slug, undefined, { requestedPageSlug });
      if (!store) {
        return null;
      }

      return getStoreShellByIdUncached(store.id);
    },
    ["storefront-store-shell-by-slug", slug, requestedPageSlug],
    {
      revalidate: STOREFRONT_RESOLVER_REVALIDATE_SECONDS,
      tags: [`storefront:slug:${slug}`],
    },
  )();

export function getHomepage(store: Store): StorePage {
  return store.pages.find((page) => page.isHomepage) ?? store.pages[0];
}

export function getPageBySlug(store: Store, slug: string): StorePage | null {
  return store.pages.find((page) => page.slug === slug) ?? null;
}
