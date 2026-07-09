import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Palette, Save, Loader2 } from "lucide-react";
import { themePresets } from "@/lib/themePresets";

export function ThemesTab({
  settings,
  update,
  SaveButton,
  localThemeId,
  handleThemeSelect,
  saveTheme,
  saving,
}: {
  settings: any;
  update: (category: string, key: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
  localThemeId: string;
  handleThemeSelect: (themeId: string) => void;
  saveTheme: () => void;
  saving: string | null;
}) {
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
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="mb-6 bg-secondary/50 p-1 w-full flex h-auto">
              <TabsTrigger value="presets" className="flex-1 py-2">Presets</TabsTrigger>
              <TabsTrigger value="layout" className="flex-1 py-2">Layout</TabsTrigger>
              <TabsTrigger value="typography" className="flex-1 py-2">Typography & Style</TabsTrigger>
            </TabsList>
            
            <TabsContent value="presets" className="space-y-6">
              <p className="text-sm text-muted-foreground">Choose a master colour scheme for your store. The theme applies to both light and dark modes.</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {themePresets.map((preset) => {
                  const isActive = localThemeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleThemeSelect(preset.id)}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                    >
                      {isActive && (
                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="mb-3 flex gap-1.5">
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: preset.preview.bg }} />
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: preset.preview.primary }} />
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: preset.preview.accent }} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
              <Button onClick={saveTheme} disabled={saving === "active_theme"} className="gap-2">
                {saving === "active_theme" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Apply Preset
              </Button>
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
                  <Select value={settings.theme_customization?.heading_font ?? "inter"} onValueChange={(v) => update("theme_customization", "heading_font", v)}>
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
                  <Select value={settings.theme_customization?.body_font ?? "inter"} onValueChange={(v) => update("theme_customization", "body_font", v)}>
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
                  <Select value={settings.theme_customization?.border_radius ?? "0.5rem"} onValueChange={(v) => update("theme_customization", "border_radius", v)}>
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
              <SaveButton settingKey="theme_customization" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
