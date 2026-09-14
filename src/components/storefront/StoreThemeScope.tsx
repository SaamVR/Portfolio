"use client";

import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";
import type { StoreTheme } from "@/lib/cms/schema";
import { buildStorefrontAestheticCss, resolveStorefrontAesthetic } from "@/lib/cms/storefront-platform/rendering/aesthetic-engine";
import { resolveStorefrontSemanticTokens } from "@/lib/cms/storefront-platform/rendering/theme-tokens";
import { scopeStoreThemeCss } from "@/lib/cms/theme-css";
import { getStoreThemeStyle } from "@/lib/cms/store-theme-style";
import { DEFAULT_STORE_THEME_DENSITY_SCALE } from "@/lib/cms/store-theme-contract";
import { resolveStoreThemeForMode } from "@/lib/cms/store-theme-utils";
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
    () => resolveStoreThemeForMode(theme, activeMode),
    [activeMode, theme],
  );
  const semanticTokens = useMemo(
    () => resolveStorefrontSemanticTokens(effectiveTheme),
    [effectiveTheme],
  );
  const aesthetic = useMemo(
    () => resolveStorefrontAesthetic(effectiveTheme),
    [effectiveTheme],
  );
  const aestheticCss = useMemo(
    () => buildStorefrontAestheticCss(scopeSelector),
    [scopeSelector],
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
  const resolvedStyle = useMemo(
    () => ({
      ...getStoreThemeStyle(effectiveTheme, themePackages),
      ...semanticTokens,
      ...aesthetic.tokens,
    }) as CSSProperties,
    [aesthetic.tokens, effectiveTheme, semanticTokens, themePackages],
  );

  return (
    <div
      data-store-theme-scope={scopeId}
      data-theme-mode={activeMode}
      data-store-aesthetic={effectiveTheme.aesthetic ?? "minimal"}
      data-store-aesthetic-engine={aesthetic.id}
      data-store-density={effectiveTheme.densityScale ?? DEFAULT_STORE_THEME_DENSITY_SCALE}
      data-store-section-spacing-mode={effectiveTheme.sectionSpacing ? "blocks" : "legacy"}
      className={activeMode}
      style={resolvedStyle}
    >
      {safeHeadInjection ? (
        <template dangerouslySetInnerHTML={{ __html: safeHeadInjection }} />
      ) : null}
      <style>{aestheticCss}</style>
      {scopedCustomCss ? <style>{scopedCustomCss}</style> : null}
      {children}
      {safeBodyInjection ? (
        <template dangerouslySetInnerHTML={{ __html: safeBodyInjection }} />
      ) : null}
    </div>
  );
}
