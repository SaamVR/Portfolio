import type { StoreTheme } from "@/lib/cms/schema";
import { hexToHslChannels } from "@/lib/cms/store-theme-utils";

export type ThemeRecipe = {
  id: string;
  name: string;
  description: string;
  mode: StoreTheme["mode"];
  aesthetic: NonNullable<StoreTheme["aesthetic"]>;
  headingFont: string;
  bodyFont: string;
  radiusScale: number;
  densityScale: number;
  colors: {
    primary: string;
    accent: string;
    background: string;
    foreground: string;
  };
};

export const THEME_RECIPES: ThemeRecipe[] = [
  {
    id: "studio-clean",
    name: "Studio Clean",
    description: "Quiet, precise, and product-first.",
    mode: "light",
    aesthetic: "minimal",
    headingFont: "Poppins",
    bodyFont: "Inter",
    radiusScale: 0.42,
    densityScale: 0.48,
    colors: { primary: "#0f766e", accent: "#f59e0b", background: "#f8fafc", foreground: "#172033" },
  },
  {
    id: "editorial-noir",
    name: "Editorial Noir",
    description: "High-contrast storytelling with a premium edge.",
    mode: "dark",
    aesthetic: "editorial",
    headingFont: "Playfair Display",
    bodyFont: "Source Sans 3",
    radiusScale: 0.18,
    densityScale: 0.68,
    colors: { primary: "#d6b36a", accent: "#f4e7c5", background: "#11100f", foreground: "#f8f1e5" },
  },
  {
    id: "warm-artisan",
    name: "Warm Artisan",
    description: "Earthy, tactile, and made for human stories.",
    mode: "light",
    aesthetic: "artisan",
    headingFont: "Raleway",
    bodyFont: "Nunito",
    radiusScale: 0.7,
    densityScale: 0.62,
    colors: { primary: "#9a3412", accent: "#ca8a04", background: "#fff7ed", foreground: "#3f2417" },
  },
  {
    id: "electric-pop",
    name: "Electric Pop",
    description: "Bright launches, bold drops, and fast energy.",
    mode: "light",
    aesthetic: "playful-pop",
    headingFont: "Oswald",
    bodyFont: "Nunito",
    radiusScale: 0.88,
    densityScale: 0.42,
    colors: { primary: "#1d4ed8", accent: "#f43f5e", background: "#fffdf5", foreground: "#172554" },
  },
  {
    id: "glass-market",
    name: "Glass Market",
    description: "Cool depth and luminous commerce surfaces.",
    mode: "dark",
    aesthetic: "glassmorphism",
    headingFont: "Poppins",
    bodyFont: "Inter",
    radiusScale: 0.78,
    densityScale: 0.58,
    colors: { primary: "#2dd4bf", accent: "#38bdf8", background: "#07111f", foreground: "#e6fffb" },
  },
  {
    id: "raw-signal",
    name: "Raw Signal",
    description: "Sharp, direct, and intentionally unconventional.",
    mode: "light",
    aesthetic: "brutalist",
    headingFont: "Oswald",
    bodyFont: "Source Sans 3",
    radiusScale: 0.04,
    densityScale: 0.28,
    colors: { primary: "#111111", accent: "#facc15", background: "#f5f1e8", foreground: "#111111" },
  },
];

export function buildThemeRecipePatch(recipe: ThemeRecipe, currentTheme: StoreTheme): Partial<StoreTheme> {
  const colorEntries = {
    "--primary": recipe.colors.primary,
    "--accent": recipe.colors.accent,
    "--background": recipe.colors.background,
    "--foreground": recipe.colors.foreground,
  };
  const convertedColors = Object.fromEntries(
    Object.entries(colorEntries).flatMap(([key, value]) => {
      const channels = hexToHslChannels(value);
      return channels ? [[key, channels]] : [];
    }),
  );

  return {
    mode: recipe.mode,
    aesthetic: recipe.aesthetic,
    headingFont: recipe.headingFont,
    bodyFont: recipe.bodyFont,
    radiusScale: recipe.radiusScale,
    densityScale: recipe.densityScale,
    paletteSource: "manual",
    customCssVars: {
      ...currentTheme.customCssVars,
      ...convertedColors,
    },
  };
}

function luminance(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return 0;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((value) => (
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function getContrastRatio(foreground: string, background: string) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
