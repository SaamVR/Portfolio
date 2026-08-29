import { useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, KeyRound, AlertTriangle, ShieldCheck, PlugZap, CircleHelp } from "lucide-react";
import type { usePaymentGateway } from "@/hooks/usePaymentGateway";
import type { PaymentProviderManifest } from "@/lib/payments/provider-registry";
import type { ProviderSetupField } from "@/lib/integrations/provider-contract";

function humanizeMetadataKey(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function displayMetadataEntries(metadata: Record<string, unknown>) {
  return Object.entries(metadata).filter(([, value]) =>
    value !== null && value !== undefined && ["string", "number", "boolean"].includes(typeof value),
  );
}

function fieldHasValue(value: unknown) {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function verificationLabel(connection: ReturnType<typeof usePaymentGateway>["connections"][string]) {
  if (!connection?.configured) return null;
  if (connection.verificationStatus === "verified") return "Verified";
  if (connection.verificationStatus === "failed") return "Verification failed";
  return connection.verificationAvailable ? "Not verified yet" : "Verification unavailable";
}

function ProviderField({
  providerId,
  field,
  value,
  onChange,
}: {
  providerId: string;
  field: ProviderSetupField;
  value: unknown;
  onChange: (value: string | number | boolean | null) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border p-3">
        <Switch id={`${providerId}-${field.key}`} checked={value === true} onCheckedChange={onChange} />
        <div className="space-y-1">
          <Label htmlFor={`${providerId}-${field.key}`}>{field.label}</Label>
          {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
        </div>
      </div>
    );
  }

  if (field.kind === "select") {
    const serialized = value === null || value === undefined ? "" : String(value);
    return (
      <div className="grid gap-2">
        <Label htmlFor={`${providerId}-${field.key}`}>{field.label}{field.required ? " *" : ""}</Label>
        <Select
          value={serialized}
          onValueChange={(next) => {
            const option = field.options?.find((candidate) => String(candidate.value) === next);
            onChange(option?.value ?? next);
          }}
        >
          <SelectTrigger id={`${providerId}-${field.key}`}><SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => <SelectItem key={String(option.value)} value={String(option.value)}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${providerId}-${field.key}`}>{field.label}{field.required ? " *" : ""}</Label>
      <Input
        id={`${providerId}-${field.key}`}
        type={field.kind === "password" ? "password" : field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"}
        inputMode={field.kind === "number" ? "decimal" : undefined}
        placeholder={field.placeholder}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={field.scope === "secret" ? "new-password" : undefined}
      />
      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
    </div>
  );
}

function ProviderConnectionCard({
  manifest,
  paymentGateway,
  editingProvider,
  setEditingProvider,
}: {
  manifest: PaymentProviderManifest;
  paymentGateway: ReturnType<typeof usePaymentGateway>;
  editingProvider: string | null;
  setEditingProvider: (provider: string | null) => void;
}) {
  const connection = paymentGateway.connections[manifest.id];
  const loading = paymentGateway.loadingByProvider[manifest.id] ?? false;
  const draft = paymentGateway.providerDrafts[manifest.id] ?? {};
  const rotating = editingProvider === manifest.id;
  const showForm = !connection?.configured || rotating;
  const actionBusy = paymentGateway.savingAction?.startsWith(`${manifest.id}_`) ?? false;
  const metadataEntries = displayMetadataEntries(connection?.metadata ?? {});
  const missingRequired = !connection?.configured && manifest.fields.some((field) => field.required && !fieldHasValue(draft[field.key]));
  const verification = verificationLabel(connection);

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><PlugZap className="h-4 w-4 text-primary" />{manifest.label} Payment Gateway</CardTitle>
            <CardDescription className="mt-1">{manifest.description}</CardDescription>
          </div>
          {connection?.configured ? (
            <div className="flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />Configured
            </div>
          ) : manifest.runtimeStatus !== "active" ? (
            <div className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Setup only</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center p-6 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading {manifest.label} connection status...</div>
        ) : connection?.configured && !showForm ? (
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {metadataEntries.map(([key, value]) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{humanizeMetadataKey(key)}</Label>
                  <p className="break-all font-medium">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</p>
                </div>
              ))}
              <div>
                <Label className="text-xs text-muted-foreground">Operational status</Label>
                <p className="font-medium capitalize">{connection.status}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Provider verification</Label>
                <p className={connection.verificationStatus === "verified" ? "font-medium text-emerald-600 dark:text-emerald-400" : connection.verificationStatus === "failed" ? "font-medium text-destructive" : "font-medium text-muted-foreground"}>{verification}</p>
                {!connection.verificationAvailable && connection.verificationStatus === "not_checked" ? <p className="mt-1 text-xs text-muted-foreground">Credentials are stored, but this provider has no reviewed side-effect-free verification adapter yet.</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setEditingProvider(manifest.id)} disabled={Boolean(paymentGateway.savingAction)}>
                <KeyRound className="mr-1 h-3.5 w-3.5" />Rotate / Update
              </Button>
              <Button variant="destructive" size="sm" onClick={() => paymentGateway.revokeProviderConnection(manifest.id)} disabled={Boolean(paymentGateway.savingAction)}>
                {paymentGateway.savingAction === `${manifest.id}_revoke` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="mr-1 h-3.5 w-3.5" />}
                Revoke Connection
              </Button>
            </div>
          </div>
        ) : manifest.runtimeStatus !== "active" ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">This provider manifest is installed for setup only. Checkout remains disabled until its reviewed runtime adapter is activated.</div>
        ) : (
          <div className="space-y-4">
            {manifest.guide ? (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">{manifest.guide.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{manifest.guide.body}</p>
              </div>
            ) : null}
            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <CircleHelp className="mr-1 inline h-3.5 w-3.5" />Saving credentials configures the gateway. It does not prove provider connectivity unless a reviewed verification adapter reports success.
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {manifest.fields.map((field) => (
                <ProviderField key={field.key} providerId={manifest.id} field={field} value={draft[field.key]} onChange={(value) => paymentGateway.updateProviderDraft(manifest.id, field.key, value)} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button onClick={() => paymentGateway.saveProviderConnection(manifest.id, rotating)} disabled={Boolean(paymentGateway.savingAction) || missingRequired}>
                {actionBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                {rotating ? "Save Updated Credentials" : `Configure ${manifest.label}`}
              </Button>
              {rotating ? <Button variant="ghost" onClick={() => setEditingProvider(null)} disabled={Boolean(paymentGateway.savingAction)}>Cancel</Button> : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PaymentSettingsTab({ paymentGateway, settings, update, SaveButton }: {
  paymentGateway: ReturnType<typeof usePaymentGateway>;
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  return (
    <TabsContent value="payment">
      <div className="space-y-6">
        {paymentGateway.providerManifests.map((manifest) => (
          <ProviderConnectionCard key={manifest.id} manifest={manifest} paymentGateway={paymentGateway} editingProvider={editingProvider} setEditingProvider={setEditingProvider} />
        ))}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Manual Payment Instructions</CardTitle>
            <CardDescription>Configure cash on delivery or manual bank transfer instructions for shoppers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2"><Switch checked={settings.payment_settings?.cod_enabled ?? true} onCheckedChange={(val) => update("payment_settings", "cod_enabled", val)} /><Label>Enable Cash on Delivery (COD)</Label></div>
            <div className="flex items-center gap-2"><Switch checked={settings.payment_settings?.manual_bank_enabled ?? false} onCheckedChange={(val) => update("payment_settings", "manual_bank_enabled", val)} /><Label>Enable Manual Bank Transfer Instructions</Label></div>
            {settings.payment_settings?.manual_bank_enabled && (
              <div className="grid gap-2">
                <Label>Bank Account / Transfer Instructions</Label>
                <Input placeholder="e.g. Account Name, Bank Name, Account No, Branch Code" value={settings.payment_settings?.manual_bank_instructions ?? ""} onChange={(e) => update("payment_settings", "manual_bank_instructions", e.target.value)} />
              </div>
            )}
            <SaveButton settingKey="payment_settings" />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
