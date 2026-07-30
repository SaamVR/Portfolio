import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle } from "lucide-react";

export function NotificationsTab({
  settings,
  update,
  SaveButton,
}: {
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  return (
    <TabsContent value="notifications">
      <div className="space-y-4">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Configure transactional email alerts for store orders and customer updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Notification Email Address</Label>
              <Input
                type="email"
                value={settings.notification_settings?.notification_email ?? ""}
                onChange={(e) => update("notification_settings", "notification_email", e.target.value)}
                placeholder="admin@yourstore.com"
              />
              <p className="text-xs text-muted-foreground">
                Email address where admin notifications for new orders will be sent.
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Customer Email Events</h3>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.notification_settings?.order_confirmation_enabled ?? true}
                  onCheckedChange={(v) => update("notification_settings", "order_confirmation_enabled", v)}
                />
                <Label>Send order confirmation email to customer</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.notification_settings?.shipping_update_enabled ?? true}
                  onCheckedChange={(v) => update("notification_settings", "shipping_update_enabled", v)}
                />
                <Label>Send shipping status update emails</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.notification_settings?.admin_order_alert_enabled ?? true}
                  onCheckedChange={(v) => update("notification_settings", "admin_order_alert_enabled", v)}
                />
                <Label>Send new order alert to admin email</Label>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Delivery Status</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {settings.notification_settings?.notification_email ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Transactional emails configured for {settings.notification_settings.notification_email}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-amber-500" />
                    <span>Provide an admin notification email to receive new order alerts.</span>
                  </>
                )}
              </div>
            </div>

            <SaveButton settingKey="notification_settings" />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
