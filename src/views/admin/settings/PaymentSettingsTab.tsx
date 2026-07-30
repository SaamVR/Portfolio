import { useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, KeyRound, AlertTriangle, ShieldCheck } from "lucide-react";
import type { usePaymentGateway } from "@/hooks/usePaymentGateway";

export function PaymentSettingsTab({
  paymentGateway,
  settings,
  update,
  SaveButton,
}: {
  paymentGateway: ReturnType<typeof usePaymentGateway>;
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  const {
    bkashConnectionDraft,
    setBkashConnectionDraft,
    bkashConnection,
    bkashConnectionLoading,
    savingAction,
    saveBkashConnection,
    revokeBkashConnection,
  } = paymentGateway;

  const [showRotateForm, setShowRotateForm] = useState(false);

  return (
    <TabsContent value="payment">
      <div className="space-y-6">
        {/* bKash Connection Card */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="font-bold text-[#E2136E]">bKash</span> Payment Gateway
                </CardTitle>
                <CardDescription>
                  Merchant bKash connection via direct API integration.
                </CardDescription>
              </div>
              {bkashConnection?.configured && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Connected
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {bkashConnectionLoading ? (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading bKash connection status...
              </div>
            ) : bkashConnection?.configured && !showRotateForm ? (
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Environment</Label>
                    <p className="font-medium capitalize">{bkashConnection.metadata.environment}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">App Key Hint</Label>
                    <p className="font-mono text-xs">{bkashConnection.metadata.appKeyHint || "••••••••"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Username Hint</Label>
                    <p className="font-mono text-xs">{bkashConnection.metadata.usernameHint || "••••••••"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <p className="font-medium capitalize text-emerald-600 dark:text-emerald-400">{bkashConnection.status}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRotateForm(true)}
                    disabled={Boolean(savingAction)}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1" />
                    Rotate Credentials
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeBkashConnection()}
                    disabled={Boolean(savingAction)}
                  >
                    {savingAction === "bkash_connection_revoke" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    )}
                    Revoke Connection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Switch
                    checked={bkashConnectionDraft.isLive}
                    onCheckedChange={(val) => setBkashConnectionDraft((p) => ({ ...p, isLive: val }))}
                  />
                  <Label>Live Production Mode (uncheck for Sandbox)</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>App Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter bKash App Key"
                      value={bkashConnectionDraft.appKey}
                      onChange={(e) => setBkashConnectionDraft((p) => ({ ...p, appKey: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>App Secret</Label>
                    <Input
                      type="password"
                      placeholder="Enter bKash App Secret"
                      value={bkashConnectionDraft.appSecret}
                      onChange={(e) => setBkashConnectionDraft((p) => ({ ...p, appSecret: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Username</Label>
                    <Input
                      placeholder="Merchant bKash Username"
                      value={bkashConnectionDraft.username}
                      onChange={(e) => setBkashConnectionDraft((p) => ({ ...p, username: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Merchant bKash Password"
                      value={bkashConnectionDraft.password}
                      onChange={(e) => setBkashConnectionDraft((p) => ({ ...p, password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={() => saveBkashConnection(showRotateForm)}
                    disabled={Boolean(savingAction) || !bkashConnectionDraft.appKey || !bkashConnectionDraft.username}
                  >
                    {savingAction ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    {showRotateForm ? "Save Rotated Credentials" : "Connect bKash Gateway"}
                  </Button>
                  {showRotateForm && (
                    <Button variant="ghost" onClick={() => setShowRotateForm(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Payment Methods */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Manual Payment Instructions</CardTitle>
            <CardDescription>
              Configure cash on delivery or manual bank transfer instructions for shoppers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.payment_settings?.cod_enabled ?? true}
                onCheckedChange={(val) => update("payment_settings", "cod_enabled", val)}
              />
              <Label>Enable Cash on Delivery (COD)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.payment_settings?.manual_bank_enabled ?? false}
                onCheckedChange={(val) => update("payment_settings", "manual_bank_enabled", val)}
              />
              <Label>Enable Manual Bank Transfer Instructions</Label>
            </div>
            {settings.payment_settings?.manual_bank_enabled && (
              <div className="grid gap-2">
                <Label>Bank Account / Transfer Instructions</Label>
                <Input
                  placeholder="e.g. Account Name, Bank Name, Account No, Branch Code"
                  value={settings.payment_settings?.manual_bank_instructions ?? ""}
                  onChange={(e) => update("payment_settings", "manual_bank_instructions", e.target.value)}
                />
              </div>
            )}
            <SaveButton settingKey="payment_settings" />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
