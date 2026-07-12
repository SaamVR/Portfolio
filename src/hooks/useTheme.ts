import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { useTheme as useNextTheme } from "next-themes";
import { getStoreThemeStyleFromRecord } from "@/lib/cms/store-theme-style";

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
        .select("preset_id, mode, colors, resolved_tokens, typography, components")
        .eq("store_id", storeId as string)
        .maybeSingle();

      return data ?? null;
    },
    enabled: Boolean(storeId),
  });

  useEffect(() => {
    if (!themeConfig) return;

    const style = getStoreThemeStyleFromRecord({
      preset_id: themeConfig.preset_id ?? "default",
      mode: resolvedTheme === "light" ? "light" : (themeConfig.mode ?? "dark"),
      colors: themeConfig.colors ?? null,
      resolved_tokens: themeConfig.resolved_tokens ?? null,
      typography: themeConfig.typography ?? null,
      components: themeConfig.components ?? null,
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
