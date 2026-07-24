import type { StoreTheme } from "@/lib/cms/schema";
import { fallbackThemePackages, resolveThemePackageById, type ThemePackageDefinition } from "@/lib/theme-packages";

export const BASIC_THEME_TOKENS = [
  { key: "--primary", label: "Primary" },
  { key: "--accent", label: "Accent" },
  { key: "--background", label: "Background" },
] as const;

export type BasicThemeTokenKey = (typeof BASIC_THEME_TOKENS)[number]["key"];

export const GUIDED_THEME_TOKENS = [
  { key: "--primary", label: "Primary" },
  { key: "--accent", label: "Accent" },
  { key: "--background", label: "Background" },
  { key: "--foreground", label: "Foreground" },
  { key: "--card", label: "Surface" },
  { key: "--card-foreground", label: "Surface text" },
] as const;

export type GuidedThemeTokenKey = (typeof GUIDED_THEME_TOKENS)[number]["key"];

export function resolveStoreThemeVars(
  theme: Pick<StoreTheme, "presetId" | "themePackageId" | "mode" | "customCssVars">,
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
) {
  const themePackage = resolveThemePackageById(theme.themePackageId, themePackages, theme.presetId);
  const baseVars = theme.mode === "light" ? themePackage.tokens.light : themePackage.tokens.dark;

  return {
    themePackage,
    vars: {
      ...baseVars,
      ...theme.customCssVars,
    },
  };
}

function parseHexChannel(value: string) {
  const normalized = value.length === 1 ? `${value}${value}` : value;
  return Number.parseInt(normalized, 16);
}

export function hexToHslChannels(hex: string) {
  const normalized = hex.trim().replace("#", "");
  if (![3, 6].includes(normalized.length)) {
    return null;
  }

  const r = parseHexChannel(normalized.slice(0, normalized.length === 3 ? 1 : 2));
  const g = parseHexChannel(normalized.slice(normalized.length === 3 ? 1 : 2, normalized.length === 3 ? 2 : 4));
  const b = parseHexChannel(normalized.slice(normalized.length === 3 ? 2 : 4));

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return null;
  }

  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6;
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }
  }

  const hueDegrees = Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
  const saturationPercent = Math.round(saturation * 100);
  const lightnessPercent = Math.round(lightness * 100);

  return `${hueDegrees} ${saturationPercent}% ${lightnessPercent}%`;
}

function hueToRgb(p: number, q: number, t: number) {
  let next = t;
  if (next < 0) next += 1;
  if (next > 1) next -= 1;
  if (next < 1 / 6) return p + (q - p) * 6 * next;
  if (next < 1 / 2) return q;
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
  return p;
}

export function hslChannelsToHex(value: string) {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) {
    return null;
  }

  const hue = Number.parseFloat(match[1]) / 360;
  const saturation = Number.parseFloat(match[2]) / 100;
  const lightness = Number.parseFloat(match[3]) / 100;

  if ([hue, saturation, lightness].some((item) => Number.isNaN(item))) {
    return null;
  }

  let red: number;
  let green: number;
  let blue: number;

  if (saturation === 0) {
    red = green = blue = lightness;
  } else {
    const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;
    red = hueToRgb(p, q, hue + 1 / 3);
    green = hueToRgb(p, q, hue);
    blue = hueToRgb(p, q, hue - 1 / 3);
  }

  const toHex = (channel: number) => Math.round(channel * 255).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}
