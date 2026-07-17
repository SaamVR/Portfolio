import { useId } from "react";
import type { StoreTheme } from "@/lib/cms/schema";
import { scopeStoreThemeCss } from "@/lib/cms/theme-css";
import { getStoreThemeStyle } from "@/lib/cms/store-theme-style";

export function StoreThemeScope({
  theme,
  children,
}: {
  theme: StoreTheme;
  children: React.ReactNode;
}) {
  const scopeId = useId().replace(/:/g, "");
  const scopeSelector = `[data-store-theme-scope="${scopeId}"]`;
  const scopedCustomCss = scopeStoreThemeCss(theme.customCss, scopeSelector);

  return (
    <div
      data-store-theme-scope={scopeId}
      data-theme-mode={theme.mode}
      style={getStoreThemeStyle(theme)}
    >
      {scopedCustomCss ? <style>{scopedCustomCss}</style> : null}
      {children}
    </div>
  );
}
