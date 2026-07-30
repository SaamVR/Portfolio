import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function LoyaltyTab({
  settings,
  update,
  SaveButton,
}: {
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  return (
    <TabsContent value="loyalty">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Loyalty Program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-4">
            <Switch
              checked={settings.loyalty_settings?.enabled ?? false}
              onCheckedChange={(v) => update("loyalty_settings", "enabled", v)}
            />
            <Label>Enable Loyalty Program</Label>
          </div>
          <div className="grid gap-2">
            <Label>Point Currency Name</Label>
            <Input
              value={settings.loyalty_settings?.name ?? "Reward Points"}
              onChange={(e) => update("loyalty_settings", "name", e.target.value)}
              placeholder="e.g. Reward Points, Credits, Stars"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Earn Rate (Points per currency unit spent)</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.loyalty_settings?.earn_rate ?? 0.05}
                onChange={(e) => update("loyalty_settings", "earn_rate", parseFloat(e.target.value))}
                placeholder="0.05"
              />
              <p className="text-xs text-muted-foreground">
                Example: 0.05 means customers earn 5 points for every 100 units of your store currency spent.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Redemption Value (currency discount per point)</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.loyalty_settings?.redemption_value ?? 1}
                onChange={(e) => update("loyalty_settings", "redemption_value", parseFloat(e.target.value))}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                Example: 1 means 1 point gives a 1-unit discount in your store currency.
              </p>
            </div>
          </div>
          <SaveButton settingKey="loyalty_settings" />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
