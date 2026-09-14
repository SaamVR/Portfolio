import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoyaltyTab({
  settings,
}: {
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  const hadLegacyProgramEnabled = settings.loyalty_settings?.enabled === true;

  return (
    <TabsContent value="loyalty">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Loyalty Program</CardTitle>
          <CardDescription>
            Loyalty earning and redemption are not available yet. EZComo will only enable this after points balances, reversals, and redemption are ledger-backed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Coming soon — currently inactive</p>
            <p className="mt-1 leading-6">
              No shopper will be promised points and no loyalty discount will be applied until the authoritative loyalty ledger is released.
            </p>
            {hadLegacyProgramEnabled ? (
              <p className="mt-2 text-xs">Your previously saved loyalty settings are retained, but they are inactive for storefront checkout.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
