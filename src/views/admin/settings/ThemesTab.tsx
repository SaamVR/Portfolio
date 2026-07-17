import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Download, Import, Palette, Save, Loader2, CopyPlus, Sparkles, SwatchBook, Wand2 } from "lucide-react";
import type { ThemePackageDefinition } from "@/lib/theme-packages";
import { GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";

const guidedThemeDescriptions: Record<string, string> = {
  "--primary": "Main buttons and high-attention actions",
  "--accent": "Highlights, badges, and supporting contrast",
  "--background": "Overall page backdrop",
  "--foreground": "Main reading text",
  "--card": "Cards, section panels, and raised surfaces",
  "--card-foreground": "Text used on cards and panels",
};

export function ThemesTab({
  settings,
  update,
  SaveButton,
  localThemeId,
  activeThemeMode,
  localThemeColors,
  activeHeadingFont,
  activeBodyFont,
  activeBorderRadius,
  handleThemeSelect,
  handleThemeModeChange,
  handleThemeColorChange,
  handleThemeColorReset,
  saveTheme,
  saving,
  themePackages,
  onExportCurrentTheme,
  onSavePrivateTheme,
  onImportThemePackage,
}: {
  settings: any;
  update: (category: string, key: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
  localThemeId: string;
  activeThemeMode: "light" | "dark";
  localThemeColors: Record<string, string>;
  activeHeadingFont: string;
  activeBodyFont: string;
  activeBorderRadius: string;
  handleThemeSelect: (themeId: string) => void;
  handleThemeModeChange: (mode: "light" | "dark") => void;
  handleThemeColorChange: (key: string, value: string) => void;
  handleThemeColorReset: () => void;
  saveTheme: () => void;
  saving: string | null;
  themePackages: ThemePackageDefinition[];
  onExportCurrentTheme: () => void;
  onSavePrivateTheme: () => void;
  onImportThemePackage: (raw: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedThemePreview = useMemo(
    () => resolveStoreThemeVars({
      presetId: localThemeId,
      themePackageId: localThemeId,
      mode: activeThemeMode,
      customCssVars: localThemeColors,
    }, themePackages).vars,
    [activeThemeMode, localThemeColors, localThemeId, themePackages],
  );
  const activeThemePackage = useMemo(
    () => themePackages.find((item) => item.id === localThemeId) ?? themePackages[0],
    [localThemeId, themePackages],
  );

  return (
    <TabsContent value="themes">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Storefront Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="library" className="w-full">
            <TabsList className="mb-6 bg-secondary/50 p-1 w-full flex h-auto">
              <TabsTrigger value="library" className="flex-1 py-2">Theme Library</TabsTrigger>
              <TabsTrigger value="layout" className="flex-1 py-2">Layout</TabsTrigger>
              <TabsTrigger value="typography" className="flex-1 py-2">Typography & Style</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Guided brand styling
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pick a theme direction, choose light or dark mode, then adjust a few brand colors. Merchants should not need CSS to make the storefront feel like their business.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "1. Pick a style", hint: "Choose the closest ready-made look." },
                      { label: "2. Choose a mode", hint: "Preview how bright or moody the store should feel." },
                      { label: "3. Tune brand colors", hint: "Only change the colors that matter most." },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border bg-secondary/30 p-3">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <SwatchBook className="h-4 w-4 text-primary" />
                    Live theme summary
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Current style: {activeThemePackage?.name ?? "Theme"} in {activeThemeMode} mode.
                  </p>
                  <div className="mt-4 rounded-2xl border border-border/80 p-4" style={{ backgroundColor: hslChannelsToHex(resolvedThemePreview["--background"] ?? "") ?? "#f8fafc" }}>
                    <div
                      className="rounded-2xl border p-4 shadow-sm"
                      style={{
                        backgroundColor: hslChannelsToHex(resolvedThemePreview["--card"] ?? "") ?? "#ffffff",
                        color: hslChannelsToHex(resolvedThemePreview["--card-foreground"] ?? "") ?? "#111827",
                        borderColor: "rgba(148, 163, 184, 0.24)",
                      }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Store preview</p>
                      <h3 className="mt-2 text-lg font-semibold">Hero, cards, and CTA colors stay in sync</h3>
                      <p className="mt-2 text-sm opacity-80">Use the few guided controls below to make the storefront feel more premium without risking the layout.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: hslChannelsToHex(resolvedThemePreview["--primary"] ?? "") ?? "#111827",
                            color: hslChannelsToHex(resolvedThemePreview["--background"] ?? "") ?? "#ffffff",
                          }}
                        >
                          Primary action
                        </span>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: hslChannelsToHex(resolvedThemePreview["--accent"] ?? "") ?? "#e2e8f0",
                            color: hslChannelsToHex(resolvedThemePreview["--foreground"] ?? "") ?? "#111827",
                          }}
                        >
                          Accent badge
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={saveTheme} disabled={saving === "active_theme"} className="gap-2">
                  {saving === "active_theme" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Apply Theme
                </Button>
                <Button type="button" variant="outline" onClick={onSavePrivateTheme} disabled={saving === "private_theme"} className="gap-2">
                  {saving === "private_theme" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4" />}
                  Save as Private Theme
                </Button>
                <Button type="button" variant="outline" onClick={onExportCurrentTheme} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export JSON
                </Button>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving === "import_theme"} className="gap-2">
                  {saving === "import_theme" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Import className="h-4 w-4" />}
                  Import JSON
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const raw = await file.text();
                    onImportThemePackage(raw);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Choose a shared or private theme package, then install it as a store-local theme snapshot. Export and import stay store-scoped unless an admin promotes a package into the shared library.
              </p>
              <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <Label className="text-sm font-semibold text-foreground">Store mood</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Light usually feels cleaner and more retail-friendly. Dark works better for bold, premium, or gadget-heavy brands.</p>
                  <div className="mt-3 inline-flex rounded-full border border-border bg-background p-1">
                    {(["light", "dark"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleThemeModeChange(mode)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${activeThemeMode === mode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {mode === "light" ? "Light and airy" : "Dark and cinematic"}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={handleThemeColorReset} className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  Reset colors to theme defaults
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {themePackages.map((themePackage) => {
                  const isActive = localThemeId === themePackage.id;
                  return (
                    <button
                      key={themePackage.id}
                      type="button"
                      onClick={() => handleThemeSelect(themePackage.id)}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                    >
                      {isActive && (
                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="mb-3 flex gap-1.5">
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.bg }} />
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.primary }} />
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.accent }} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{themePackage.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{themePackage.description}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{themePackage.sourceType.replace(/_/g, " ")}</p>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Palette className="h-4 w-4 text-primary" />
                  Brand color overrides
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  These are store-only adjustments layered on top of the selected theme. Keep changes small for the easiest, safest results.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {GUIDED_THEME_TOKENS.map((token) => {
                    const currentValue = localThemeColors[token.key] ?? resolvedThemePreview[token.key] ?? "";

                    return (
                      <div key={token.key} className="rounded-xl border border-border bg-secondary/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Label className="text-sm font-semibold text-foreground">{token.label}</Label>
                            <p className="mt-1 text-xs text-muted-foreground">{guidedThemeDescriptions[token.key] ?? "Theme token"}</p>
                          </div>
                          <Input
                            type="color"
                            value={hslChannelsToHex(currentValue) ?? "#000000"}
                            onChange={(event) => {
                              const next = hexToHslChannels(event.target.value);
                              if (!next) return;
                              handleThemeColorChange(token.key, next);
                            }}
                            className="h-10 w-14 shrink-0 p-1"
                          />
                        </div>
                        <Input
                          value={currentValue}
                          onChange={(event) => handleThemeColorChange(token.key, event.target.value)}
                          className="mt-3"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layout" className="space-y-6">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Sidebar Position (Shop Page)</Label>
                  <Select value={settings.theme_customization?.sidebar_position ?? "left"} onValueChange={(v) => update("theme_customization", "sidebar_position", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left Sidebar (Classic)</SelectItem>
                      <SelectItem value="right">Right Sidebar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Changes where the filter sidebar appears.</p>
                </div>
                <div className="space-y-3">
                  <Label>Max Container Width</Label>
                  <Select value={settings.theme_customization?.container_width ?? "standard"} onValueChange={(v) => update("theme_customization", "container_width", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="narrow">Narrow (1024px)</SelectItem>
                      <SelectItem value="standard">Standard (1280px)</SelectItem>
                      <SelectItem value="wide">Wide (1536px)</SelectItem>
                      <SelectItem value="full">Full Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Desktop Product Grid</Label>
                  <Select value={settings.theme_customization?.product_grid ?? "4"} onValueChange={(v) => update("theme_customization", "product_grid", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Columns per row</SelectItem>
                      <SelectItem value="4">4 Columns per row</SelectItem>
                      <SelectItem value="5">5 Columns per row</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Navigation Bar Style</Label>
                  <Select value={settings.theme_customization?.nav_style ?? "sticky"} onValueChange={(v) => update("theme_customization", "nav_style", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sticky">Sticky (Scrolls with page)</SelectItem>
                      <SelectItem value="static">Static (Stays at top)</SelectItem>
                      <SelectItem value="hidden">Auto-hide on scroll down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SaveButton settingKey="theme_customization" />
            </TabsContent>

            <TabsContent value="typography" className="space-y-6">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Heading Font Family</Label>
                  <Select value={settings.theme_customization?.heading_font ?? activeHeadingFont} onValueChange={(v) => update("theme_customization", "heading_font", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inter">Inter (Modern & Clean)</SelectItem>
                      <SelectItem value="playfair">Playfair Display (Elegant & Serif)</SelectItem>
                      <SelectItem value="roboto">Roboto (Tech/Standard)</SelectItem>
                      <SelectItem value="outfit">Outfit (Geometric)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Body Font Family</Label>
                  <Select value={settings.theme_customization?.body_font ?? activeBodyFont} onValueChange={(v) => update("theme_customization", "body_font", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="opensans">Open Sans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Base Text Size</Label>
                  <Select value={settings.theme_customization?.text_size ?? "16"} onValueChange={(v) => update("theme_customization", "text_size", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14">Small (14px)</SelectItem>
                      <SelectItem value="16">Standard (16px)</SelectItem>
                      <SelectItem value="18">Large (18px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Global Border Radius (Buttons/Cards)</Label>
                  <Select value={settings.theme_customization?.border_radius ?? activeBorderRadius} onValueChange={(v) => update("theme_customization", "border_radius", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sharp (0px)</SelectItem>
                      <SelectItem value="0.25rem">Subtle (4px)</SelectItem>
                      <SelectItem value="0.5rem">Standard (8px)</SelectItem>
                      <SelectItem value="1rem">Rounded (16px)</SelectItem>
                      <SelectItem value="9999px">Pill (Fully rounded)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Current installed theme mode: {activeThemeMode}. Typography and radius controls start from the active store theme unless you explicitly override them.
              </p>
              <SaveButton settingKey="theme_customization" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
