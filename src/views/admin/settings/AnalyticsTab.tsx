import { TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function AnalyticsTab({
  analyticsSettings,
  update,
  SaveButton,
  MobileSectionShell,
  MobileSectionJumper,
  StickySectionSaveBar,
}: {
  analyticsSettings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
  MobileSectionShell: React.ComponentType<{ title: string; description: string; children: React.ReactNode }>;
  MobileSectionJumper: React.ComponentType<{ items: Array<{ id: string; label: string }> }>;
  StickySectionSaveBar: React.ComponentType<{ settingKey: string; title: string; hint: string }>;
}) {
  return (
    <TabsContent value="analytics">
      <MobileSectionShell
        title="Analytics & Pixels"
        description="Connect GA4 and Meta Pixel while keeping merchant-owned storefront analytics inside your own platform too."
      >
        <MobileSectionJumper
          items={[
            { id: "analytics-first-party", label: "First-party" },
            { id: "analytics-ga4", label: "GA4" },
            { id: "analytics-meta", label: "Meta Pixel" },
            { id: "analytics-coverage", label: "Coverage" },
          ]}
        />

        <div id="analytics-first-party" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">First-party merchant analytics</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Capture visitor traffic, page views, search intent, product discovery, wishlist usage, cart behavior, checkout starts, and completed purchases into your own analytics table.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={analyticsSettings.firstPartyEnabled !== false}
              onCheckedChange={(value) => update("analytics_tracking", "firstPartyEnabled", value)}
            />
            <Label>Enable first-party analytics</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={analyticsSettings.trackTrafficSources !== false}
              onCheckedChange={(value) => update("analytics_tracking", "trackTrafficSources", value)}
            />
            <Label>Capture traffic source and UTM details</Label>
          </div>
        </div>

        <div id="analytics-ga4" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Google Analytics 4</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use a Measurement ID like <code>G-XXXXXXXXXX</code>. We send page views, item views, search, add-to-cart, checkout, and purchase events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={analyticsSettings.ga4Enabled === true}
              onCheckedChange={(value) => update("analytics_tracking", "ga4Enabled", value)}
            />
            <Label>Enable GA4</Label>
          </div>
          <div className="grid gap-2">
            <Label>GA4 Measurement ID</Label>
            <Input
              value={analyticsSettings.ga4MeasurementId ?? ""}
              placeholder="G-XXXXXXXXXX"
              onChange={(event) => update("analytics_tracking", "ga4MeasurementId", event.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div id="analytics-meta" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Meta Pixel</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use your numeric Pixel ID. We send PageView, ViewContent, Search, AddToCart, AddToWishlist, InitiateCheckout, and Purchase.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={analyticsSettings.metaPixelEnabled === true}
              onCheckedChange={(value) => update("analytics_tracking", "metaPixelEnabled", value)}
            />
            <Label>Enable Meta Pixel</Label>
          </div>
          <div className="grid gap-2">
            <Label>Meta Pixel ID</Label>
            <Input
              value={analyticsSettings.metaPixelId ?? ""}
              placeholder="123456789012345"
              onChange={(event) => update("analytics_tracking", "metaPixelId", event.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>

        <div id="analytics-coverage" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Tracked storefront coverage</h3>
            <p className="text-xs text-muted-foreground">
              This implementation prioritizes the events that matter to sellers and merchants most: traffic origin, search demand, product interest, wishlist intent, cart friction, checkout intent, and purchases.
            </p>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              Page visits: shop, product, cart, checkout, wishlist, account, track order, and order success.
            </div>
            <div className="rounded-lg border border-border p-3">
              Attribution: direct, referral, UTM source, medium, campaign, term, content, plus common ad click IDs.
            </div>
            <div className="rounded-lg border border-border p-3">
              Discovery intent: search keywords, result clicks, category and type tag clicks, and shop filter-driven discovery.
            </div>
            <div className="rounded-lg border border-border p-3">
              Commerce actions: add to cart, remove from cart, quantity changes, clear cart, begin checkout, and purchase.
            </div>
          </div>
        </div>

        <SaveButton settingKey="analytics_tracking" />
        <StickySectionSaveBar settingKey="analytics_tracking" title="Analytics settings" hint="Save first-party analytics, GA4, and Meta Pixel settings." />
      </MobileSectionShell>
    </TabsContent>
  );
}
