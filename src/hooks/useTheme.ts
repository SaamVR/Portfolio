import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { themePresets } from "@/lib/themePresets";
import { useTheme as useNextTheme } from "next-themes";

export function useApplyTheme() {
  const { activeStoreId } = useAuth();
  const storeId = activeStoreId ?? null;

  const { data: themeId } = useQuery({
    queryKey: ["store_themes", storeId, "active_theme"],
    queryFn: async () => {
      if (!storeId) return "default";
      const { data } = await supabase
        .from("store_themes")
        .select("preset_id")
        .eq("store_id", storeId as string)
        .maybeSingle();
      return data?.preset_id ?? "default";
    },
    enabled: Boolean(storeId),
  });
  const { resolvedTheme } = useNextTheme();

  useEffect(() => {
    const preset = themePresets.find((t) => t.id === themeId);
    if (!preset) return; // default theme = CSS file values

    const vars = resolvedTheme === "light" ? preset.light : preset.dark;
    const root = document.documentElement;

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      // Clean up inline styles so CSS file defaults take over
      Object.keys(vars).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [themeId, resolvedTheme]);
}



