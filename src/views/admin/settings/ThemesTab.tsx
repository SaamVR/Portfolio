import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Download, Import, Palette, Save, Loader2, CopyPlus } from "lucide-react";
import type { ThemePackageDefinition } from "@/lib/theme-packages";

export function ThemesTab({
  settings,
  update,
  SaveButton,
  localThemeId,
  activeThemeMode,
  activeHeadingFont,
  activeBodyFont,
  activeBorderRadius,
  handleThemeSelect,
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
  activeHeadingFont: string;
  activeBodyFont: string;
  activeBorderRadius: string;
  handleThemeSelect: (themeId: string) => void;
  saveTheme: () => void;
  saving: string | null;
  themePackages: ThemePackageDefinition[];
  onExportCurrentTheme: () => void;
  onSavePrivateTheme: () => void;
  onImportThemePackage: (raw: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
