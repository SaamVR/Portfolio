import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { themePresets } from "@/lib/themePresets";
import { useTheme as useNextTheme } from "next-themes";

export function useApplyTheme() {
  const { data: themeId } = useSiteSettings<string>("active_theme");
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
