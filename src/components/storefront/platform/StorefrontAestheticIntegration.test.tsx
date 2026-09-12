import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultStore } from "@/lib/cms/default-store";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontSurface } from "./StorefrontSurface";

test("StoreThemeScope exposes semantic tokens and the selected aesthetic engine", () => {
  const markup = renderToStaticMarkup(
    <StoreThemeScope
      theme={{
        ...defaultStore.theme,
        aesthetic: "glassmorphism",
        mode: "light",
      }}
      respectVisitorPreference={false}
    >
      <StorefrontSurface tone="brand">Preview</StorefrontSurface>
    </StoreThemeScope>,
  );

  assert.match(markup, /data-store-aesthetic="glassmorphism"/);
  assert.match(markup, /data-store-aesthetic-engine="glass"/);
  assert.match(markup, /--store-brand:var\(--primary\)/);
  assert.match(markup, /--store-backdrop-blur:18px/);
  assert.match(markup, /data-store-surface="true"/);
  assert.match(markup, /data-store-surface-tone="brand"/);
});
