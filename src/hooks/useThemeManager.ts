import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fallbackThemePackages,
  isThemePackageReferenceMissing,
  resolveThemePackageById,
  type ThemePackageDefinition,
} from "@/lib/theme-packages";

export type StoreThemeSettingsRow = {
  preset_id: string;
  theme_package_id?: string | null;
  theme_package_version?: number | null;
  mode: string;
  colors?: Record<string, string> | null;
  resolved_tokens?: { light?: Record<string, string>; dark?: Record<string, string> } | null;
  typography: { headingFont?: string; bodyFont?: string };
  components: { borderRadius?: string };
  custom_css?: string | null;
};

export const headingFontOptions = {
  inter: "Inter, sans-serif",
  playfair: "'Playfair Display', serif",
  roboto: "Roboto, sans-serif",
  outfit: "Outfit, sans-serif",
} as const;

export const bodyFontOptions = {
  inter: "Inter, sans-serif",
  roboto: "Roboto, sans-serif",
  opensans: "'Open Sans', sans-serif",
} as const;

export function resolveThemeFontValue(
  value: unknown,
  options: Record<string, string>,
  fallback: string,
) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  return options[value as keyof typeof options] ?? value;
}

export function resolveThemeFontControlValue(
  value: unknown,
  options: Record<string, string>,
  fallbackKey: string,
) {
  if (typeof value !== "string" || !value.trim()) {
    return fallbackKey;
  }
  const matched = Object.entries(options).find(([, fontValue]) => fontValue === value);
  return matched?.[0] ?? (value in options ? value : fallbackKey);
}

export function useThemeManager({
  activeStoreId,
  themeCustomizationSettings,
  themePackages = fallbackThemePackages,
  blueprintVersion,
}: {
  activeStoreId: string | null;
  themeCustomizationSettings?: Record<string, any>;
  themePackages?: ThemePackageDefinition[];
  blueprintVersion?: number | null;
}) {
  const { data: themeData } = useQuery({
    queryKey: ["store_themes", activeStoreId],
    queryFn: async (): Promise<StoreThemeSettingsRow> => {
      const { data } = await supabase
        .from("store_themes")
        .select("preset_id, theme_package_id, theme_package_version, mode, colors, resolved_tokens, typography, components, custom_css")
        .eq("store_id", activeStoreId as string)
        .maybeSingle();

      return {
        preset_id: data?.preset_id ?? "default",
        theme_package_id: data?.theme_package_id ?? null,
        theme_package_version: typeof data?.theme_package_version === "number" ? data.theme_package_version : null,
        mode: data?.mode ?? "dark",
        colors: (typeof data?.colors === "object" && data?.colors ? data.colors : null) as StoreThemeSettingsRow["colors"],
        resolved_tokens: (typeof data?.resolved_tokens === "object" && data?.resolved_tokens ? data.resolved_tokens : null) as StoreThemeSettingsRow["resolved_tokens"],
        typography: typeof data?.typography === "object" && data?.typography ? data.typography as StoreThemeSettingsRow["typography"] : {},
        components: typeof data?.components === "object" && data?.components ? data.components as StoreThemeSettingsRow["components"] : {},
        custom_css: data?.custom_css ?? null,
      };
    },
    enabled: Boolean(activeStoreId),
  });

  const activeThemeId = themeData?.theme_package_id ?? themeData?.preset_id ?? "default";
  const [localThemeId, setLocalThemeId] = useState(activeThemeId);
  const [localThemeMode, setLocalThemeMode] = useState<"light" | "dark">(themeData?.mode === "light" ? "light" : "dark");
  const [localThemeColors, setLocalThemeColors] = useState<Record<string, string>>(themeData?.colors ?? {});

  useEffect(() => {
    setLocalThemeId(activeThemeId);
  }, [activeThemeId]);

  useEffect(() => {
    setLocalThemeMode(themeData?.mode === "light" ? "light" : "dark");
    setLocalThemeColors(themeData?.colors ?? {});
  }, [themeData?.colors, themeData?.mode, themeData?.theme_package_id, themeData?.preset_id]);

  const activeThemePackage = useMemo(
    () => resolveThemePackageById(localThemeId, themePackages, themeData?.preset_id ?? "default"),
    [localThemeId, themeData?.preset_id, themePackages],
  );

  const isMissingActiveThemeReference = useMemo(
    () => isThemePackageReferenceMissing(themeData?.theme_package_id ?? null, themePackages),
    [themeData?.theme_package_id, themePackages],
  );

  const hasThemeVersionUpdate = useMemo(
    () =>
      typeof themeData?.theme_package_version === "number" &&
      typeof activeThemePackage.version === "number" &&
      themeData.theme_package_version < activeThemePackage.version,
    [activeThemePackage.version, themeData?.theme_package_version],
  );

  const hasBlueprintVersionUpdate = useMemo(
    () => typeof blueprintVersion === "number" && blueprintVersion < 1,
    [blueprintVersion],
  );

  const resolvedThemeMode = (themeData?.mode === "light" ? "light" : "dark") as "light" | "dark";

  const resolvedHeadingFont = resolveThemeFontValue(
    themeCustomizationSettings?.heading_font ?? themeData?.typography?.headingFont,
    headingFontOptions,
    activeThemePackage.tokens.typography.headingFont ?? "Inter, sans-serif",
  );

  const resolvedBodyFont = resolveThemeFontValue(
    themeCustomizationSettings?.body_font ?? themeData?.typography?.bodyFont,
    bodyFontOptions,
    activeThemePackage.tokens.typography.bodyFont ?? "Inter, sans-serif",
  );

  const resolvedHeadingFontControl = resolveThemeFontControlValue(
    themeCustomizationSettings?.heading_font ?? themeData?.typography?.headingFont,
    headingFontOptions,
    "inter",
  );

  const resolvedBodyFontControl = resolveThemeFontControlValue(
    themeCustomizationSettings?.body_font ?? themeData?.typography?.bodyFont,
    bodyFontOptions,
    "inter",
  );

  const resolvedBorderRadius =
    themeCustomizationSettings?.border_radius ??
    themeData?.components?.borderRadius ??
    activeThemePackage.tokens.components.borderRadius ??
    "0.5rem";

  const [saving, setSaving] = useState(false);

  const saveTheme = async () => {
    if (!activeStoreId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("store_themes").upsert(
        {
          store_id: activeStoreId,
          preset_id: localThemeId,
          theme_package_id: localThemeId,
          mode: localThemeMode,
          colors: localThemeColors,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" },
      );
      if (error) throw error;
      toast.success("Theme settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  return {
    themeData,
    activeThemeId,
    localThemeId,
    setLocalThemeId,
    localThemeMode,
    setLocalThemeMode,
    localThemeColors,
    setLocalThemeColors,
    activeThemePackage,
    isMissingActiveThemeReference,
    hasThemeVersionUpdate,
    hasBlueprintVersionUpdate,
    resolvedThemeMode,
    resolvedHeadingFont,
    resolvedBodyFont,
    resolvedHeadingFontControl,
    resolvedBodyFontControl,
    resolvedBorderRadius,
    saveTheme,
    saving,
  };
}
