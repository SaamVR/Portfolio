import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { useTheme as useNextTheme } from "next-themes";
import { getStoreThemeStyleFromRecordWithPackages } from "@/lib/cms/store-theme-style";
import { loadThemePackages } from "@/lib/theme-packages";

export function useApplyTheme() {
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId ?? null;
  const { resolvedTheme } = useNextTheme();

  const { data: themeConfig } = useQuery({
    queryKey: ["store_themes", storeId, "active_theme"],
    queryFn: async () => {
      if (!storeId) {
        return null;
      }

      const { data } = await (supabase as any)
        .from("store_themes")
        .select("preset_id, theme_package_id, mode, colors, resolved_tokens, typography, components")
        .eq("store_id", storeId as string)
        .maybeSingle();

      return data ?? null;
    },
    enabled: Boolean(storeId),
  });

  const { data: themePackages = [] } = useQuery({
    queryKey: ["theme_packages", storeId, "apply_theme"],
    queryFn: async () => {
      if (!storeId) {
        return [];
      }

      return await loadThemePackages(supabase, storeId);
    },
    enabled: Boolean(storeId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!themeConfig) return;

    const style = getStoreThemeStyleFromRecordWithPackages({
      preset_id: themeConfig.preset_id ?? "default",
      theme_package_id: themeConfig.theme_package_id ?? null,
      mode: resolvedTheme === "light" ? "light" : (themeConfig.mode ?? "dark"),
      colors: themeConfig.colors ?? null,
      resolved_tokens: themeConfig.resolved_tokens ?? null,
      typography: themeConfig.typography ?? null,
      components: themeConfig.components ?? null,
    }, themePackages);
    const root = document.documentElement;
    const appliedKeys: string[] = [];

    Object.entries(style).forEach(([key, value]) => {
      if (typeof value === "string") {
        root.style.setProperty(key, value);
        appliedKeys.push(key);
      }
    });

    return () => {
      appliedKeys.forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [resolvedTheme, themeConfig, themePackages]);
}
