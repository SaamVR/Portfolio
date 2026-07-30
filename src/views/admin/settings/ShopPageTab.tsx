import { TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function ShopPageTab({
  settings,
  update,
  supportsSearchControls,
  supportsSizeControls,
  supportsSaleFilterControls,
  supportsPriceFilterControls,
  supportsColorControls,
  storefrontContext,
  SaveButton,
  MobileSectionShell,
  MobileSectionJumper,
  StickySectionSaveBar,
}: {
  settings: any;
  update: (category: string, field: string, value: any) => void;
  supportsSearchControls: boolean;
  supportsSizeControls: boolean;
  supportsSaleFilterControls: boolean;
  supportsPriceFilterControls: boolean;
  supportsColorControls: boolean;
  storefrontContext: any;
  SaveButton: React.ComponentType<{ settingKey: string }>;
  MobileSectionShell: React.ComponentType<{ title: string; description: string; children: React.ReactNode }>;
  MobileSectionJumper: React.ComponentType<{ items: Array<{ id: string; label: string }> }>;
  StickySectionSaveBar: React.ComponentType<{ settingKey: string; title: string; hint: string }>;
}) {
  return (
    <TabsContent value="shop_page">
      <MobileSectionShell
        title={storefrontContext.pageLabel}
        description={`Customize the page copy and shopper-facing controls for browsing ${storefrontContext.itemLabelPlural}.`}
      >
        <MobileSectionJumper
          items={[
            { id: "shop-page-copy", label: "Copy" },
            { id: "shop-page-states", label: "States" },
            { id: "shop-page-filters", label: "Filters" },
          ]}
        />

        <div id="shop-page-copy" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">Page Copy</h3>
          <div className="grid gap-2">
            <Label>Eyebrow</Label>
            <Input
              value={settings.shop_page?.eyebrow ?? ""}
              placeholder={storefrontContext.pageLabel.replace(" Page", "")}
              onChange={(e) => update("shop_page", "eyebrow", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input
              value={settings.shop_page?.title ?? ""}
              placeholder={`All ${storefrontContext.itemLabelPlural}`}
              onChange={(e) => update("shop_page", "title", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              value={settings.shop_page?.description ?? ""}
              placeholder={`Describe which ${storefrontContext.itemLabelPlural} visitors can ${storefrontContext.browseVerb} here.`}
              onChange={(e) => update("shop_page", "description", e.target.value)}
              rows={2}
            />
          </div>
          {supportsSearchControls && (
            <div className="grid gap-2">
              <Label>Search Placeholder</Label>
              <Input
                value={settings.shop_page?.search_placeholder ?? ""}
                placeholder={`Search ${storefrontContext.itemLabelPlural}...`}
                onChange={(e) => update("shop_page", "search_placeholder", e.target.value)}
              />
            </div>
          )}
          {supportsSizeControls && (
            <div className="grid gap-2">
              <Label>Size Guide Button Label</Label>
              <Input
                value={settings.shop_page?.size_guide_label ?? ""}
                placeholder="Size Guide"
                onChange={(e) => update("shop_page", "size_guide_label", e.target.value)}
              />
            </div>
          )}
        </div>

        <div id="shop-page-states" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">Empty and End States</h3>
          <div className="grid gap-2">
            <Label>Empty Title</Label>
            <Input
              value={settings.shop_page?.empty_title ?? ""}
              placeholder={`No ${storefrontContext.itemLabelPlural} found`}
              onChange={(e) => update("shop_page", "empty_title", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Empty Description</Label>
            <Textarea
              value={settings.shop_page?.empty_description ?? ""}
              placeholder={`Explain what the visitor should do next if they do not find the right ${storefrontContext.itemLabelSingular}.`}
              onChange={(e) => update("shop_page", "empty_description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label>End of Collection Message</Label>
            <Textarea
              value={settings.shop_page?.end_message ?? ""}
              placeholder={`You have reached the end of these ${storefrontContext.itemLabelPlural}.`}
              onChange={(e) => update("shop_page", "end_message", e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div id="shop-page-filters" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">Filter Visibility</h3>
          {supportsSaleFilterControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.shop_page?.show_sale_filter ?? true}
                onCheckedChange={(v) => update("shop_page", "show_sale_filter", v)}
              />
              <Label>Show sale filter</Label>
            </div>
          )}
          {supportsPriceFilterControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.shop_page?.show_price_filter ?? true}
                onCheckedChange={(v) => update("shop_page", "show_price_filter", v)}
              />
              <Label>Show price filter</Label>
            </div>
          )}
          {supportsSizeControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.shop_page?.show_size_filter ?? true}
                onCheckedChange={(v) => update("shop_page", "show_size_filter", v)}
              />
              <Label>Show size filter</Label>
            </div>
          )}
          {supportsColorControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.shop_page?.show_color_filter ?? true}
                onCheckedChange={(v) => update("shop_page", "show_color_filter", v)}
              />
              <Label>Show color filter</Label>
            </div>
          )}
          {supportsSizeControls && (
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.shop_page?.show_size_guide ?? true}
                onCheckedChange={(v) => update("shop_page", "show_size_guide", v)}
              />
              <Label>Show size guide button</Label>
            </div>
          )}
        </div>

        <SaveButton settingKey="shop_page" />
        <StickySectionSaveBar settingKey="shop_page" title="Shop page settings" hint="Save catalog copy and shopper-facing filter controls." />
      </MobileSectionShell>
    </TabsContent>
  );
}
