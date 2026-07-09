import type { CSSProperties } from "react";
import { themePresets } from "@/lib/themePresets";
import type { StoreTheme } from "@/lib/cms/schema";

export function getStoreThemeStyle(theme: StoreTheme): CSSProperties {
  const preset = themePresets.find((item) => item.id === theme.presetId) ?? themePresets[0];
  const vars = theme.mode === "light" ? preset.light : preset.dark;
  const style: CSSProperties & Record<string, string> = {};

  for (const [key, value] of Object.entries(vars)) {
    style[key] = value;
  }

  if (theme.headingFont) {
    style["--font-heading"] = theme.headingFont;
  }

  if (theme.bodyFont) {
    style["--font-body"] = theme.bodyFont;
  }

  if (theme.borderRadius) {
    style["--radius"] = theme.borderRadius;
  }

  for (const [key, value] of Object.entries(theme.customCssVars)) {
    style[key] = value;
  }

  return style;
}
