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
import { useCourierConnections, useOrderShipments, useSaveCourierConnection, useUpdateCourierConnection } from "@/hooks/useCouriers";
import {
  courierConnectionStatuses,
  courierProviders,
  formatCourierConnectionLabel,
  formatCourierStatusLabel,
  getCourierProviderLabel,
  type CourierConnectionRecord,
  type CourierProvider,
  type ShipmentStatus,
} from "@/lib/couriers/shared";
import { Loader2, PencilLine, RefreshCw, Save, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";

type ConnectionDraft = {
  provider: CourierProvider;
  displayName: string;
  zoneLabel: string;
  serviceAreaName: string;
  supportsCod: boolean;
  supportsCityDelivery: boolean;
  status: string;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupAddress: string;
  returnContactName: string;
  returnContactPhone: string;
  returnAddress: string;
  sandboxMode: boolean;
  baseUrl: string;
  merchantStoreId: string;
  merchantOrderPrefix: string;
  accessToken: string;
  deliveryType: string;
  itemType: string;
  defaultItemWeightKg: string;
  specialInstruction: string;
  externalMerchantCode: string;
  apiKey: string;
  secretKey: string;
  note: string;
};

function emptyDraft(provider: CourierProvider = "pathao"): ConnectionDraft {
  return {
    provider,
    displayName: "",
    zoneLabel: "",
    serviceAreaName: "",
    supportsCod: true,
    supportsCityDelivery: true,
    status: "draft",
    pickupContactName: "",
    pickupContactPhone: "",
    pickupAddress: "",
    returnContactName: "",
    returnContactPhone: "",
    returnAddress: "",
    sandboxMode: false,
    baseUrl: "",
    merchantStoreId: "",
    merchantOrderPrefix: "",
    accessToken: "",
    deliveryType: "48",
    itemType: "2",
    defaultItemWeightKg: "0.5",
    specialInstruction: "",
    externalMerchantCode: "",
    apiKey: "",
    secretKey: "",
    note: "",
  };
}

function toneForConnection(status: string) {
  if (status === "connected") return "default" as const;
  if (status === "disabled") return "secondary" as const;
  return "outline" as const;
}

function toneForShipment(status: ShipmentStatus) {
  if (status === "delivered") return "default" as const;
  if (status === "failed" || status === "returned" || status === "cancelled") return "destructive" as const;
  if (status === "booked" || status === "picked_up" || status === "in_transit") return "secondary" as const;
  return "outline" as const;
}

function requiredBadge(text = "Required for connected status") {
  return (
    <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">
      {text}
    </Badge>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getProviderSetupGuidance(provider: CourierProvider) {
  switch (provider) {
    case "pathao":
      return {
        title: "Pathao setup guidance",
        body: "Use the merchant API base URL, the exact Pathao merchant store ID, and a valid bearer token. Add pickup and return details so booking can move cleanly from setup into real dispatch.",
        examples: [
          "Base URL example: https://merchant.pathao.com/aladdin/api/v1",
          "Merchant order prefix example: ECM or DHAKA",
          "Special instruction example: Call before pickup",
        ],
      };
    case "steadfast":
      return {
        title: "Steadfast setup guidance",
        body: "Prepare the merchant code, API base URL, and secret pair now so this connection is ready when the live adapter is added. Pickup and return assignments are still useful immediately for operator handoff.",
        examples: [
          "Merchant code example: STEADFAST-STORE-01",
          "API note example: keep sandbox mode on until live credentials are confirmed",
        ],
      };
    case "redx":
      return {
        title: "REDX setup guidance",
        body: "Use this connection to store the merchant reference, credential pair, and pickup/return ownership now. Even before live dispatch automation, the team can standardize who handles REDX bookings.",
        examples: [
          "Operator label example: REDX Dhaka Primary",
          "Note example: Use for Dhaka city COD first",
        ],
      };
    case "ecourier":
      return {
        title: "eCourier setup guidance",
        body: "Add the merchant reference, fulfillment contacts, and any API keys the merchant receives. This keeps the courier layer consistent before full automation is switched on.",
        examples: [
          "Pickup address example: Warehouse 2, Mirpur DOHS",
          "Return note example: Failed deliveries return every evening",
        ],
      };
    case "paperfly":
      return {
        title: "Paperfly setup guidance",
        body: "Set the operational owner, return flow, and stored credentials now so the merchant does not need to rebuild setup later when live Paperfly integration is added.",
        examples: [
          "Return contact example: Ops Desk - 01XXXXXXXXX",
          "Note example: Best for outside-Dhaka prepaid deliveries",
        ],
      };
    case "manual":
      return {
        title: "Manual booking guidance",
        body: "Use this when the team still books by phone, Facebook, or courier panel manually. The key thing is assigning pickup, return, and COD responsibility clearly so orders don’t get stuck.",
        examples: [
          "Operator label example: Manual Dhaka Courier Desk",
          "Note example: Call rider after order is confirmed",
        ],
      };
    default:
      return {
        title: "Courier setup guidance",
        body: "Assign pickup, return, and merchant-specific credential fields so the setup is reusable when live automation is enabled.",
        examples: [],
      };
  }
}

function getPresetTemplates(provider: CourierProvider) {
  const sharedPresets = [
    {
      id: "dhaka-cod",
      label: "Dhaka COD",
      patch: {
        supportsCod: true,
        supportsCityDelivery: true,
        zoneLabel: "Dhaka COD",
        serviceAreaName: "Dhaka metro",
        note: "Primary setup for Dhaka cash-on-delivery orders.",
      },
    },
    {
      id: "outside-dhaka-prepaid",
      label: "Outside Dhaka prepaid",
      patch: {
        supportsCod: false,
        supportsCityDelivery: false,
        zoneLabel: "Outside Dhaka prepaid",
        serviceAreaName: "Outside Dhaka",
        note: "Use for prepaid deliveries outside Dhaka city.",
      },
    },
  ] satisfies Array<{
    id: string;
    label: string;
    patch: Partial<ConnectionDraft>;
  }>;

  if (provider === "manual") {
    return [
      {
        id: "manual-backup-courier",
        label: "Manual backup courier",
        patch: {
          supportsCod: true,
          supportsCityDelivery: true,
          zoneLabel: "Manual backup",
          serviceAreaName: "Flexible coverage",
          note: "Fallback courier for urgent manual dispatch or overflow volume.",
        },
      },
    ];
  }

  if (provider === "pathao") {
    return sharedPresets.map((preset) => ({
      ...preset,
      patch: {
        ...preset.patch,
        merchantOrderPrefix: preset.id === "dhaka-cod" ? "DHK" : "ODP",
      },
    }));
  }

  return sharedPresets;
}

function getConnectionCompleteness(connection: CourierConnectionRecord) {
  const settings = connection.settingsSummary;
  const checks = [
    Boolean(connection.displayName?.trim()),
    Boolean(settings.zoneLabel?.trim()),
    Boolean(settings.serviceAreaName?.trim()),
    Boolean(settings.pickupContactName?.trim()),
    Boolean(settings.pickupContactPhone?.trim()),
    Boolean(settings.pickupAddress?.trim()),
    Boolean(settings.returnContactName?.trim()),
    Boolean(settings.returnContactPhone?.trim()),
    Boolean(settings.returnAddress?.trim()),
  ];

  if (connection.provider === "pathao") {
    checks.push(
      Boolean(settings.baseUrl?.trim()),
      Boolean(settings.merchantStoreId),
      Boolean(settings.hasAccessToken),
    );
  } else if (connection.provider !== "manual") {
    checks.push(
      Boolean(settings.externalMerchantCode?.trim() || settings.baseUrl?.trim()),
      Boolean(settings.hasApiKey || settings.hasSecretKey || settings.hasAccessToken),
    );
  }

  const completed = checks.filter(Boolean).length;
  const total = checks.length;
  const score = Math.round((completed / total) * 100);

  return {
    completed,
    total,
    score,
    label: score >= 85 ? "Ready" : score >= 55 ? "In progress" : "Needs setup",
    variant: score >= 85 ? "default" as const : score >= 55 ? "secondary" as const : "outline" as const,
  };
}

function getProviderRequiredWarnings(draft: ConnectionDraft) {
  const warnings: string[] = [];

  if (!draft.displayName.trim()) warnings.push("Add an operator label so the team can tell this courier setup apart.");
  if (!draft.zoneLabel.trim()) warnings.push("Zone label is still missing.");
  if (!draft.serviceAreaName.trim()) warnings.push("Service area name is still missing.");
  if (!draft.pickupContactName.trim()) warnings.push("Pickup contact name is still missing.");
  if (!draft.pickupContactPhone.trim()) warnings.push("Pickup contact phone is still missing.");
  if (!draft.pickupAddress.trim()) warnings.push("Pickup address is still missing.");
  if (!draft.returnContactName.trim()) warnings.push("Return contact name is still missing.");
  if (!draft.returnContactPhone.trim()) warnings.push("Return contact phone is still missing.");
  if (!draft.returnAddress.trim()) warnings.push("Return address is still missing.");

  if (draft.provider === "pathao") {
    if (!draft.baseUrl.trim()) warnings.push("Pathao API base URL is required.");
    if (!draft.merchantStoreId.trim()) warnings.push("Pathao merchant store ID is required.");
    if (!draft.deliveryType.trim()) warnings.push("Pathao delivery type is required.");
    if (!draft.itemType.trim()) warnings.push("Pathao item type is required.");
    if (!draft.accessToken.trim() && draft.status === "connected") warnings.push("Pathao access token is required before marking this connection connected.");
  } else if (draft.provider !== "manual") {
    if (!draft.externalMerchantCode.trim() && !draft.baseUrl.trim()) {
      warnings.push(`Add at least a merchant code or API base URL for ${getCourierProviderLabel(draft.provider)}.`);
    }
    if (draft.status === "connected" && !draft.apiKey.trim() && !draft.secretKey.trim() && !draft.accessToken.trim()) {
      warnings.push(`Add at least one saved credential before marking ${getCourierProviderLabel(draft.provider)} connected.`);
    }
  }

  return warnings;
}

function getRecommendationFlags(connection: CourierConnectionRecord) {
  const settings = connection.settingsSummary;
  const hasOpsAssignment = Boolean(
    settings.pickupContactName?.trim() &&
    settings.pickupContactPhone?.trim() &&
    settings.pickupAddress?.trim(),
  );
  const hasReturnFlow = Boolean(
    settings.returnContactName?.trim() &&
    settings.returnContactPhone?.trim() &&
    settings.returnAddress?.trim(),
  );

  const recommendedForCod = connection.supportsCod && hasOpsAssignment && hasReturnFlow;
  const recommendedForCityDelivery =
    connection.supportsCityDelivery &&
    hasOpsAssignment &&
    Boolean(settings.pickupAddress?.trim()) &&
    connection.status !== "disabled";

  return {
    recommendedForCod,
    recommendedForCityDelivery,
  };
}

function getRecommendationChecklist(connection: CourierConnectionRecord) {
  const settings = connection.settingsSummary;
  const blockers: string[] = [];

  if (!connection.supportsCod) {
    blockers.push("COD support is turned off.");
  }
  if (!connection.supportsCityDelivery) {
    blockers.push("City delivery support is turned off.");
  }
  if (!settings.pickupContactName?.trim()) blockers.push("Pickup contact name is missing.");
  if (!settings.pickupContactPhone?.trim()) blockers.push("Pickup contact phone is missing.");
  if (!settings.pickupAddress?.trim()) blockers.push("Pickup address is missing.");
  if (!settings.zoneLabel?.trim()) blockers.push("Zone label is missing.");
  if (!settings.serviceAreaName?.trim()) blockers.push("Service area name is missing.");
  if (!settings.returnContactName?.trim()) blockers.push("Return contact name is missing.");
  if (!settings.returnContactPhone?.trim()) blockers.push("Return contact phone is missing.");
  if (!settings.returnAddress?.trim()) blockers.push("Return address is missing.");
  if (connection.provider === "pathao") {
    if (!settings.baseUrl?.trim()) blockers.push("Pathao API base URL is missing.");
    if (!settings.merchantStoreId) blockers.push("Pathao merchant store ID is missing.");
    if (!settings.hasAccessToken) blockers.push("Pathao access token is not saved yet.");
  } else if (connection.provider !== "manual") {
    if (!settings.externalMerchantCode?.trim() && !settings.baseUrl?.trim()) {
      blockers.push("Merchant code or API base URL is still missing.");
    }
    if (!settings.hasApiKey && !settings.hasSecretKey && !settings.hasAccessToken) {
      blockers.push("No provider credential is saved yet.");
    }
  }
  if (connection.status === "disabled") blockers.push("Connection is disabled.");

  return blockers;
}

function draftFromConnection(connection: CourierConnectionRecord): ConnectionDraft {
  const settings = connection.settingsSummary;
  return {
    provider: connection.provider,
    displayName: connection.displayName ?? "",
    zoneLabel: settings.zoneLabel ?? "",
    serviceAreaName: settings.serviceAreaName ?? "",
    supportsCod: connection.supportsCod,
    supportsCityDelivery: connection.supportsCityDelivery,
    status: connection.status,
    pickupContactName: settings.pickupContactName ?? "",
    pickupContactPhone: settings.pickupContactPhone ?? "",
    pickupAddress: settings.pickupAddress ?? "",
    returnContactName: settings.returnContactName ?? "",
    returnContactPhone: settings.returnContactPhone ?? "",
    returnAddress: settings.returnAddress ?? "",
    sandboxMode: settings.sandboxMode === true,
    baseUrl: settings.baseUrl ?? "",
    merchantStoreId: settings.merchantStoreId ? String(settings.merchantStoreId) : "",
    merchantOrderPrefix: settings.merchantOrderPrefix ?? "",
    accessToken: "",
    deliveryType: settings.deliveryType ? String(settings.deliveryType) : "48",
    itemType: settings.itemType ? String(settings.itemType) : "2",
    defaultItemWeightKg: settings.defaultItemWeightKg ? String(settings.defaultItemWeightKg) : "0.5",
    specialInstruction: settings.specialInstruction ?? "",
    externalMerchantCode: settings.externalMerchantCode ?? "",
    apiKey: "",
    secretKey: "",
    note: settings.note ?? "",
  };
}

export default function CouriersPage() {
  const { activeStoreId } = useAuth();
  const {
    data: connections = [],
    isLoading: connectionsLoading,
    error: connectionsError,
    refetch,
  } = useCourierConnections(activeStoreId);
  const {
    data: shipments = [],
    isLoading: shipmentsLoading,
    error: shipmentsError,
  } = useOrderShipments(activeStoreId);
  const saveConnection = useSaveCourierConnection(activeStoreId);
  const updateConnection = useUpdateCourierConnection(activeStoreId);

  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConnectionDraft>(emptyDraft());

  const summary = useMemo(() => {
    const connectedCount = connections.filter((connection) => connection.status === "connected").length;
    const codReadyCount = connections.filter((connection) => connection.status !== "disabled" && connection.supportsCod).length;
    const transitCount = shipments.filter((shipment) => ["booked", "picked_up", "in_transit"].includes(shipment.status)).length;
    const deliveredCount = shipments.filter((shipment) => shipment.status === "delivered").length;
    const failedCount = shipments.filter((shipment) => ["failed", "returned", "cancelled"].includes(shipment.status)).length;

    return {
      connectedCount,
      codReadyCount,
      transitCount,
      deliveredCount,
      failedCount,
    };
  }, [connections, shipments]);

  const editingConnection = connections.find((connection) => connection.id === editingConnectionId) ?? null;
  const savePending = saveConnection.isPending || updateConnection.isPending;
  const providerGuidance = getProviderSetupGuidance(draft.provider);
  const presetTemplates = getPresetTemplates(draft.provider);
  const draftWarnings = getProviderRequiredWarnings(draft);

  const resetForm = (provider: CourierProvider = "pathao") => {
    setEditingConnectionId(null);
    setDraft(emptyDraft(provider));
  };

  const beginEditing = (connection: CourierConnectionRecord) => {
    setEditingConnectionId(connection.id);
    setDraft(draftFromConnection(connection));
  };

  const duplicateConnection = (connection: CourierConnectionRecord) => {
    setEditingConnectionId(null);
    setDraft({
      ...draftFromConnection(connection),
      displayName: `${connection.displayName?.trim() || getCourierProviderLabel(connection.provider)} Copy`,
      zoneLabel: `${connection.settingsSummary.zoneLabel?.trim() || connection.displayName?.trim() || getCourierProviderLabel(connection.provider)} - New Zone`,
      serviceAreaName: connection.settingsSummary.serviceAreaName?.trim() || "New service area",
      status: "draft",
      accessToken: "",
      apiKey: "",
      secretKey: "",
    });
    toast.success("Courier setup copied into a new draft.");
  };

  const applyDraft = async () => {
    const payload = {
      provider: draft.provider,
      displayName: draft.displayName,
      supportsCod: draft.supportsCod,
      supportsCityDelivery: draft.supportsCityDelivery,
      status: draft.status,
      settings: {
        pickupContactName: draft.pickupContactName,
        pickupContactPhone: draft.pickupContactPhone,
        pickupAddress: draft.pickupAddress,
        returnContactName: draft.returnContactName,
        returnContactPhone: draft.returnContactPhone,
        returnAddress: draft.returnAddress,
        zoneLabel: draft.zoneLabel,
        serviceAreaName: draft.serviceAreaName,
        sandboxMode: draft.sandboxMode,
        baseUrl: draft.baseUrl,
        merchantStoreId: draft.merchantStoreId,
        merchantOrderPrefix: draft.merchantOrderPrefix,
        accessToken: draft.accessToken,
        deliveryType: draft.deliveryType,
        itemType: draft.itemType,
        defaultItemWeightKg: draft.defaultItemWeightKg,
        specialInstruction: draft.specialInstruction,
        externalMerchantCode: draft.externalMerchantCode,
        apiKey: draft.apiKey,
        secretKey: draft.secretKey,
        note: draft.note,
      },
    };

    try {
      if (editingConnectionId) {
        await updateConnection.mutateAsync({
          connectionId: editingConnectionId,
          ...payload,
        });
        toast.success("Courier connection updated.");
      } else {
        await saveConnection.mutateAsync(payload);
        toast.success("Courier connection saved.");
      }

      resetForm(draft.provider);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save courier connection.");
    }
  };

  const handleStatusChange = async (connection: CourierConnectionRecord, status: string) => {
    try {
      await updateConnection.mutateAsync({
        connectionId: connection.id,
        status,
      });
      toast.success("Courier status updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update courier status.");
    }
  };

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Courier control</CardTitle>
          <CardDescription>Select a store first to review delivery partners, credentials, and shipment activity.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (connectionsLoading || shipmentsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading courier workspace...
      </div>
    );
  }

  if (connectionsError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Courier workspace unavailable</CardTitle>
          <CardDescription>We could not load courier connections right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      <Card className="border-border bg-card/50">
        <CardHeader className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Truck className="h-6 w-6 text-primary" />
              Courier control center
            </CardTitle>
            <CardDescription className="max-w-2xl">
              Manage delivery partners, keep merchant credentials server-side, and make bookings from real order data instead of side notes.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Connected couriers</p>
            <p className="mt-2 font-heading text-3xl font-bold text-foreground">{summary.connectedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Providers ready to take live bookings.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">COD-ready options</p>
            <p className="mt-2 font-heading text-3xl font-bold text-foreground">{summary.codReadyCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Connections that can collect customer cash.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Shipments in motion</p>
            <p className="mt-2 font-heading text-3xl font-bold text-foreground">{summary.transitCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Booked, picked up, or already in transit.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivery outcomes</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {summary.deliveredCount} delivered - {summary.failedCount} failed
            </p>
            <p className="mt-1 text-xs text-muted-foreground">A quick read on fulfillment quality.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-7 xl:grid-cols-[1.1fr_1.3fr]">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>{editingConnection ? "Edit courier connection" : "Add a courier connection"}</CardTitle>
            <CardDescription>
              Credentials are saved through server routes and only their presence is shown back to the merchant UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courier-provider">Provider</Label>
                <Select
                  value={draft.provider}
                  onValueChange={(value: CourierProvider) =>
                    setDraft((current) => ({
                      ...emptyDraft(value),
                      displayName: current.provider === value ? current.displayName : "",
                    }))
                  }
                  disabled={Boolean(editingConnectionId)}
                >
                  <SelectTrigger id="courier-provider">
                    <SelectValue placeholder="Choose a courier" />
                  </SelectTrigger>
                  <SelectContent>
                    {courierProviders.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {getCourierProviderLabel(provider)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="courier-status">Connection status</Label>
                <Select value={draft.status} onValueChange={(value) => setDraft((current) => ({ ...current, status: value }))}>
                  <SelectTrigger id="courier-status">
                    <SelectValue placeholder="Choose status" />
                  </SelectTrigger>
                  <SelectContent>
                    {courierConnectionStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatCourierStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courier-display-name">
                Operator label
                {requiredBadge()}
              </Label>
              <Input
                id="courier-display-name"
                value={draft.displayName}
                onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="What should the team call this courier setup?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courier-zone-label">
                  Zone label
                  {requiredBadge()}
                </Label>
                <Input
                  id="courier-zone-label"
                  value={draft.zoneLabel}
                  onChange={(event) => setDraft((current) => ({ ...current, zoneLabel: event.target.value }))}
                  placeholder="Dhaka COD, Chattogram East, Manual fallback"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courier-service-area">
                  Service area name
                  {requiredBadge()}
                </Label>
                <Input
                  id="courier-service-area"
                  value={draft.serviceAreaName}
                  onChange={(event) => setDraft((current) => ({ ...current, serviceAreaName: event.target.value }))}
                  placeholder="Dhaka metro, Outside Dhaka, Mirpur zone"
                />
              </div>
            </div>

            {presetTemplates.length > 0 ? (
              <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Quick setup presets</p>
                  <p className="text-xs text-muted-foreground">
                    Start with a ready-made merchant pattern, then adjust contacts and credentials for this exact zone.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {presetTemplates.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          ...preset.patch,
                        }))
                      }
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">{providerGuidance.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{providerGuidance.body}</p>
              {providerGuidance.examples.length > 0 ? (
                <div className="mt-3 space-y-1">
                  {providerGuidance.examples.map((example) => (
                    <p key={example} className="text-xs text-muted-foreground">
                      {example}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            {draftWarnings.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-foreground">Setup still needs attention</p>
                <div className="mt-2 space-y-1">
                  {draftWarnings.map((warning) => (
                    <p key={warning} className="text-xs text-muted-foreground">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-foreground">Setup looks complete</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The currently visible merchant-assignment and provider fields are filled well enough for this setup pass.
                </p>
              </div>
            )}

            <div className="grid gap-3 rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Supports cash on delivery</p>
                  <p className="text-xs text-muted-foreground">Turn this on when the courier can collect customer cash.</p>
                </div>
                <Switch checked={draft.supportsCod} onCheckedChange={(value) => setDraft((current) => ({ ...current, supportsCod: value }))} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Supports city delivery</p>
                  <p className="text-xs text-muted-foreground">Useful when this courier handles city-zone delivery well.</p>
                </div>
                <Switch checked={draft.supportsCityDelivery} onCheckedChange={(value) => setDraft((current) => ({ ...current, supportsCityDelivery: value }))} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Use sandbox / test mode</p>
                  <p className="text-xs text-muted-foreground">Keep this on until the merchant is ready to move from setup into live courier traffic.</p>
                </div>
                <Switch checked={draft.sandboxMode} onCheckedChange={(value) => setDraft((current) => ({ ...current, sandboxMode: value }))} />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Merchant fulfillment assignment</p>
                <p className="text-xs text-muted-foreground">
                  These fields tell the team and future courier adapters where pickup happens, where returns should go, and who the merchant-side contact is.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pickup-contact-name">
                    Pickup contact name
                    {requiredBadge()}
                  </Label>
                  <Input
                    id="pickup-contact-name"
                    value={draft.pickupContactName}
                    onChange={(event) => setDraft((current) => ({ ...current, pickupContactName: event.target.value }))}
                    placeholder="Merchant pickup contact"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-contact-phone">
                    Pickup contact phone
                    {requiredBadge()}
                  </Label>
                  <Input
                    id="pickup-contact-phone"
                    value={draft.pickupContactPhone}
                    onChange={(event) => setDraft((current) => ({ ...current, pickupContactPhone: event.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pickup-address">
                    Pickup address
                    {requiredBadge()}
                  </Label>
                  <Input
                    id="pickup-address"
                    value={draft.pickupAddress}
                    onChange={(event) => setDraft((current) => ({ ...current, pickupAddress: event.target.value }))}
                    placeholder="Where should the courier collect parcels?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return-contact-name">
                    Return contact name
                    {requiredBadge()}
                  </Label>
                  <Input
                    id="return-contact-name"
                    value={draft.returnContactName}
                    onChange={(event) => setDraft((current) => ({ ...current, returnContactName: event.target.value }))}
                    placeholder="Who handles failed / returned parcels?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return-contact-phone">
                    Return contact phone
                    {requiredBadge()}
                  </Label>
                  <Input
                    id="return-contact-phone"
                    value={draft.returnContactPhone}
                    onChange={(event) => setDraft((current) => ({ ...current, returnContactPhone: event.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="return-address">
                    Return address
                    {requiredBadge()}
                  </Label>
                  <Input
                    id="return-address"
                    value={draft.returnAddress}
                    onChange={(event) => setDraft((current) => ({ ...current, returnAddress: event.target.value }))}
                    placeholder="Where should failed deliveries be returned?"
                  />
                </div>
              </div>
            </div>

            {draft.provider === "pathao" ? (
              <div className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <p>
                    Pathao booking is live through the server route. Save the API base URL, merchant store ID, and bearer token here, then book from the Orders screen.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pathao-base-url">
                      API base URL
                      {requiredBadge()}
                    </Label>
                    <Input
                      id="pathao-base-url"
                      value={draft.baseUrl}
                      onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
                      placeholder="https://your-pathao-base-url/aladdin/api/v1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-store-id">
                      Merchant store ID
                      {requiredBadge()}
                    </Label>
                    <Input
                      id="pathao-store-id"
                      value={draft.merchantStoreId}
                      onChange={(event) => setDraft((current) => ({ ...current, merchantStoreId: event.target.value }))}
                      placeholder="Pathao merchant store ID"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pathao-access-token">
                      Access token
                      {requiredBadge()}
                      {editingConnection?.settingsSummary.hasAccessToken ? " (leave blank to keep current token)" : ""}
                    </Label>
                    <Input
                      id="pathao-access-token"
                      type="password"
                      value={draft.accessToken}
                      onChange={(event) => setDraft((current) => ({ ...current, accessToken: event.target.value }))}
                      placeholder={editingConnection?.settingsSummary.hasAccessToken ? "Saved token will stay unless replaced" : "Bearer token from Pathao merchant API"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-delivery-type">Delivery type</Label>
                    <Input
                      id="pathao-delivery-type"
                      value={draft.deliveryType}
                      onChange={(event) => setDraft((current) => ({ ...current, deliveryType: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-item-type">Item type</Label>
                    <Input
                      id="pathao-item-type"
                      value={draft.itemType}
                      onChange={(event) => setDraft((current) => ({ ...current, itemType: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-weight">Default item weight (kg)</Label>
                    <Input
                      id="pathao-weight"
                      value={draft.defaultItemWeightKg}
                      onChange={(event) => setDraft((current) => ({ ...current, defaultItemWeightKg: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-prefix">Merchant order prefix</Label>
                    <Input
                      id="pathao-prefix"
                      value={draft.merchantOrderPrefix}
                      onChange={(event) => setDraft((current) => ({ ...current, merchantOrderPrefix: event.target.value }))}
                      placeholder="Optional short prefix"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pathao-instruction">Default special instruction</Label>
                    <Input
                      id="pathao-instruction"
                      value={draft.specialInstruction}
                      onChange={(event) => setDraft((current) => ({ ...current, specialInstruction: event.target.value }))}
                      placeholder="Example: Call before pickup"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{getCourierProviderLabel(draft.provider)} credential assignment</p>
                  <p className="text-xs text-muted-foreground">
                    Even without live access yet, the merchant can prepare the integration surface now and fill real credentials later without exposing them in the browser.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="generic-base-url">API base URL</Label>
                    <Input
                      id="generic-base-url"
                      value={draft.baseUrl}
                      onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
                      placeholder="Optional provider API base URL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="external-merchant-code">External merchant code</Label>
                    <Input
                      id="external-merchant-code"
                      value={draft.externalMerchantCode}
                      onChange={(event) => setDraft((current) => ({ ...current, externalMerchantCode: event.target.value }))}
                      placeholder="Optional merchant reference"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generic-weight">Default item weight (kg)</Label>
                    <Input
                      id="generic-weight"
                      value={draft.defaultItemWeightKg}
                      onChange={(event) => setDraft((current) => ({ ...current, defaultItemWeightKg: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generic-api-key">
                      API key
                      {editingConnection?.settingsSummary.hasApiKey ? " (leave blank to keep current key)" : ""}
                    </Label>
                    <Input
                      id="generic-api-key"
                      type="password"
                      value={draft.apiKey}
                      onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
                      placeholder="Optional provider API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generic-secret-key">
                      Secret key
                      {editingConnection?.settingsSummary.hasSecretKey ? " (leave blank to keep current secret)" : ""}
                    </Label>
                    <Input
                      id="generic-secret-key"
                      type="password"
                      value={draft.secretKey}
                      onChange={(event) => setDraft((current) => ({ ...current, secretKey: event.target.value }))}
                      placeholder="Optional provider secret"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="generic-note">Operator note</Label>
                    <Input
                      id="generic-note"
                      value={draft.note}
                      onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                      placeholder="Coverage note, contact note, or fallback instructions"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={savePending} onClick={() => void applyDraft()}>
                {savePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingConnection ? "Save changes" : "Save courier connection"}
              </Button>
              {(editingConnection || draft.displayName || draft.baseUrl || draft.note || draft.externalMerchantCode) ? (
                <Button type="button" variant="outline" onClick={() => resetForm(draft.provider)}>
                  Reset form
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Configured courier connections</CardTitle>
            <CardDescription>
              These are the connections your team can use from the Orders screen. Pathao can book live now; the rest can still be staged safely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground">
                No courier connections yet. Start with one live Pathao connection or a manual fallback connection for launch week.
              </div>
            ) : (
              connections.map((connection) => {
                const isUpdating = updateConnection.isPending && updateConnection.variables?.connectionId === connection.id;
                const completeness = getConnectionCompleteness(connection);
                const recommendation = getRecommendationFlags(connection);
                const checklist = getRecommendationChecklist(connection);
                return (
                  <div key={connection.id} className="rounded-2xl border border-border bg-background/60 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-foreground">
                            {connection.displayName?.trim() || getCourierProviderLabel(connection.provider)}
                          </p>
                          <Badge variant={toneForConnection(connection.status)}>{formatCourierStatusLabel(connection.status)}</Badge>
                          {connection.supportsCod ? <Badge variant="outline">COD</Badge> : null}
                          {connection.supportsCityDelivery ? <Badge variant="outline">City delivery</Badge> : null}
                          {connection.settingsSummary.zoneLabel ? <Badge variant="outline">Zone: {connection.settingsSummary.zoneLabel}</Badge> : null}
                          {connection.settingsSummary.serviceAreaName ? <Badge variant="outline">Service area: {connection.settingsSummary.serviceAreaName}</Badge> : null}
                          {connection.settingsSummary.hasAccessToken ? <Badge variant="outline">Token saved</Badge> : null}
                          {connection.settingsSummary.hasApiKey ? <Badge variant="outline">API key saved</Badge> : null}
                          {connection.settingsSummary.hasSecretKey ? <Badge variant="outline">Secret saved</Badge> : null}
                          {connection.settingsSummary.pickupAddress ? <Badge variant="outline">Pickup assigned</Badge> : null}
                          {connection.settingsSummary.returnAddress ? <Badge variant="outline">Return flow set</Badge> : null}
                          {connection.settingsSummary.sandboxMode ? <Badge variant="secondary">Sandbox</Badge> : null}
                          <Badge variant={completeness.variant}>
                            {completeness.label} {completeness.score}%
                          </Badge>
                          {recommendation.recommendedForCod ? <Badge variant="default">Recommended for COD</Badge> : null}
                          {recommendation.recommendedForCityDelivery ? <Badge variant="default">Recommended for city delivery</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Provider: {getCourierProviderLabel(connection.provider)} - Last updated {formatDate(connection.updatedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Setup completeness: {completeness.completed}/{completeness.total} key fields assigned.
                        </p>
                        <p className="text-xs text-muted-foreground">Last sync: {formatDate(connection.lastSyncAt)}</p>
                        {connection.settingsSummary.pickupContactName || connection.settingsSummary.pickupContactPhone ? (
                          <p className="text-xs text-muted-foreground">
                            Pickup: {connection.settingsSummary.pickupContactName || "Contact pending"}
                            {connection.settingsSummary.pickupContactPhone ? ` - ${connection.settingsSummary.pickupContactPhone}` : ""}
                          </p>
                        ) : null}
                        {connection.settingsSummary.returnContactName || connection.settingsSummary.returnContactPhone ? (
                          <p className="text-xs text-muted-foreground">
                            Returns: {connection.settingsSummary.returnContactName || "Return contact pending"}
                            {connection.settingsSummary.returnContactPhone ? ` - ${connection.settingsSummary.returnContactPhone}` : ""}
                          </p>
                        ) : null}
                        {connection.lastError?.message ? (
                          <p className="text-xs text-destructive">Last error: {String(connection.lastError.message)}</p>
                        ) : null}
                        {checklist.length > 0 ? (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Why not recommended yet</p>
                            <div className="mt-2 space-y-1">
                              {checklist.slice(0, 5).map((item) => (
                                <p key={item} className="text-xs text-muted-foreground">
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Recommendation check</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              This courier has the core assigned fields needed for merchant operations.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => beginEditing(connection)}>
                          <PencilLine className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => duplicateConnection(connection)}>
                          Duplicate
                        </Button>
                        {courierConnectionStatuses.map((status) => (
                          <Button
                            key={status}
                            type="button"
                            variant={connection.status === status ? "default" : "outline"}
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => void handleStatusChange(connection, status)}
                          >
                            {isUpdating && updateConnection.variables?.status === status ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                            Mark {formatCourierStatusLabel(status)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Recent shipment activity</CardTitle>
          <CardDescription>This is the operational pulse: who is waiting, who is moving, and who already reached the customer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shipmentsError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-muted-foreground">
              Shipment activity could not be loaded right now, but courier connections are still available above.
            </div>
          ) : shipments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground">
              No shipment rows yet. Once your team books from Orders, recent tracking and delivery outcomes will show up here automatically.
            </div>
          ) : (
            shipments.slice(0, 12).map((shipment) => (
              <div key={shipment.id} className="grid gap-4 rounded-2xl border border-border bg-background/60 p-5 lg:grid-cols-[1.25fr_1fr_auto]">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Order {shipment.order_id.slice(0, 8)}</p>
                    <Badge variant={toneForShipment(shipment.status)}>{formatCourierStatusLabel(shipment.status)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(shipment.courier_connection_label?.trim() || getCourierProviderLabel(shipment.provider))} - Created {formatDate(shipment.created_at)}
                  </p>
                  {(shipment.zone_label || shipment.service_area_name) ? (
                    <p className="text-xs text-muted-foreground">
                      {formatCourierConnectionLabel({
                        provider: shipment.provider,
                        displayName: null,
                        zoneLabel: shipment.zone_label ?? null,
                        serviceAreaName: shipment.service_area_name ?? null,
                      })}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking</p>
                  <p className="text-sm font-medium text-foreground">{shipment.tracking_number || shipment.consignment_id || "Not assigned yet"}</p>
                </div>
                <div className="space-y-1 text-left lg:text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivered</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(shipment.delivered_at)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
