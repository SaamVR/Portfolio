import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";

export function ExitIntentTab({
  settings,
  update,
  SaveButton,
}: {
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  return (
    <TabsContent value="exit_intent">
      <div className="space-y-4">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Exit-Intent Offer Popup</CardTitle>
            <CardDescription>
              Capture leaving desktop visitors with a special offer before they close or leave your tab.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-4">
              <Switch
                checked={settings.exit_intent?.enabled ?? false}
                onCheckedChange={(v) => update("exit_intent", "enabled", v)}
              />
              <Label>Enable Exit-Intent Offer Popup</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Off by default. Turn it on only if you want the storefront to show a last-chance offer when desktop visitors move toward closing the tab.
            </p>
            <div className="grid gap-2">
              <Label>Popup Title</Label>
              <Input
                value={settings.exit_intent?.title ?? ""}
                onChange={(e) => update("exit_intent", "title", e.target.value)}
                placeholder="Optional popup headline"
              />
            </div>
            <div className="grid gap-2">
              <Label>Offer Text (Subtitle)</Label>
              <Input
                value={settings.exit_intent?.offer_text ?? ""}
                onChange={(e) => update("exit_intent", "offer_text", e.target.value)}
                placeholder="Optional supporting offer text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Discount Amount / Text</Label>
                <Input
                  value={settings.exit_intent?.discount_amount ?? ""}
                  onChange={(e) => update("exit_intent", "discount_amount", e.target.value)}
                  placeholder="e.g. 10% OFF or 200 off"
                />
              </div>
              <div className="grid gap-2">
                <Label>Discount Code</Label>
                <Input
                  value={settings.exit_intent?.discount_code ?? ""}
                  onChange={(e) => update("exit_intent", "discount_code", e.target.value)}
                  placeholder="Optional promo code"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Trigger Delay (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={settings.exit_intent?.min_seconds_on_page ?? 10}
                  onChange={(e) => update("exit_intent", "min_seconds_on_page", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Wait this long before the popup can appear so it does not interrupt people immediately.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Top Edge Tolerance (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={80}
                  value={settings.exit_intent?.trigger_top_tolerance ?? 12}
                  onChange={(e) => update("exit_intent", "trigger_top_tolerance", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Only trigger when the cursor leaves near the very top edge, not from the sides or bottom.
                </p>
              </div>
            </div>

            {/* Design Customization */}
            <div className="border-t border-border pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Design & Media</h3>
              <div className="flex items-center gap-4">
                <Label>Background Colour</Label>
                <input
                  type="color"
                  value={settings.exit_intent?.bg_color ?? "#101418"}
                  onChange={(e) => update("exit_intent", "bg_color", e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {settings.exit_intent?.bg_color ?? "#101418"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => update("exit_intent", "bg_color", "")}
                >
                  Reset
                </Button>
              </div>

              <div className="grid gap-2">
                <Label>Popup Image (Left Side)</Label>
                <CloudinaryUpload
                  value={settings.exit_intent?.image_url ?? ""}
                  onChange={(url) => update("exit_intent", "image_url", url)}
                  folder="popups"
                  accept="image/*"
                  label="Upload popup image"
                />
                {settings.exit_intent?.image_url && (
                  <div className="mt-2 overflow-hidden rounded-md border border-border">
                    <img src={settings.exit_intent.image_url} alt="Popup preview" className="h-32 w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <SaveButton settingKey="exit_intent" />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
