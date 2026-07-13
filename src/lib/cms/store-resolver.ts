import { defaultStore } from "@/lib/cms/default-store";
import { instantiateStorePagesFromBlueprint } from "@/lib/cms/blueprint-pages";
import { applyLegacyHomepageSettingsToPages, type SiteSettingRecord } from "@/lib/cms/homepage-settings-adapter";
import { loadPageBlueprints, type CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import { storeSchema, type Store, type StorePage, type StorePageBlock } from "@/lib/cms/schema";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import { sanitizeStorePage } from "@/lib/cms/validation";
import { resolveStoreBlueprint, type StoreBlueprintDefinition, loadStoreBlueprintById } from "@/lib/cms/store-blueprints";
import { fallbackThemePackages, resolveThemePackageById, loadThemePackages, type ThemePackageDefinition } from "@/lib/theme-packages";

const DEFAULT_STORE_CURRENCY_CODE = "BDT";
const DEFAULT_STORE_LOCALE = "en-BD";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  store_type?: string | null;
  description: string | null;
  currency_code: string | null;
  locale: string | null;
  is_published: boolean | null;
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
  blueprint_id: string | null;
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

export async function getDefaultStore(): Promise<Store> {
  return defaultStore;
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
    process.env.CMS_ROOT_DOMAIN,
    process.env.STORE_SUBDOMAIN_BASE_DOMAIN,
    process.env.NEXT_PUBLIC_CMS_ROOT_DOMAIN,
    process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE_DOMAIN,
  ]
    .map(normalizeDomainValue)
    .filter((value): value is string => Boolean(value));

  const siteHost = normalizeDomainValue(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL);

  if (siteHost && !configured.includes(siteHost)) {
    configured.push(siteHost);
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
  blueprintOverride?: StoreBlueprintDefinition | null,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
  pageBlueprints: CmsPageBlueprint[] = [],
): Store {
  const blueprint = blueprintOverride ?? resolveStoreBlueprint(businessProfile?.blueprint_id ?? store.store_type ?? "general-catalog");
  const fallbackTheme = resolveThemePackageById(
    theme?.theme_package_id,
    themePackages,
    theme?.preset_id ?? blueprint.defaultTheme.presetId,
  );
  const fallbackPages = instantiateStorePagesFromBlueprint(blueprint, pageBlueprints);
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
          blocks: blocks
            .filter((block) => block.page_id === page.id)
            .map((block) => ({
              id: block.id,
              type: block.block_type,
              props: block.props ?? {},
              sortOrder: block.sort_order ?? 0,
              isVisible: block.is_visible ?? true,
            })),
        }),
      )
      .filter((page): page is StorePage => Boolean(page)),
    siteSettings,
  );

  return storeSchema.parse({
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description ?? blueprint.storeDescription ?? defaultStore.description,
    currencyCode: store.currency_code ?? DEFAULT_STORE_CURRENCY_CODE,
    locale: store.locale ?? DEFAULT_STORE_LOCALE,
    isPublished: store.is_published ?? false,
    theme: {
      presetId: theme?.preset_id ?? fallbackTheme.presetId,
      themePackageId: theme?.theme_package_id ?? fallbackTheme.id,
      mode: theme?.mode ?? blueprint.defaultTheme.mode,
      headingFont: typeof theme?.typography?.headingFont === "string" ? theme.typography.headingFont : (fallbackTheme.tokens.typography.headingFont ?? blueprint.defaultTheme.headingFont),
      bodyFont: typeof theme?.typography?.bodyFont === "string" ? theme.typography.bodyFont : (fallbackTheme.tokens.typography.bodyFont ?? blueprint.defaultTheme.bodyFont),
      borderRadius: typeof theme?.components?.borderRadius === "string" ? theme.components.borderRadius : (fallbackTheme.tokens.components.borderRadius ?? blueprint.defaultTheme.borderRadius),
      customCssVars: theme?.colors ?? theme?.resolved_tokens?.[theme?.mode ?? blueprint.defaultTheme.mode] ?? fallbackTheme.tokens[theme?.mode ?? blueprint.defaultTheme.mode],
      customCss: theme?.custom_css ?? fallbackTheme.customCss,
    },
    pages: mappedPages.length > 0 ? mappedPages : fallbackPages,
  });
}

export async function resolveStoreByHostname(hostname?: string): Promise<Store> {
  const normalizedHostname = normalizeHostname(hostname);
  const supabase = getCmsSupabaseServerClient();

  if (!normalizedHostname || !supabase) {
    return defaultStore;
  }

  const subdomainSlug = getStoreSlugFromHostname(normalizedHostname);
  const query = supabase
    .from("stores")
    .select("id")
    .eq("is_published", true)
    .limit(1);

  const { data: stores, error } = subdomainSlug
    ? await query.eq("slug", subdomainSlug)
    : await query.eq("custom_domain", normalizedHostname);

  const matchedStore = stores?.[0] as Pick<StoreRow, "id"> | undefined;
  if (error || !matchedStore) {
    return defaultStore;
  }

  const store = await getStoreById(matchedStore.id);
  return store ?? defaultStore;
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const supabase = getCmsSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, slug, description, currency_code, locale, is_published, store_type")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !store) {
    return null;
  }

  return await getStoreById(store.id);
}

export async function getStoreById(storeId: string): Promise<Store | null> {
  const supabase = getCmsSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const [
    { data: store, error: storeError },
    { data: businessProfile },
    { data: theme },
    { data: pages },
    { data: blocks },
    { data: siteSettings },
    themePackages,
    pageBlueprints,
  ] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug, description, currency_code, locale, is_published, store_type")
      .eq("id", storeId)
      .maybeSingle(),
    supabase
      .from("store_business_profiles")
      .select("blueprint_id")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("store_themes")
      .select("preset_id, theme_package_id, mode, typography, components, colors, custom_css, resolved_tokens")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("store_pages")
      .select("id, slug, title, seo_title, seo_description, is_homepage")
      .eq("store_id", storeId),
    supabase
      .from("store_page_blocks")
      .select("id, page_id, block_type, props, sort_order, is_visible")
      .eq("store_id", storeId),
    supabase
      .from("site_settings")
      .select("key, value")
      .eq("store_id", storeId)
      .in("key", ["hero_section", "promo_banner", "home_featured", "home_categories"]),
    loadThemePackages(supabase, storeId),
    loadPageBlueprints(supabase),
  ]);

  if (storeError || !store) {
    return null;
  }

  const blueprintKey = ((businessProfile as StoreBusinessProfileRow | null)?.blueprint_id ?? (store as StoreRow).store_type ?? null) as string | null;
  const blueprintDefinition = await loadStoreBlueprintById(supabase, blueprintKey);

  return buildResolvedStoreFromRecords(
    store as StoreRow,
    (businessProfile as StoreBusinessProfileRow | null) ?? null,
    (theme as StoreThemeRow | null) ?? null,
    (pages as StorePageRow[] | null) ?? [],
    (blocks as StoreBlockRow[] | null) ?? [],
    (siteSettings as SiteSettingRecord[] | null) ?? [],
    blueprintDefinition,
    themePackages,
    pageBlueprints,
  );
}

export function getHomepage(store: Store): StorePage {
  return store.pages.find((page) => page.isHomepage) ?? store.pages[0];
}

export function getPageBySlug(store: Store, slug: string): StorePage | null {
  return store.pages.find((page) => page.slug === slug) ?? null;
}
