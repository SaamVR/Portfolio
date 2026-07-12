import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { themePresets } from "@/lib/themePresets";
import type { Database, Json } from "@/integrations/supabase/types";

export type ThemePackageSourceType =
  | "system"
  | "admin_shared"
  | "merchant_private"
  | "merchant_submitted";

export const themePackageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  preview: z.object({
    bg: z.string(),
    primary: z.string(),
    accent: z.string(),
  }),
  sourceType: z.enum(["system", "admin_shared", "merchant_private", "merchant_submitted"]),
  version: z.number().int().positive().default(1),
  compatibilityVersion: z.number().int().positive().default(1),
  presetId: z.string(),
  mode: z.enum(["light", "dark"]).default("dark"),
  tokens: z.object({
    light: z.record(z.string(), z.string()).default({}),
    dark: z.record(z.string(), z.string()).default({}),
    typography: z.object({
      headingFont: z.string().optional(),
      bodyFont: z.string().optional(),
    }).default({}),
    components: z.object({
      borderRadius: z.string().optional(),
    }).default({}),
  }),
  recipes: z.record(z.string(), z.unknown()).default({}),
  customCss: z.string().optional(),
  ownerStoreId: z.string().nullable().optional(),
});

export type ThemePackageDefinition = z.infer<typeof themePackageSchema>;

export const themePackageExportSchema = themePackageSchema.extend({
  schemaVersion: z.literal(1),
});

export function buildFallbackThemePackages(): ThemePackageDefinition[] {
  return themePresets.map((preset) =>
    themePackageSchema.parse({
      id: preset.id,
      slug: preset.id,
      name: preset.name,
      description: preset.description,
      preview: preset.preview,
      sourceType: "system",
      version: 1,
      compatibilityVersion: 1,
      presetId: preset.id,
      mode: "dark",
      tokens: {
        light: preset.light,
        dark: preset.dark,
        typography: {},
        components: {},
      },
      recipes: {},
    }),
  );
}

export const fallbackThemePackages = buildFallbackThemePackages();

type ThemePackageRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  preview_metadata: Json | null;
  source_type: ThemePackageSourceType | null;
  version: number | null;
  compatibility_version: number | null;
  preset_id: string | null;
  mode: "light" | "dark" | null;
  tokens: Json | null;
  component_recipes: Json | null;
  custom_css: string | null;
  owner_store_id: string | null;
};

function mergeThemePackage(row: ThemePackageRow): ThemePackageDefinition {
  const fallback = fallbackThemePackages.find((item) => item.id === row.id || item.slug === row.slug)
    ?? fallbackThemePackages.find((item) => item.presetId === row.preset_id)
    ?? fallbackThemePackages[0];
  const preview = (row.preview_metadata as ThemePackageDefinition["preview"] | null) ?? fallback.preview;
  const tokens = (row.tokens as ThemePackageDefinition["tokens"] | null) ?? fallback.tokens;
  return themePackageSchema.parse({
    ...fallback,
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? fallback.description,
    preview,
    sourceType: row.source_type ?? fallback.sourceType,
    version: row.version ?? fallback.version,
    compatibilityVersion: row.compatibility_version ?? fallback.compatibilityVersion,
    presetId: row.preset_id ?? fallback.presetId,
    mode: row.mode ?? fallback.mode,
    tokens: {
      ...fallback.tokens,
      ...tokens,
      typography: {
        ...fallback.tokens.typography,
        ...(tokens?.typography ?? {}),
      },
      components: {
        ...fallback.tokens.components,
        ...(tokens?.components ?? {}),
      },
    },
    recipes: (row.component_recipes as Record<string, unknown> | null) ?? fallback.recipes,
    customCss: row.custom_css ?? fallback.customCss,
    ownerStoreId: row.owner_store_id,
  });
}

export async function loadThemePackages(
  client: SupabaseClient<Database> | SupabaseClient<any>,
  storeId?: string | null,
): Promise<ThemePackageDefinition[]> {
  const query = (client as any)
    .from("theme_packages")
    .select([
      "id",
      "slug",
      "name",
      "description",
      "preview_metadata",
      "source_type",
      "version",
      "compatibility_version",
      "preset_id",
      "mode",
      "tokens",
      "component_recipes",
      "custom_css",
      "owner_store_id",
    ].join(","))
    .order("name");

  const { data, error } = storeId
    ? await query.or(`source_type.in.(system,admin_shared),owner_store_id.eq.${storeId}`)
    : await query.in("source_type", ["system", "admin_shared"]);

  if (error || !Array.isArray(data) || data.length === 0) {
    return fallbackThemePackages;
  }

  const merged = data.map((row: ThemePackageRow) => mergeThemePackage(row));
  const byId = new Map<string, ThemePackageDefinition>();
  for (const item of [...fallbackThemePackages, ...merged]) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

export function getThemePackageById(
  packageId: string | null | undefined,
  packages: ThemePackageDefinition[] = fallbackThemePackages,
): ThemePackageDefinition {
  return packages.find((item) => item.id === packageId || item.slug === packageId || item.presetId === packageId)
    ?? fallbackThemePackages.find((item) => item.id === packageId || item.presetId === packageId)
    ?? packages[0]
    ?? fallbackThemePackages[0];
}

export function buildThemePackageExport(themePackage: ThemePackageDefinition) {
  return themePackageExportSchema.parse({
    ...themePackage,
    schemaVersion: 1,
  });
}

export function parseThemePackageImport(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  return themePackageExportSchema.parse(parsed);
}
