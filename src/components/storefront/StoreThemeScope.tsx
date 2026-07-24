"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useId } from "react";
import type { StoreTheme } from "@/lib/cms/schema";
import { scopeStoreThemeCss } from "@/lib/cms/theme-css";
import { getStoreThemeStyle } from "@/lib/cms/store-theme-style";

function sanitizeHtmlInjection(markup: string) {
  return markup
    .replace(/<script\b/gi, "<template data-blocked-script")
    .replace(/<\/script>/gi, "</template>");
}

export function StoreThemeScope({
  theme,
  children,
}: {
  theme: StoreTheme;
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [hasStoredThemePreference, setHasStoredThemePreference] = useState(false);
  const scopeId = useId().replace(/:/g, "");
  const scopeSelector = `[data-store-theme-scope="${scopeId}"]`;
  const fallbackMode = theme.mode === "light" ? "light" : "dark";

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasStoredThemePreference(Boolean(window.localStorage.getItem("theme")));
  }, []);

  const activeMode: StoreTheme["mode"] = hasStoredThemePreference
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
      className={activeMode}
      style={getStoreThemeStyle(effectiveTheme)}
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
