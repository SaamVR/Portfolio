import type React from "react";
import { Truck } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type DeliverySettingsTabProps = {
  settings: Record<string, any>;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
};

export function DeliverySettingsTab({ settings, update, SaveButton }: DeliverySettingsTabProps) {
  const delivery = settings.delivery_settings ?? {};

  return (
    <TabsContent value="delivery" className="mt-0">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Delivery pricing</CardTitle>
          <CardDescription>Set the delivery zones, fees, and free-delivery threshold used by the storefront and checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4">
            <div>
              <Label htmlFor="delivery-enabled">Charge a delivery fee</Label>
              <p className="mt-1 text-xs text-muted-foreground">Turn this off when physical orders should not add a delivery charge.</p>
            </div>
            <Switch id="delivery-enabled" checked={delivery.enabled ?? true} onCheckedChange={(checked) => update("delivery_settings", "enabled", checked)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="delivery-primary-zone">Primary zone</Label>
              <Input id="delivery-primary-zone" className="min-h-11" value={delivery.primary_zone_label ?? "Inside city"} onChange={(event) => update("delivery_settings", "primary_zone_label", event.target.value)} placeholder="Inside city" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delivery-secondary-zone">Extended zone</Label>
              <Input id="delivery-secondary-zone" className="min-h-11" value={delivery.secondary_zone_label ?? "Outside city"} onChange={(event) => update("delivery_settings", "secondary_zone_label", event.target.value)} placeholder="Outside city" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delivery-primary-fee">Primary zone fee (BDT)</Label>
              <Input id="delivery-primary-fee" className="min-h-11" type="number" min={0} value={delivery.delivery_fee ?? 80} onChange={(event) => update("delivery_settings", "delivery_fee", Number(event.target.value || 0))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delivery-secondary-fee">Extended zone fee (BDT)</Label>
              <Input id="delivery-secondary-fee" className="min-h-11" type="number" min={0} value={delivery.delivery_fee_outside ?? 150} onChange={(event) => update("delivery_settings", "delivery_fee_outside", Number(event.target.value || 0))} />
            </div>
          </div>

          <div className="grid gap-2 sm:max-w-md">
            <Label htmlFor="delivery-free-threshold">Free-delivery threshold (BDT)</Label>
            <Input id="delivery-free-threshold" className="min-h-11" type="number" min={0} value={delivery.free_threshold ?? 2000} onChange={(event) => update("delivery_settings", "free_threshold", Number(event.target.value || 0))} />
            <p className="text-xs text-muted-foreground">Orders at or above this amount qualify for free delivery.</p>
          </div>

          <SaveButton settingKey="delivery_settings" />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
