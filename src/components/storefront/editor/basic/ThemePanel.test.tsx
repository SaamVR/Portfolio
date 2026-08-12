import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultStore } from "@/lib/cms/default-store";
import { fallbackThemePackages } from "@/lib/theme-packages";
import { ThemePanel } from "./ThemePanel";

test("theme swatches render repeated colors without duplicate React keys", () => {
  const packageWithRepeatedPreviewColors = {
    ...fallbackThemePackages[0],
    id: "duplicate-preview-colors",
    preview: {
      bg: "#111111",
      primary: "#111111",
      accent: "#facc15",
    },
  };
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };

  try {
    renderToStaticMarkup(
      <ThemePanel
        theme={{ ...defaultStore.theme, themePackageId: packageWithRepeatedPreviewColors.id }}
        themePackages={[packageWithRepeatedPreviewColors]}
        colors={{
          primary: "#111111",
          accent: "#facc15",
          background: "#f5f1e8",
          foreground: "#111111",
        }}
        fonts={["Inter", "Oswald", "Source Sans 3"]}
        onThemePackageChange={() => undefined}
        onModeChange={() => undefined}
        onColorChange={() => undefined}
        onResetPalette={() => undefined}
        onApplyRecipe={() => undefined}
        onFontChange={() => undefined}
        onAestheticChange={() => undefined}
        onScaleChange={() => undefined}
        onScalePresetChange={() => undefined}
      />,
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(errors.filter((message) => message.includes("same key")).length, 0);
});
