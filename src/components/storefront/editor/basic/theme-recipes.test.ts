import assert from "node:assert/strict";
import test from "node:test";
import { defaultStore } from "@/lib/cms/default-store";
import { buildThemeRecipePatch, getContrastRatio, THEME_RECIPES } from "./theme-recipes";

test("theme recipes produce existing StoreTheme fields and HSL color tokens", () => {
  const recipe = THEME_RECIPES.find((item) => item.id === "editorial-noir");
  assert.ok(recipe);

  const patch = buildThemeRecipePatch(recipe, defaultStore.theme);

  assert.equal(patch.aesthetic, "editorial");
  assert.equal(patch.mode, "dark");
  assert.equal(patch.headingFont, "Playfair Display");
  assert.match(patch.customCssVars?.["--background"] ?? "", /^\d+ \d+% \d+%$/);
});

test("curated recipe text and background colors meet normal-text contrast", () => {
  for (const recipe of THEME_RECIPES) {
    assert.ok(
      getContrastRatio(recipe.colors.foreground, recipe.colors.background) >= 4.5,
      `${recipe.name} should meet WCAG AA contrast`,
    );
  }
});

test("contrast ratio identifies low-contrast palettes", () => {
  assert.ok(getContrastRatio("#111111", "#ffffff") > 15);
  assert.ok(getContrastRatio("#777777", "#888888") < 2);
});
