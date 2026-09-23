"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/auth-context";
import {
  useCourierConnections,
  useOrderShipments,
  useSaveCourierConnection,
  useUpdateCourierConnection,
} from "@/hooks/useCouriers";
import {
  formatCourierConnectionLabel,
  formatCourierStatusLabel,
  getCourierProviderLabel,
  type CourierConnectionRecord,
  type ShipmentStatus,
} from "@/lib/couriers/shared";
import {
  getCourierProviderManifest,
  listCourierProviderManifests,
  type CourierProviderManifest,
} from "@/lib/couriers/provider-registry";
import type { ProviderSetupField } from "@/lib/integrations/provider-contract";
import { Loader2, PencilLine, RefreshCw, Save, Truck } from "lucide-react";
import { toast } from "sonner";

type FieldValue = string | number | boolean | null;
type ConnectionDraft = {
  provider: string;
  displayName: string;
  supportsCod: boolean;
  supportsCityDelivery: boolean;
  settings: Record<string, FieldValue>;
};

const providerManifests = listCourierProviderManifests().filter((provider) => provider.runtimeStatus !== "disabled");

function defaultFieldValue(field: ProviderSetupField): FieldValue {
  if (field.defaultValue !== undefined && field.defaultValue !== null) return field.defaultValue;
  return field.kind === "boolean" ? false : "";
}

function emptyDraft(provider = providerManifests[0]?.id ?? "manual"): ConnectionDraft {
  const manifest = getCourierProviderManifest(provider) ?? providerManifests[0];
  return {
    provider: manifest?.id ?? "manual",
    displayName: "",
    supportsCod: manifest?.defaultSupportsCod ?? true,
    supportsCityDelivery: manifest?.defaultSupportsCityDelivery ?? true,
    settings: Object.fromEntries((manifest?.fields ?? []).map((field) => [field.key, defaultFieldValue(field)])),
  };
}

function savedSecretPresence(connection: CourierConnectionRecord, fieldKey: string) {
  const explicit = connection.settingsSummary.secretPresence?.[fieldKey];
  if (typeof explicit === "boolean") return explicit;
  if (fieldKey === "accessToken") return connection.settingsSummary.hasAccessToken === true;
  if (fieldKey === "apiKey") return connection.settingsSummary.hasApiKey === true;
  if (fieldKey === "secretKey") return connection.settingsSummary.hasSecretKey === true;
  return false;
}

function draftFromConnection(connection: CourierConnectionRecord): ConnectionDraft {
  const manifest = getCourierProviderManifest(connection.provider);
  const settingsSummary = connection.settingsSummary as Record<string, unknown>;
  return {
    provider: connection.provider,
    displayName: connection.displayName ?? "",
    supportsCod: connection.supportsCod,
    supportsCityDelivery: connection.supportsCityDelivery,
    settings: Object.fromEntries((manifest?.fields ?? []).map((field) => [
      field.key,
      field.scope === "secret" ? "" : (settingsSummary[field.key] as FieldValue | undefined) ?? defaultFieldValue(field),
    ])),
  };
}

function fieldHasValue(value: unknown) {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function missingRequiredFields(draft: ConnectionDraft, manifest: CourierProviderManifest, editingConnection: CourierConnectionRecord | null) {
  const missing: string[] = [];
  if (!draft.displayName.trim()) missing.push("Operator label");
  for (const field of manifest.fields) {
    if (!field.required) continue;
    if (field.scope === "secret" && editingConnection && savedSecretPresence(editingConnection, field.key)) continue;
    if (!fieldHasValue(draft.settings[field.key])) missing.push(field.label);
  }
  return missing;
}

function toneForConnection(status: string) {
  if (status === "configured") return "default" as const;
  if (status === "disabled") return "secondary" as const;
  return "outline" as const;
}

function toneForVerification(status: CourierConnectionRecord["verificationStatus"]) {
  if (status === "verified") return "default" as const;
  if (status === "failed") return "destructive" as const;
  return "outline" as const;
}

function verificationLabel(connection: CourierConnectionRecord) {
  if (connection.verificationStatus === "verified") return "Verified";
  if (connection.verificationStatus === "failed") return "Verification failed";
  return connection.verificationAvailable ? "Not verified yet" : "Verification unavailable";
}

function toneForShipment(status: ShipmentStatus) {
  if (status === "delivered") return "default" as const;
  if (["failed", "returned", "cancelled"].includes(status)) return "destructive" as const;
  if (["booked", "picked_up", "in_transit"].includes(status)) return "secondary" as const;
  return "outline" as const;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function CourierProviderField({ field, value, savedSecret, onChange }: {
  field: ProviderSetupField;
  value: FieldValue | undefined;
  savedSecret: boolean;
  onChange: (value: FieldValue) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
        <div className="space-y-1"><Label>{field.label}</Label>{field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}</div>
        <Switch checked={value === true} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.kind === "select") {
    const serialized = value === null || value === undefined ? "" : String(value);
    return (
      <div className="space-y-2">
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        <Select value={serialized} onValueChange={(next) => {
          const option = field.options?.find((candidate) => String(candidate.value) === next);
          onChange((option?.value ?? next) as FieldValue);
        }}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} /></SelectTrigger>
          <SelectContent>{(field.options ?? []).map((option) => <SelectItem key={String(option.value)} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{field.label}{field.required ? " *" : ""}{field.scope === "secret" && savedSecret ? " (saved; leave blank to keep current value)" : ""}</Label>
      <Input
        type={field.kind === "password" ? "password" : field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"}
        inputMode={field.kind === "number" ? "decimal" : undefined}
        autoComplete={field.scope === "secret" ? "new-password" : undefined}
        value={value === null || value === undefined ? "" : String(value)}
        placeholder={savedSecret && field.scope === "secret" ? "Saved value remains unless replaced" : field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
    </div>
  );
}

export default function CouriersPluginManager() {
  const { activeStoreId } = useAuth();
  const connectionsQuery = useCourierConnections(activeStoreId);
  const shipmentsQuery = useOrderShipments(activeStoreId);
  const saveConnection = useSaveCourierConnection(activeStoreId);
  const updateConnection = useUpdateCourierConnection(activeStoreId);
  const connections = useMemo(() => connectionsQuery.data ?? [], [connectionsQuery.data]);
  const shipments = useMemo(() => shipmentsQuery.data ?? [], [shipmentsQuery.data]);

  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConnectionDraft>(emptyDraft);
  const editingConnection = connections.find((connection) => connection.id === editingConnectionId) ?? null;
  const manifest = getCourierProviderManifest(draft.provider) ?? providerManifests[0] ?? null;
  const missingFields = manifest ? missingRequiredFields(draft, manifest, editingConnection) : ["Provider"];
  const savePending = saveConnection.isPending || updateConnection.isPending;

  const summary = useMemo(() => ({
    configured: connections.filter((connection) => connection.status === "configured").length,
    verified: connections.filter((connection) => connection.verificationStatus === "verified").length,
    inTransit: shipments.filter((shipment) => ["booked", "picked_up", "in_transit"].includes(shipment.status)).length,
    failed: shipments.filter((shipment) => ["failed", "returned", "cancelled"].includes(shipment.status)).length,
  }), [connections, shipments]);

  const resetForm = (provider = draft.provider) => {
    setEditingConnectionId(null);
    setDraft(emptyDraft(provider));
  };

  const beginEditing = (connection: CourierConnectionRecord) => {
    setEditingConnectionId(connection.id);
    setDraft(draftFromConnection(connection));
  };

  const applyDraft = async () => {
    if (!manifest || missingFields.length > 0) {
      toast.error(`Complete required fields: ${missingFields.join(", ")}`);
      return;
    }
    const payload = {
      provider: manifest.id,
      displayName: draft.displayName,
      supportsCod: draft.supportsCod,
      supportsCityDelivery: draft.supportsCityDelivery,
      settings: draft.settings,
    };
    try {
      if (editingConnectionId) {
        await updateConnection.mutateAsync({ connectionId: editingConnectionId, ...payload });
        toast.success("Courier connection updated. Verification status was reset.");
      } else {
        await saveConnection.mutateAsync(payload);
        toast.success("Courier connection configured.");
      }
      resetForm(manifest.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save courier connection.");
    }
  };

  const toggleConnection = async (connection: CourierConnectionRecord) => {
    const action = connection.status === "disabled" ? "enable" : "disable";
    try {
      await updateConnection.mutateAsync({ connectionId: connection.id, action });
      toast.success(action === "enable" ? "Courier connection enabled." : "Courier connection disabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not ${action} courier connection.`);
    }
  };

  if (!activeStoreId) {
    return <Card className="border-border bg-card/50"><CardHeader><CardTitle>Courier plugins</CardTitle><CardDescription>Select a store first to configure courier providers.</CardDescription></CardHeader></Card>;
  }
  if (connectionsQuery.isLoading || shipmentsQuery.isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading courier plugins...</div>;
  }

  return (
    <div className="space-y-7">
      <Card className="border-border bg-card/50">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl"><Truck className="h-6 w-6 text-primary" /> Courier plugins</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">Configuration and provider verification are tracked separately. Saving complete settings makes a courier operationally configured; only an authoritative provider check can make it verified.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => void connectionsQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">Configured</p><p className="mt-1 text-2xl font-bold">{summary.configured}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">Verified</p><p className="mt-1 text-2xl font-bold">{summary.verified}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">In transit</p><p className="mt-1 text-2xl font-bold">{summary.inTransit}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">Failed / returned</p><p className="mt-1 text-2xl font-bold">{summary.failed}</p></div>
        </CardContent>
      </Card>

      <div className="grid gap-7 xl:grid-cols-[1fr_1.15fr]">
        <Card className="border-border bg-card/50">
          <CardHeader><CardTitle>{editingConnection ? "Edit courier plugin" : "Add courier plugin"}</CardTitle><CardDescription>Operational state is server-derived from complete normalized settings; merchants cannot self-declare a provider connection.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={draft.provider} disabled={Boolean(editingConnectionId)} onValueChange={(provider) => setDraft(emptyDraft(provider))}>
                <SelectTrigger><SelectValue placeholder="Choose provider" /></SelectTrigger>
                <SelectContent>{providerManifests.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2"><Label>Operator label *</Label><Input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="e.g. Pathao Dhaka Primary" /></div>

            {manifest?.guide ? <div className="rounded-xl border border-primary/15 bg-primary/5 p-4"><p className="text-sm font-semibold">{manifest.guide.title}</p><p className="mt-1 text-xs text-muted-foreground">{manifest.guide.body}</p>{(manifest.guide.examples ?? []).map((example) => <p key={example} className="mt-1 text-xs text-muted-foreground">{example}</p>)}</div> : null}
            {manifest?.runtimeStatus === "setup_only" ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground">Configuration storage is available, but automated booking remains disabled until this provider&apos;s reviewed runtime adapter is activated.</div> : null}

            <div className="grid gap-4 md:grid-cols-2">
              {(manifest?.fields ?? []).map((field) => <CourierProviderField
                key={field.key}
                field={field}
                value={draft.settings[field.key]}
                savedSecret={Boolean(editingConnection && field.scope === "secret" && savedSecretPresence(editingConnection, field.key))}
                onChange={(value) => setDraft((current) => ({ ...current, settings: { ...current.settings, [field.key]: value } }))}
              />)}
            </div>

            <div className="grid gap-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Supports COD</p><p className="text-xs text-muted-foreground">Courier can collect cash from customers.</p></div><Switch checked={draft.supportsCod} onCheckedChange={(supportsCod) => setDraft((current) => ({ ...current, supportsCod }))} /></div>
              <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Supports city delivery</p><p className="text-xs text-muted-foreground">Use this connection for city-zone dispatch.</p></div><Switch checked={draft.supportsCityDelivery} onCheckedChange={(supportsCityDelivery) => setDraft((current) => ({ ...current, supportsCityDelivery }))} /></div>
            </div>

            {missingFields.length > 0 ? <p className="text-xs text-amber-700">Required before save: {missingFields.join(", ")}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button disabled={savePending || missingFields.length > 0} onClick={() => void applyDraft()}>{savePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{editingConnection ? "Save changes" : "Save connection"}</Button>
              {editingConnection ? <Button variant="outline" onClick={() => resetForm(draft.provider)}>Cancel</Button> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader><CardTitle>Configured courier plugins</CardTitle><CardDescription>Configured means required settings are stored. Verified is shown only when a provider adapter can prove connectivity.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {connections.length === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No courier connections yet.</div> : connections.map((connection) => {
              const connectionManifest = getCourierProviderManifest(connection.provider);
              return (
                <div key={connection.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{connection.displayName || getCourierProviderLabel(connection.provider)}</p>
                        <Badge variant={toneForConnection(connection.status)}>{formatCourierStatusLabel(connection.status)}</Badge>
                        <Badge variant={toneForVerification(connection.verificationStatus)}>{verificationLabel(connection)}</Badge>
                        <Badge variant={connectionManifest?.runtimeStatus === "active" ? "default" : "outline"}>{connectionManifest?.runtimeStatus === "active" ? "Live adapter" : "Setup only"}</Badge>
                        {connection.supportsCod ? <Badge variant="outline">COD</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{getCourierProviderLabel(connection.provider)} · Updated {formatDate(connection.updatedAt)}</p>
                      {!connection.verificationAvailable && connection.verificationStatus === "not_checked" ? <p className="text-xs text-muted-foreground">No reviewed side-effect-free verification adapter is available for this provider yet.</p> : null}
                      {connection.settingsSummary.zoneLabel || connection.settingsSummary.serviceAreaName ? <p className="text-xs text-muted-foreground">{formatCourierConnectionLabel({ provider: connection.provider, displayName: null, zoneLabel: connection.settingsSummary.zoneLabel, serviceAreaName: connection.settingsSummary.serviceAreaName })}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => beginEditing(connection)}><PencilLine className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                      <Button size="sm" variant={connection.status === "disabled" ? "default" : "outline"} disabled={updateConnection.isPending} onClick={() => void toggleConnection(connection)}>{connection.status === "disabled" ? "Enable" : "Disable"}</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader><CardTitle>Recent shipment activity</CardTitle><CardDescription>Shipment records stay provider-neutral after adapters normalize booking responses.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {shipmentsQuery.error ? <p className="text-sm text-muted-foreground">Shipment activity could not be loaded.</p> : shipments.length === 0 ? <p className="text-sm text-muted-foreground">No shipment rows yet.</p> : shipments.slice(0, 12).map((shipment) => (
            <div key={shipment.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_auto]">
              <div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">Order {shipment.order_id.slice(0, 8)}</p><Badge variant={toneForShipment(shipment.status)}>{formatCourierStatusLabel(shipment.status)}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{shipment.courier_connection_label || getCourierProviderLabel(shipment.provider)} · {formatDate(shipment.created_at)}</p></div>
              <div className="text-left sm:text-right"><p className="text-xs text-muted-foreground">Tracking</p><p className="text-sm font-medium">{shipment.tracking_number || shipment.consignment_id || "Not assigned"}</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
