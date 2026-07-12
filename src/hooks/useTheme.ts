import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { useTheme as useNextTheme } from "next-themes";
import { getStoreThemeStyle } from "@/lib/cms/store-theme-style";

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
        .select("preset_id, mode, colors, typography, components")
        .eq("store_id", storeId as string)
        .maybeSingle();

      return data ?? null;
    },
    enabled: Boolean(storeId),
  });

  useEffect(() => {
    if (!themeConfig) return;

    const resolvedMode = resolvedTheme === "light" ? "light" : "dark";
    const style = getStoreThemeStyle({
      presetId: themeConfig.preset_id ?? "default",
      mode: resolvedMode,
      headingFont: themeConfig.typography?.headingFont,
      bodyFont: themeConfig.typography?.bodyFont,
      borderRadius: themeConfig.components?.borderRadius,
      customCssVars: themeConfig.colors ?? {},
    });
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
  }, [resolvedTheme, themeConfig]);
}
