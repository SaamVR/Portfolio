"use client";

import { useEffect, useState } from "react";
import { Check, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { StoreTheme } from "@/lib/cms/schema";
import type { ThemePackageDefinition } from "@/lib/theme-packages";
import { getContrastRatio, THEME_RECIPES, type ThemeRecipe } from "./theme-recipes";

const aestheticOptions: Array<{ value: NonNullable<StoreTheme["aesthetic"]>; label: string }> = [
  { value: "minimal", label: "Minimal" },
  { value: "editorial", label: "Editorial" },
  { value: "glassmorphism", label: "Glass" },
  { value: "fluid", label: "Fluid" },
  { value: "brutalist", label: "Brutalist" },
  { value: "neumorphism", label: "Soft depth" },
  { value: "retro", label: "Retro" },
  { value: "artisan", label: "Artisan" },
  { value: "dark-luxury", label: "Dark luxury" },
  { value: "playful-pop", label: "Playful pop" },
];

const spacingPresets = [
  { id: "compact", name: "Compact", description: "Dense and crisp", radius: 0.18, density: 0.25 },
  { id: "balanced", name: "Balanced", description: "A versatile default", radius: 0.55, density: 0.5 },
  { id: "soft", name: "Soft & Airy", description: "Open and welcoming", radius: 0.82, density: 0.78 },
];

type ThemeColorKey = "primary" | "accent" | "background" | "foreground";

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : null;
};

function ThemeColorControl({
  colorKey,
  color,
  onColorChange,
}: {
  colorKey: ThemeColorKey;
  color: string;
  onColorChange: (key: ThemeColorKey, value: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(color);

  useEffect(() => {
    setDraftValue(color);
  }, [color]);

  const commitValue = (value: string) => {
    const normalized = normalizeHexColor(value);
    if (normalized) {
      onColorChange(colorKey, normalized);
      setDraftValue(normalized);
      return;
    }

    setDraftValue(color);
  };

  return (
    <label className="rounded-xl border border-gray-200 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900">
      <span className="text-xs font-medium capitalize text-gray-700 dark:text-gray-300">{colorKey}</span>
      <span className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(event) => commitValue(event.target.value)}
          aria-label={`${colorKey} color`}
          data-testid={`theme-color-swatch-${colorKey}`}
          className="h-10 w-12 cursor-pointer rounded-md border-0 bg-transparent p-0"
        />
        <Input
          value={draftValue}
          aria-label={`${colorKey} hex color`}
          data-testid={`theme-color-input-${colorKey}`}
          inputMode="text"
          className="h-10 min-w-0 flex-1 font-mono text-xs uppercase"
          onChange={(event) => {
            const nextValue = event.target.value;
            setDraftValue(nextValue);
            const normalized = normalizeHexColor(nextValue);
            if (normalized) {
              onColorChange(colorKey, normalized);
            }
          }}
          onBlur={(event) => commitValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitValue(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
        />
      </span>
    </label>
  );
}

export function ThemePanel({
  theme,
  themePackages,
  colors,
  fonts,
  onThemePackageChange,
  onModeChange,
  onColorChange,
  onResetPalette,
  onApplyRecipe,
  onFontChange,
  onAestheticChange,
  onScaleChange,
  onScalePresetChange,
}: {
  theme: StoreTheme;
  themePackages: ThemePackageDefinition[];
  colors: Record<ThemeColorKey, string>;
  fonts: string[];
  onThemePackageChange: (packageId: string) => void;
  onModeChange: (mode: StoreTheme["mode"]) => void;
  onColorChange: (key: ThemeColorKey, value: string) => void;
  onResetPalette: () => void;
  onApplyRecipe: (recipe: ThemeRecipe) => void;
  onFontChange: (target: "heading" | "body", value: string) => void;
  onAestheticChange: (value: NonNullable<StoreTheme["aesthetic"]>) => void;
  onScaleChange: (target: "radius" | "density", value: number) => void;
  onScalePresetChange: (radius: number, density: number) => void;
}) {
  const currentPackage = themePackages.find((item) => item.id === theme.themePackageId || item.presetId === theme.presetId)
    ?? themePackages[0];
  const textContrast = getContrastRatio(colors.foreground, colors.background);
  const hasAccessibleTextContrast = textContrast >= 4.5;
  const radiusScale = theme.radiusScale ?? 0.55;
  const densityScale = theme.densityScale ?? 0.5;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-emerald-50/60 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Theme direction</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">Build a recognizable storefront</h3>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">Start with a complete art direction, then tune only what the brand needs.</p>
            </div>
            <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {THEME_RECIPES.map((recipe) => {
              const active = theme.aesthetic === recipe.aesthetic
                && theme.headingFont === recipe.headingFont
                && theme.mode === recipe.mode
                && Math.abs(radiusScale - recipe.radiusScale) < 0.05
                && Math.abs(densityScale - recipe.densityScale) < 0.05;
              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => onApplyRecipe(recipe)}
                  className={cn(
                    "group rounded-xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md",
                    active
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20 dark:bg-emerald-950/30"
                      : "border-gray-200 bg-white/80 dark:border-gray-800 dark:bg-gray-950/60",
                  )}
                >
                  <div className="flex h-12 overflow-hidden rounded-lg border border-black/5">
                    {Object.entries(recipe.colors).map(([colorRole, color]) => (
                      <span key={`${recipe.id}-${colorRole}`} className="flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-950 dark:text-white">{recipe.name}</span>
                    {active ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-gray-500 dark:text-gray-400">{recipe.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Theme foundation</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Choose a package and viewing mode before making overrides.</p>
        </div>
        {currentPackage ? (
          <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                {[
                  ["bg", currentPackage.preview.bg],
                  ["primary", currentPackage.preview.primary],
                  ["accent", currentPackage.preview.accent],
                ].map(([colorRole, color]) => (
                  <span key={`${currentPackage.id}-${colorRole}`} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950 dark:text-white">{currentPackage.name}</p>
                <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{currentPackage.description}</p>
              </div>
            </div>
          </div>
        ) : null}
        <Select value={theme.themePackageId ?? theme.presetId} onValueChange={onThemePackageChange}>
          <SelectTrigger className="h-11 border-gray-300 dark:border-gray-700"><SelectValue placeholder="Choose a theme package" /></SelectTrigger>
          <SelectContent>
            {themePackages.map((themePackage) => (
              <SelectItem key={themePackage.id} value={themePackage.id}>{themePackage.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {(["light", "dark"] as const).map((mode) => {
            const Icon = mode === "light" ? Sun : Moon;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onModeChange(mode)}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium capitalize transition",
                  theme.mode === mode
                    ? "bg-white text-gray-950 shadow-sm dark:bg-gray-950 dark:text-white"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                <Icon className="h-4 w-4" />
                {mode}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Theme Colors</h3>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Brand palette</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Package colors are shown here; edits become store-specific overrides.</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onResetPalette} className="h-8 gap-1.5 px-2 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(colors) as Array<[ThemeColorKey, string]>).map(([key, color]) => (
            <ThemeColorControl
              key={key}
              colorKey={key}
              color={color}
              onColorChange={onColorChange}
            />
          ))}
        </div>
        <div className={cn(
          "rounded-xl border p-3 text-xs",
          hasAccessibleTextContrast
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
        )}>
          <span className="font-semibold">Text contrast {textContrast.toFixed(1)}:1.</span>{" "}
          {hasAccessibleTextContrast ? "Readable for normal storefront text." : "Increase the difference between text and background."}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Type and character</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Pair expressive headings with a readable shopping font.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl text-gray-950 dark:text-white" style={{ fontFamily: theme.headingFont }}>A storefront with a point of view.</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: theme.bodyFont }}>Products stay clear, scannable, and easy to trust.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">Heading font</Label>
            <Select value={theme.headingFont ?? fonts[0]} onValueChange={(value) => onFontChange("heading", value)}>
              <SelectTrigger className="h-11 border-gray-300 dark:border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent>{fonts.map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">Body font</Label>
            <Select value={theme.bodyFont ?? fonts[0]} onValueChange={(value) => onFontChange("body", value)}>
              <SelectTrigger className="h-11 border-gray-300 dark:border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent>{fonts.map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600 dark:text-gray-400">Visual character</Label>
          <Select value={theme.aesthetic ?? "minimal"} onValueChange={(value) => onAestheticChange(value as NonNullable<StoreTheme["aesthetic"]>)}>
            <SelectTrigger className="h-11 border-gray-300 dark:border-gray-700"><SelectValue /></SelectTrigger>
            <SelectContent>{aestheticOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Shape and spacing</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Control how crisp or relaxed the storefront feels.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {spacingPresets.map((preset) => {
            const active = Math.abs(radiusScale - preset.radius) < 0.05 && Math.abs(densityScale - preset.density) < 0.05;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onScalePresetChange(preset.radius, preset.density)}
                className={cn(
                  "rounded-xl border p-2.5 text-left",
                  active ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-gray-800",
                )}
              >
                <span className="block text-xs font-semibold text-gray-900 dark:text-gray-100">{preset.name}</span>
                <span className="mt-1 block text-[10px] leading-4 text-gray-500">{preset.description}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Corner softness</Label><span className="text-xs text-gray-500">{Math.round(radiusScale * 100)}%</span></div>
            <Slider value={[radiusScale * 100]} max={100} step={5} onValueChange={([value]) => onScaleChange("radius", value / 100)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Breathing room</Label><span className="text-xs text-gray-500">{Math.round(densityScale * 100)}%</span></div>
            <Slider value={[densityScale * 100]} max={100} step={5} onValueChange={([value]) => onScaleChange("density", value / 100)} />
          </div>
        </div>
      </section>
    </div>
  );
}
