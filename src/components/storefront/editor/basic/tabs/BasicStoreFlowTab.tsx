"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { resolveBasicFlowSections, type BasicFlowSectionId } from "@/lib/cms/storefront-editor-registry";
import { resolveStorefrontTemplateId, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import type { Store } from "@/lib/cms/schema";
import { refreshStorefrontContentCache } from "@/lib/storefront-cache-client";

type StoreFlowSettings = {
  storefront_profile: {
    template_id?: string;
    product_visibility?: string;
    checkout_mode?: string;
    allow_guest_checkout?: boolean;
  };
  payment_settings: {
    cod_enabled?: boolean;
    bkash_enabled?: boolean;
    bkash_number?: string;
    nagad_enabled?: boolean;
    nagad_number?: string;
    prepaid_badge_text?: string;
    prepayment_discount_type?: string;
    prepayment_discount_value?: number;
  };
  delivery_settings: {
    enabled?: boolean;
    primary_zone_label?: string;
    secondary_zone_label?: string;
    delivery_fee?: number;
    delivery_fee_outside?: number;
    free_threshold?: number;
  };
  whatsapp_support: {
    enabled?: boolean;
    number?: string;
    message?: string;
  };
  upsells: {
    complete_look_enabled?: boolean;
    complete_look_title?: string;
    complete_look_product_id?: string;
  };
};

const defaultFlowSettings: StoreFlowSettings = {
  storefront_profile: {
    product_visibility: "available",
    checkout_mode: "standard",
    allow_guest_checkout: true,
  },
  payment_settings: {
    cod_enabled: true,
    bkash_enabled: false,
    bkash_number: "",
    nagad_enabled: false,
    nagad_number: "",
    prepaid_badge_text: "",
    prepayment_discount_type: "none",
    prepayment_discount_value: 0,
  },
  delivery_settings: {
    enabled: true,
    primary_zone_label: "Inside city",
    secondary_zone_label: "Outside city",
    delivery_fee: 80,
    delivery_fee_outside: 150,
    free_threshold: 2000,
  },
  whatsapp_support: {
    enabled: false,
    number: "",
    message: "Hi! I need help with my order.",
  },
  upsells: {
    complete_look_enabled: false,
    complete_look_title: "You may also like",
    complete_look_product_id: "",
  },
};

export interface BasicStoreFlowTabProps {
  store: Store;
}

export function BasicStoreFlowTab({ store }: BasicStoreFlowTabProps) {
  const storeId = store.id;
  const storefrontProfileSetting = typeof store.siteSettings?.storefront_profile === "object" && store.siteSettings?.storefront_profile
    ? store.siteSettings.storefront_profile as Record<string, unknown>
    : {};
  const templateId = resolveStorefrontTemplateId(
    storefrontProfileSetting.template_id,
    {
      templateSeedId: typeof storefrontProfileSetting.template_id === "string" ? storefrontProfileSetting.template_id : null,
    }
  );

  const queryClient = useQueryClient();
  const { data: storefrontProfile } = useSiteSettings<StoreFlowSettings["storefront_profile"]>("storefront_profile", storeId);
  const { data: paymentSettings } = useSiteSettings<StoreFlowSettings["payment_settings"]>("payment_settings", storeId);
  const { data: deliverySettings } = useSiteSettings<StoreFlowSettings["delivery_settings"]>("delivery_settings", storeId);
  const { data: whatsappSupport } = useSiteSettings<StoreFlowSettings["whatsapp_support"]>("whatsapp_support", storeId);
  const { data: upsells } = useSiteSettings<StoreFlowSettings["upsells"]>("upsells", storeId);

  const [settings, setSettings] = useState<StoreFlowSettings>(defaultFlowSettings);
  const [saving, setSaving] = useState<keyof StoreFlowSettings | null>(null);
  const dirtySettingKeysRef = useRef<Set<keyof StoreFlowSettings>>(new Set());

  const flowSections = resolveBasicFlowSections(templateId);
  const sectionLookup = new Map<BasicFlowSectionId, ReturnType<typeof resolveBasicFlowSections>[number]>(
    flowSections.map((section) => [section.id, section]),
  );

  useEffect(() => {
    setSettings((current) => ({
      storefront_profile: dirtySettingKeysRef.current.has("storefront_profile")
        ? current.storefront_profile
        : { ...defaultFlowSettings.storefront_profile, ...(storefrontProfile ?? {}) },
      payment_settings: dirtySettingKeysRef.current.has("payment_settings")
        ? current.payment_settings
        : { ...defaultFlowSettings.payment_settings, ...(paymentSettings ?? {}) },
      delivery_settings: dirtySettingKeysRef.current.has("delivery_settings")
        ? current.delivery_settings
        : { ...defaultFlowSettings.delivery_settings, ...(deliverySettings ?? {}) },
      whatsapp_support: dirtySettingKeysRef.current.has("whatsapp_support")
        ? current.whatsapp_support
        : { ...defaultFlowSettings.whatsapp_support, ...(whatsappSupport ?? {}) },
      upsells: dirtySettingKeysRef.current.has("upsells")
        ? current.upsells
        : { ...defaultFlowSettings.upsells, ...(upsells ?? {}) },
    }));
  }, [deliverySettings, paymentSettings, storefrontProfile, upsells, whatsappSupport]);

  const updateFlowSetting = <TKey extends keyof StoreFlowSettings>(
    key: TKey,
    field: keyof StoreFlowSettings[TKey],
    value: StoreFlowSettings[TKey][keyof StoreFlowSettings[TKey]],
  ) => {
    dirtySettingKeysRef.current.add(key);
    setSettings((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...(key === "delivery_settings" && field !== "enabled" ? { enabled: true } : {}),
        [field]: value,
      },
    }));
  };

  const saveFlowSetting = async (key: keyof StoreFlowSettings) => {
    setSaving(key);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ store_id: storeId, key, value: settings[key] }, { onConflict: "store_id,key" });

      if (error) throw error;
      dirtySettingKeysRef.current.delete(key);
      await queryClient.invalidateQueries({ queryKey: ["site_settings", storeId, key] });
      await refreshStorefrontContentCache(supabase, storeId);
      toast.success(`${key.replace(/_/g, " ")} saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save flow settings.");
    } finally {
      setSaving(null);
    }
  };

  const SaveFlowButton = ({ settingKey }: { settingKey: keyof StoreFlowSettings }) => (
    <Button
      type="button"
      size="sm"
      className="gap-2"
      data-testid={`basic-flow-save-${settingKey}`}
      disabled={saving === settingKey}
      onClick={() => void saveFlowSetting(settingKey)}
    >
      {saving === settingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Save
    </Button>
  );

  return (
    <div data-testid="basic-flow-settings-panel" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Shopping Experience Settings</h3>
        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
          Adjust the buying experience: shop, catalog, delivery, payment, and WhatsApp support.
        </p>
      </div>

      <div className="grid gap-3">
        {sectionLookup.get("catalog")?.visible ? (
          <details data-testid="basic-flow-panel-shop" className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900" open>
            <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">{sectionLookup.get("catalog")?.title}</summary>
            <div className="mt-4 grid gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{sectionLookup.get("catalog")?.description}</p>
              <div className="grid gap-1.5">
                <Label className="text-xs">Product Visibility</Label>
                <select
                  data-testid="basic-flow-product-visibility"
                  className="h-9 rounded-md border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 px-3 text-xs"
                  value={settings.storefront_profile.product_visibility ?? "available"}
                  onChange={(event) => updateFlowSetting("storefront_profile", "product_visibility", event.target.value)}
                >
                  <option value="available">Show available products only</option>
                  <option value="all">Show all products</option>
                  <option value="featured">Favor featured products</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Product Upsell Title</Label>
                <Input
                  data-testid="basic-flow-upsell-title"
                  className="h-9 text-xs"
                  value={settings.upsells.complete_look_title ?? ""}
                  onChange={(event) => updateFlowSetting("upsells", "complete_look_title", event.target.value)}
                  placeholder="You may also like"
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 p-3">
                <Label className="text-xs">Show product-page upsell</Label>
                <Switch
                  data-testid="basic-flow-upsell-enabled"
                  checked={settings.upsells.complete_look_enabled ?? false}
                  onCheckedChange={(checked) => updateFlowSetting("upsells", "complete_look_enabled", checked)}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <SaveFlowButton settingKey="storefront_profile" />
                <SaveFlowButton settingKey="upsells" />
              </div>
            </div>
          </details>
        ) : null}

        {sectionLookup.get("delivery")?.visible ? (
          <details data-testid="basic-flow-panel-delivery" className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">{sectionLookup.get("delivery")?.title}</summary>
            <div className="mt-4 grid gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{sectionLookup.get("delivery")?.description}</p>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 p-3">
                <Label className="text-xs">Enable delivery fee</Label>
                <Switch
                  data-testid="basic-flow-delivery-enabled"
                  checked={settings.delivery_settings.enabled ?? true}
                  onCheckedChange={(checked) => updateFlowSetting("delivery_settings", "enabled", checked)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Primary Zone Label</Label>
                  <Input
                    data-testid="basic-flow-primary-zone-label"
                    className="h-9 text-xs"
                    value={settings.delivery_settings.primary_zone_label ?? ""}
                    onChange={(event) => updateFlowSetting("delivery_settings", "primary_zone_label", event.target.value)}
                    placeholder="Inside city"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Extended Zone Label</Label>
                  <Input
                    data-testid="basic-flow-secondary-zone-label"
                    className="h-9 text-xs"
                    value={settings.delivery_settings.secondary_zone_label ?? ""}
                    onChange={(event) => updateFlowSetting("delivery_settings", "secondary_zone_label", event.target.value)}
                    placeholder="Outside city"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Primary Fee</Label>
                  <Input
                    data-testid="basic-flow-primary-delivery-fee"
                    type="number"
                    className="h-9 text-xs"
                    min={0}
                    value={settings.delivery_settings.delivery_fee ?? 0}
                    onChange={(event) => updateFlowSetting("delivery_settings", "delivery_fee", Number(event.target.value || 0))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Extended Fee</Label>
                  <Input
                    data-testid="basic-flow-extended-delivery-fee"
                    type="number"
                    className="h-9 text-xs"
                    min={0}
                    value={settings.delivery_settings.delivery_fee_outside ?? 0}
                    onChange={(event) => updateFlowSetting("delivery_settings", "delivery_fee_outside", Number(event.target.value || 0))}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Free Delivery Threshold</Label>
                <Input
                  data-testid="basic-flow-free-delivery-threshold"
                  type="number"
                  className="h-9 text-xs"
                  min={0}
                  value={settings.delivery_settings.free_threshold ?? 0}
                  onChange={(event) => updateFlowSetting("delivery_settings", "free_threshold", Number(event.target.value || 0))}
                />
              </div>
              <SaveFlowButton settingKey="delivery_settings" />
            </div>
          </details>
        ) : null}

        {sectionLookup.get("checkout")?.visible ? (
          <details data-testid="basic-flow-panel-checkout" className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">{sectionLookup.get("checkout")?.title}</summary>
            <div className="mt-4 grid gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{sectionLookup.get("checkout")?.description}</p>
              <div className="grid gap-1.5">
                <Label className="text-xs">Checkout Mode</Label>
                <select
                  data-testid="basic-flow-checkout-mode"
                  className="h-9 rounded-md border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 px-3 text-xs"
                  value={settings.storefront_profile.checkout_mode ?? "standard"}
                  onChange={(event) => updateFlowSetting("storefront_profile", "checkout_mode", event.target.value)}
                >
                  <option value="standard">Standard checkout</option>
                  <option value="whatsapp">WhatsApp-assisted checkout</option>
                  <option value="inquiry">Inquiry first</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Allow checkout without signup</Label>
                  <p className="text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                    Keep guest checkout on, or require customers to sign in before they can buy from this store.
                  </p>
                </div>
                <Switch
                  data-testid="basic-flow-allow-guest-checkout"
                  checked={settings.storefront_profile.allow_guest_checkout ?? true}
                  onCheckedChange={(checked) => updateFlowSetting("storefront_profile", "allow_guest_checkout", checked)}
                />
              </div>
              <div className="grid gap-2">
                {[
                  { key: "cod_enabled", label: "Cash on Delivery" },
                  { key: "bkash_enabled", label: "bKash" },
                  { key: "nagad_enabled", label: "Nagad" },
                ].map((method) => (
                  <div key={method.key} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 p-3">
                    <Label className="text-xs">{method.label}</Label>
                    <Switch
                      data-testid={`basic-flow-payment-${method.key}`}
                      checked={Boolean(settings.payment_settings[method.key as keyof StoreFlowSettings["payment_settings"]])}
                      onCheckedChange={(checked) => updateFlowSetting("payment_settings", method.key as keyof StoreFlowSettings["payment_settings"], checked)}
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">bKash Number</Label>
                  <Input
                    data-testid="basic-flow-bkash-number"
                    className="h-9 text-xs"
                    value={settings.payment_settings.bkash_number ?? ""}
                    onChange={(event) => updateFlowSetting("payment_settings", "bkash_number", event.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Nagad Number</Label>
                  <Input
                    data-testid="basic-flow-nagad-number"
                    className="h-9 text-xs"
                    value={settings.payment_settings.nagad_number ?? ""}
                    onChange={(event) => updateFlowSetting("payment_settings", "nagad_number", event.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Prepaid Badge</Label>
                <Input
                  data-testid="basic-flow-prepaid-badge"
                  className="h-9 text-xs"
                  value={settings.payment_settings.prepaid_badge_text ?? ""}
                  onChange={(event) => updateFlowSetting("payment_settings", "prepaid_badge_text", event.target.value)}
                  placeholder="Save more with prepaid payment"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <SaveFlowButton settingKey="storefront_profile" />
                <SaveFlowButton settingKey="payment_settings" />
              </div>
            </div>
          </details>
        ) : null}

        {sectionLookup.get("support")?.visible ? (
          <details data-testid="basic-flow-panel-support" className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">{sectionLookup.get("support")?.title}</summary>
            <div className="mt-4 grid gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{sectionLookup.get("support")?.description}</p>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 p-3">
                <Label className="text-xs">Show WhatsApp support button</Label>
                <Switch
                  data-testid="basic-flow-whatsapp-enabled"
                  checked={settings.whatsapp_support.enabled ?? false}
                  onCheckedChange={(checked) => updateFlowSetting("whatsapp_support", "enabled", checked)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">WhatsApp Number</Label>
                <Input
                  data-testid="basic-flow-whatsapp-number"
                  className="h-9 text-xs"
                  value={settings.whatsapp_support.number ?? ""}
                  onChange={(event) => updateFlowSetting("whatsapp_support", "number", event.target.value)}
                  placeholder="8801XXXXXXXXX"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Default Support Message</Label>
                <Input
                  data-testid="basic-flow-whatsapp-message"
                  className="h-9 text-xs"
                  value={settings.whatsapp_support.message ?? ""}
                  onChange={(event) => updateFlowSetting("whatsapp_support", "message", event.target.value)}
                  placeholder="Hi! I need help with my order."
                />
              </div>
              <SaveFlowButton settingKey="whatsapp_support" />
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
