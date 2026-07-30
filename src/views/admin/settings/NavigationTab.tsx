import { TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";

export function NavigationTab({
  settings,
  setSettings,
  update,
  hasDedicatedShopPage,
  supportsSearchControls,
  supportsWishlistControls,
  supportsCartControls,
  storefrontContext,
  SaveButton,
  MobileSectionShell,
  MobileSectionJumper,
  StickySectionSaveBar,
}: {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  update: (category: string, field: string, value: any) => void;
  hasDedicatedShopPage: boolean;
  supportsSearchControls: boolean;
  supportsWishlistControls: boolean;
  supportsCartControls: boolean;
  storefrontContext: any;
  SaveButton: React.ComponentType<{ settingKey: string }>;
  MobileSectionShell: React.ComponentType<{ title: string; description: string; children: React.ReactNode }>;
  MobileSectionJumper: React.ComponentType<{ items: Array<{ id: string; label: string }> }>;
  StickySectionSaveBar: React.ComponentType<{ settingKey: string; title: string; hint: string }>;
}) {
  const primaryLinks = ((settings.navigation?.primary_links as { label: string; url: string }[]) ?? [
    { label: "Home", url: "/" },
    { label: "Shop", url: "/shop" },
    { label: "About", url: "/about" },
    { label: "Contact", url: "/contact" },
  ]);

  return (
    <TabsContent value="navigation">
      <MobileSectionShell
        title="Navigation"
        description="Control the shared storefront header and mobile menu without editing code."
      >
        <MobileSectionJumper
          items={[
            { id: "navigation-links", label: "Primary Links" },
            { id: "navigation-shop", label: "Feature Card" },
            { id: "navigation-visibility", label: "Visibility" },
          ]}
        />

        <div id="navigation-links" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Primary Links</h3>
              <p className="text-xs text-muted-foreground">These links drive the desktop header and mobile menu.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setSettings((prev) => ({
                  ...prev,
                  navigation: { ...prev.navigation, primary_links: [...primaryLinks, { label: "", url: "" }] },
                }));
              }}
            >
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          </div>
          {primaryLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <Input
                value={link.label}
                placeholder="Label"
                onChange={(e) => {
                  const updated = [...primaryLinks];
                  updated[i] = { ...updated[i], label: e.target.value };
                  setSettings((prev) => ({ ...prev, navigation: { ...prev.navigation, primary_links: updated } }));
                }}
              />
              <Input
                value={link.url}
                placeholder="/contact"
                onChange={(e) => {
                  const updated = [...primaryLinks];
                  updated[i] = { ...updated[i], url: e.target.value };
                  setSettings((prev) => ({ ...prev, navigation: { ...prev.navigation, primary_links: updated } }));
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive"
                onClick={() => {
                  const updated = primaryLinks.filter((_, idx) => idx !== i);
                  setSettings((prev) => ({ ...prev, navigation: { ...prev.navigation, primary_links: updated } }));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {hasDedicatedShopPage && (
          <div id="navigation-shop" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
            <h3 className="text-sm font-semibold text-foreground">{storefrontContext.pageLabel} Feature Card</h3>
            <p className="text-xs text-muted-foreground">
              Use this spotlight area to guide visitors toward the main place they should {storefrontContext.browseVerb} on this storefront.
            </p>
            <div className="grid gap-2">
              <Label>Primary Link Label</Label>
              <Input
                value={settings.navigation?.shop_label ?? ""}
                placeholder={storefrontContext.pageLabel.replace(" Page", "")}
                onChange={(e) => update("navigation", "shop_label", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Feature Title</Label>
              <Input
                value={settings.navigation?.shop_feature_title ?? ""}
                placeholder={`${storefrontContext.pageLabel.replace(" Page", "")} Highlights`}
                onChange={(e) => update("navigation", "shop_feature_title", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Feature Subtitle</Label>
              <Textarea
                value={settings.navigation?.shop_feature_subtitle ?? ""}
                placeholder={`Explain what visitors should ${storefrontContext.browseVerb} first.`}
                onChange={(e) => update("navigation", "shop_feature_subtitle", e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Feature Image URL</Label>
              <Input
                value={settings.navigation?.shop_feature_image ?? ""}
                placeholder="https://..."
                onChange={(e) => update("navigation", "shop_feature_image", e.target.value)}
              />
            </div>
          </div>
        )}

        <div id="navigation-visibility" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">Visibility</h3>
          {supportsSearchControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.navigation?.show_search ?? true}
                onCheckedChange={(v) => update("navigation", "show_search", v)}
              />
              <Label>Show desktop search</Label>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.navigation?.show_theme_toggle ?? true}
              onCheckedChange={(v) => update("navigation", "show_theme_toggle", v)}
            />
            <Label>Show theme toggle</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.navigation?.show_account ?? true}
              onCheckedChange={(v) => update("navigation", "show_account", v)}
            />
            <Label>Show account entry</Label>
          </div>
          {supportsWishlistControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.navigation?.show_wishlist ?? true}
                onCheckedChange={(v) => update("navigation", "show_wishlist", v)}
              />
              <Label>Show wishlist entry</Label>
            </div>
          )}
          {supportsCartControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.navigation?.show_cart ?? true}
                onCheckedChange={(v) => update("navigation", "show_cart", v)}
              />
              <Label>Show cart entry</Label>
            </div>
          )}
        </div>

        <SaveButton settingKey="navigation" />
        <StickySectionSaveBar settingKey="navigation" title="Navigation settings" hint="Save header links, menu feature copy, and icon visibility." />
      </MobileSectionShell>
    </TabsContent>
  );
}
