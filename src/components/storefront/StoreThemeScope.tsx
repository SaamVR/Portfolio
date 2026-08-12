"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useId } from "react";
import type { StoreTheme } from "@/lib/cms/schema";
import { scopeStoreThemeCss } from "@/lib/cms/theme-css";
import { getStoreThemeStyle } from "@/lib/cms/store-theme-style";
import type { ThemePackageDefinition } from "@/lib/theme-packages";

function sanitizeHtmlInjection(markup: string) {
  return markup
    .replace(/<script\b/gi, "<template data-blocked-script")
    .replace(/<\/script>/gi, "</template>");
}

export function StoreThemeScope({
  theme,
  children,
  respectVisitorPreference = true,
  themePackages,
}: {
  theme: StoreTheme;
  children: React.ReactNode;
  respectVisitorPreference?: boolean;
  themePackages?: ThemePackageDefinition[];
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const scopeId = useId().replace(/:/g, "");
  const scopeSelector = `[data-store-theme-scope="${scopeId}"]`;
  const fallbackMode = theme.mode === "light" ? "light" : "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeMode: StoreTheme["mode"] =
    respectVisitorPreference && mounted && resolvedTheme
      ? (resolvedTheme === "dark" ? "dark" : "light")
      : fallbackMode;
  const effectiveTheme = useMemo(
    () => (theme.mode === activeMode ? theme : { ...theme, mode: activeMode }),
    [activeMode, theme],
  );
  const scopedCustomCss = scopeStoreThemeCss(effectiveTheme.customCss, scopeSelector);
  const safeHeadInjection = useMemo(
    () => (effectiveTheme.globalHeadInjection ? sanitizeHtmlInjection(effectiveTheme.globalHeadInjection) : ""),
    [effectiveTheme.globalHeadInjection],
  );
  const safeBodyInjection = useMemo(
    () => (effectiveTheme.globalBodyInjection ? sanitizeHtmlInjection(effectiveTheme.globalBodyInjection) : ""),
    [effectiveTheme.globalBodyInjection],
  );

  return (
    <div
      data-store-theme-scope={scopeId}
      data-theme-mode={activeMode}
      data-store-aesthetic={effectiveTheme.aesthetic ?? "minimal"}
      data-store-density={effectiveTheme.densityScale ?? 0.5}
      className={activeMode}
      style={getStoreThemeStyle(effectiveTheme, themePackages)}
    >
      {safeHeadInjection ? (
        <template dangerouslySetInnerHTML={{ __html: safeHeadInjection }} />
      ) : null}
      {scopedCustomCss ? <style>{scopedCustomCss}</style> : null}
      {children}
      {safeBodyInjection ? (
        <template dangerouslySetInnerHTML={{ __html: safeBodyInjection }} />
      ) : null}
    </div>
  );
}
