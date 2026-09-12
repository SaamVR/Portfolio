import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultStore } from "@/lib/cms/default-store";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontSurface } from "./StorefrontSurface";
import { fallbackThemePackages, type ThemePackageDefinition } from "@/lib/theme-packages";

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


const merchantBrandPackage: ThemePackageDefinition = {
  ...fallbackThemePackages[0],
  id: "runtime-2-merchant-brand",
  slug: "runtime-2-merchant-brand",
  name: "Runtime 2 Merchant Brand",
  presetId: "runtime-2-merchant-brand",
  preview: { bg: "#f4efe6", primary: "#123456", accent: "#c65f32" },
  tokens: {
    ...fallbackThemePackages[0].tokens,
    light: {
      ...fallbackThemePackages[0].tokens.light,
      "--background": "40 31% 93%",
      "--primary": "210 65% 20%",
      "--accent": "18 58% 49%",
    },
    dark: {
      ...fallbackThemePackages[0].tokens.dark,
      "--background": "210 25% 9%",
      "--primary": "210 65% 65%",
      "--accent": "18 58% 58%",
    },
  },
};

test("all proof aesthetics preserve merchant palette variables end to end", () => {
  for (const aesthetic of ["minimal", "editorial", "glassmorphism", "artisan"] as const) {
    const markup = renderToStaticMarkup(
      <StoreThemeScope
        theme={{
          ...defaultStore.theme,
          aesthetic,
          mode: "light",
          themePackageId: merchantBrandPackage.id,
          presetId: merchantBrandPackage.presetId,
          customCssVars: {},
        }}
        themePackages={[merchantBrandPackage]}
        respectVisitorPreference={false}
      >
        <StorefrontSurface tone="brand">Brand</StorefrontSurface>
      </StoreThemeScope>,
    );

    assert.match(markup, /--background:40 31% 93%/, aesthetic);
    assert.match(markup, /--primary:210 65% 20%/, aesthetic);
    assert.match(markup, /--accent:18 58% 49%/, aesthetic);
    assert.match(markup, /--store-brand:var\(--primary\)/, aesthetic);
    assert.match(markup, /--store-accent:var\(--accent\)/, aesthetic);
  }
});

test("merchant scoped custom CSS is emitted after the aesthetic engine CSS", () => {
  const markup = renderToStaticMarkup(
    <StoreThemeScope
      theme={{
        ...defaultStore.theme,
        aesthetic: "glassmorphism",
        mode: "light",
        customCss: "[data-store-surface] { box-shadow: none; }",
      }}
      respectVisitorPreference={false}
    >
      <StorefrontSurface>Override</StorefrontSurface>
    </StoreThemeScope>,
  );

  const engineIndex = markup.indexOf("--store-backdrop-blur: 6px");
  const merchantIndex = markup.indexOf("box-shadow: none");
  assert.ok(engineIndex >= 0);
  assert.ok(merchantIndex > engineIndex);
});
