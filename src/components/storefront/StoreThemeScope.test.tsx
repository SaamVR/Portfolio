import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultStore } from "@/lib/cms/default-store";
import { fallbackThemePackages, type ThemePackageDefinition } from "@/lib/theme-packages";
import { StoreThemeScope } from "./StoreThemeScope";

const customThemePackage: ThemePackageDefinition = {
  ...fallbackThemePackages[0],
  id: "merchant-electric-green",
  slug: "merchant-electric-green",
  name: "Merchant Electric Green",
  presetId: "merchant-electric-green",
  preview: {
    bg: "#020617",
    primary: "#84cc16",
    accent: "#22c55e",
  },
  tokens: {
    ...fallbackThemePackages[0].tokens,
    dark: {
      ...fallbackThemePackages[0].tokens.dark,
      "--primary": "84 81% 44%",
      "--background": "222 47% 11%",
    },
    light: {
      ...fallbackThemePackages[0].tokens.light,
      "--primary": "84 81% 44%",
      "--background": "0 0% 100%",
    },
  },
};

test("StoreThemeScope resolves CSS variables from the editor theme package catalog", () => {
  const markup = renderToStaticMarkup(
    <StoreThemeScope
      theme={{
        ...defaultStore.theme,
        themePackageId: customThemePackage.id,
        presetId: customThemePackage.presetId,
        mode: "dark",
        customCssVars: {},
      }}
      themePackages={[customThemePackage]}
      respectVisitorPreference={false}
    >
      <div>Preview</div>
    </StoreThemeScope>,
  );

  assert.match(markup, /--primary:84 81% 44%/);
  assert.match(markup, /--background:222 47% 11%/);
});
