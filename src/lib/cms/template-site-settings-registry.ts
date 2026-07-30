import type { Json } from "@/integrations/supabase/types";
import type { StorePage } from "@/lib/cms/schema";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export const TEMPLATE_SETTINGS_ARCHIVE_KEY = "template_settings_archive";
export const TEMPLATE_PAGE_SNAPSHOTS_KEY = "template_page_snapshots";

export const templateScopedSettingKeys = [
  "announcement_bar",
  "navigation",
  "shop_page",
  "footer",
  "contact_page",
  "about_page",
  "faq_entries",
] as const;

export const merchantWideSettingKeys = [
  "brand_seo",
  "payment_settings",
  "delivery_settings",
  "notification_settings",
  "whatsapp_support",
  "loyalty_settings",
] as const;

export type TemplateScopedSettingKey = (typeof templateScopedSettingKeys)[number];
export type MerchantWideSettingKey = (typeof merchantWideSettingKeys)[number];

export type TemplateSettingsArchive = Partial<Record<StorefrontTemplateId, Partial<Record<TemplateScopedSettingKey, Json>>>>;
export type TemplatePageSnapshots = Partial<Record<StorefrontTemplateId, StorePage[]>>;

export function normalizeTemplateSettingsArchive(value: unknown): TemplateSettingsArchive {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as TemplateSettingsArchive;
}

export function normalizeTemplatePageSnapshots(value: unknown): TemplatePageSnapshots {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as TemplatePageSnapshots;
}

export function collectTemplateScopedSettings(
  settings: Record<string, unknown>,
): Partial<Record<TemplateScopedSettingKey, Json>> {
  return templateScopedSettingKeys.reduce<Partial<Record<TemplateScopedSettingKey, Json>>>((accumulator, key) => {
    const value = settings[key];
    if (value !== undefined) {
      accumulator[key] = value as Json;
    }
    return accumulator;
  }, {});
}

export function collectMerchantWideSettings(
  settings: Record<string, unknown>,
): Partial<Record<MerchantWideSettingKey, Json>> {
  return merchantWideSettingKeys.reduce<Partial<Record<MerchantWideSettingKey, Json>>>((accumulator, key) => {
    const value = settings[key];
    if (value !== undefined) {
      accumulator[key] = value as Json;
    }
    return accumulator;
  }, {});
}

export function updateTemplateSettingsArchive(
  archive: TemplateSettingsArchive,
  templateId: StorefrontTemplateId,
  settings: Partial<Record<TemplateScopedSettingKey, Json>>,
): TemplateSettingsArchive {
  return {
    ...archive,
    [templateId]: {
      ...(archive[templateId] ?? {}),
      ...settings,
    },
  };
}

export function cloneStorePages(pages: StorePage[]): StorePage[] {
  return JSON.parse(JSON.stringify(pages)) as StorePage[];
}

export function updateTemplatePageSnapshots(
  archive: TemplatePageSnapshots,
  templateId: StorefrontTemplateId,
  pages: StorePage[],
): TemplatePageSnapshots {
  return {
    ...archive,
    [templateId]: cloneStorePages(pages),
  };
}
