"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Palette, Type, Sun, Moon, Sparkles, Wand2, FileText, LayoutTemplate, CheckCircle2, Layers, ArrowUp, ArrowDown, ArrowRight, Eye, EyeOff, Plus, Trash2, Shuffle, Rocket, AlertTriangle, CheckSquare, Copy, GripVertical, Loader2, MessageSquareText, Smartphone } from "lucide-react";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { hslChannelsToHex, resolveStoreThemeVars, hexToHslChannels } from "@/lib/cms/store-theme-utils";
import { themePresets } from "@/lib/themePresets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { BasicBlockMiniEditor } from "./BasicBlockMiniEditor";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { CmsBlockRegistryItem } from "@/lib/cms/block-registry";
import { getBasicLayoutVariantOptions, getBasicStarterLayouts, resolveBasicEditorPageType, resolveBasicFlowSections, type BasicFlowSectionId } from "@/lib/cms/storefront-editor-registry";
import { resolveStorefrontTemplateId, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { refreshStorefrontContentCache } from "@/lib/storefront-cache-client";

interface BasicModeEditorProps {
  store: Store;
  page: StorePage;
  allPages: StorePage[];
  updateBlockProps: (blockId: string, patch: Record<string, unknown>) => void;
  updateBlockMeta: (blockId: string, patch: Partial<StorePageBlock>) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  updateThemeVar: (cssKey: string, hexValue: string) => void;
  updateThemeVars: (hexVars: Record<string, string>) => void;
  updateThemePackage: (packageId: string) => void;
  updateThemeMode: (mode: "light" | "dark") => void;
  updateFont: (target: "heading" | "body", fontFamily: string) => void;
  updateThemeScale: (target: "radius" | "density", value: number) => void;
  updateThemeAesthetic: (aesthetic: "minimal" | "glassmorphism" | "fluid" | "brutalist" | "neumorphism" | "editorial" | "retro" | "artisan" | "dark-luxury" | "playful-pop") => void;
  updateThemeEffect: (effectKey: "scrollReveals" | "hoverEffects" | "parallax" | "intensity", value: any) => void;
  selectPage: (pageId: string) => void;
  addBlockOfType: (type: StorePageBlock["type"]) => void;
  removeBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;
  previewChecked: boolean;
  availableBlocks: CmsBlockRegistryItem[];
}

type SectionId = "start" | "pages" | "layout" | "content" | "theme" | "effects" | "fonts" | "launch";

const HEADING_FONTS = ["Inter", "Poppins", "Playfair Display", "Raleway", "Oswald", "Montserrat"];
const BODY_FONTS = ["Inter", "Open Sans", "Lato", "Nunito", "Source Sans 3"];

const vibeCards: Array<{
  id: NonNullable<Store["theme"]["aesthetic"]>;
  label: string;
  detail: string;
  heading: string;
  body: string;
  swatches: string[];
}> = [
  { id: "minimal", label: "Minimal", detail: "Clean, quiet, fast to scan.", heading: "Inter", body: "Inter", swatches: ["#111827", "#F9FAFB", "#E5E7EB"] },
  { id: "glassmorphism", label: "Glass", detail: "Soft blur, airy surfaces.", heading: "Poppins", body: "Inter", swatches: ["#7C3AED", "#DBEAFE", "#FFFFFF"] },
  { id: "fluid", label: "Fluid", detail: "Organic, modern, softer flow.", heading: "Raleway", body: "Nunito", swatches: ["#0F766E", "#A7F3D0", "#F0FDFA"] },
  { id: "brutalist", label: "Cubic", detail: "Bold blocks, strong contrast.", heading: "Oswald", body: "Lato", swatches: ["#111111", "#FACC15", "#FFFFFF"] },
  { id: "editorial", label: "Editorial", detail: "Magazine-like and story-led.", heading: "Playfair Display", body: "Source Sans 3", swatches: ["#1F2937", "#F5F5F4", "#A16207"] },
  { id: "artisan", label: "Artisan", detail: "Warm, handmade, trustworthy.", heading: "Poppins", body: "Nunito", swatches: ["#92400E", "#FEF3C7", "#FFFFFF"] },
  { id: "dark-luxury", label: "Luxury", detail: "Premium, dark, polished.", heading: "Playfair Display", body: "Inter", swatches: ["#111111", "#B88A44", "#F8F3EA"] },
  { id: "playful-pop", label: "Pop", detail: "Bright, cheerful, energetic.", heading: "Montserrat", body: "Nunito", swatches: ["#EC4899", "#38BDF8", "#FFF7FB"] },
];

const storeFlowSlugs = new Set(["/shop", "/product", "/cart", "/checkout", "/account", "/wishlist", "/order-success", "/track-order"]);
const systemSlugs = new Set(["/admin", "/auth", "/bkash", "/cms-admin"]);

function getPageGroup(page: StorePage): "content" | "store-flow" | "system" {
  if (systemSlugs.has(page.slug) || page.slug.startsWith("/admin") || page.slug.startsWith("/auth")) {
    return "system";
  }

  if (storeFlowSlugs.has(page.slug) || page.slug.startsWith("/product")) {
    return "store-flow";
  }

  return "content";
}

function BlockSkeletonPreview({ type, variant }: { type: string; variant?: string }) {
  if (type === "hero" && variant) {
    if (variant === "full-bleed") {
      return (
        <div className="relative h-full w-full overflow-hidden rounded-sm bg-muted-foreground/15">
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1">
            <div className="h-2 w-3/5 rounded-sm bg-background/80" />
            <div className="h-1.5 w-2/5 rounded-sm bg-background/60" />
            <div className="mt-1 h-2 w-1/4 rounded-sm bg-primary/45" />
          </div>
        </div>
      );
    }

    if (variant === "split") {
      return (
        <div className="grid h-full w-full grid-cols-2 gap-1 p-2">
          <div className="flex flex-col justify-center gap-1">
            <div className="h-2 w-4/5 rounded-sm bg-muted-foreground/30" />
            <div className="h-1.5 w-3/5 rounded-sm bg-muted-foreground/20" />
            <div className="mt-1 h-2 w-1/2 rounded-sm bg-primary/35" />
          </div>
          <div className="rounded-sm bg-muted-foreground/20" />
        </div>
      );
    }

    if (variant === "centered") {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
          <div className="h-2 w-3/5 rounded-sm bg-muted-foreground/30" />
          <div className="h-1.5 w-4/5 rounded-sm bg-muted-foreground/20" />
          <div className="mt-1 h-2 w-1/3 rounded-sm bg-primary/35" />
        </div>
      );
    }

    if (variant === "editorial") {
      return (
        <div className="grid h-full w-full grid-cols-[1.3fr_0.7fr] gap-1 p-2">
          <div className="rounded-sm bg-muted-foreground/20" />
          <div className="flex flex-col justify-end gap-1">
            <div className="h-2 w-full rounded-sm bg-muted-foreground/30" />
            <div className="h-1.5 w-3/4 rounded-sm bg-muted-foreground/20" />
          </div>
        </div>
      );
    }
  }

  if (type === "featured-products" && variant) {
    const columns = variant === "2-col" ? 2 : variant === "4-col" ? 4 : 3;
    const hasSidebar = variant.includes("sidebar");
    const grid = (
      <div className={`grid h-full flex-1 gap-1 ${columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="h-5 rounded-sm bg-muted-foreground/20" />
            <div className="h-1 rounded-sm bg-muted-foreground/30" />
            <div className="h-1 w-2/3 rounded-sm bg-primary/20" />
          </div>
        ))}
      </div>
    );

    return (
      <div className="flex h-full w-full gap-1 p-2">
        {hasSidebar && variant.endsWith("left") ? <div className="w-4 rounded-sm bg-primary/20" /> : null}
        {grid}
        {hasSidebar && variant.endsWith("right") ? <div className="w-4 rounded-sm bg-primary/20" /> : null}
      </div>
    );
  }

  if (type === "category-showcase" && variant) {
    if (variant === "compact-list") {
      return (
        <div className="grid h-full w-full grid-cols-2 gap-1 p-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-1 rounded-sm bg-muted-foreground/10 p-1">
              <div className="h-2 w-2 rounded-full bg-primary/35" />
              <div className="h-1 w-8 rounded-sm bg-muted-foreground/30" />
            </div>
          ))}
        </div>
      );
    }

    if (variant === "carousel") {
      return (
        <div className="flex h-full w-full gap-1 overflow-hidden p-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="min-w-8 flex-1 rounded-sm bg-muted-foreground/20" />
          ))}
          <div className="w-2 rounded-sm bg-muted-foreground/10" />
        </div>
      );
    }

    if (variant === "masonry") {
      return (
        <div className="grid h-full w-full grid-cols-3 gap-1 p-2">
          <div className="rounded-sm bg-muted-foreground/20" />
          <div className="rounded-sm bg-muted-foreground/30" />
          <div className="row-span-2 rounded-sm bg-muted-foreground/20" />
          <div className="rounded-sm bg-muted-foreground/10" />
          <div className="rounded-sm bg-primary/20" />
        </div>
      );
    }
  }

  switch (type) {
    case "hero":
      return (
        <div className="w-full h-full flex flex-col gap-1 p-2">
          <div className="w-full h-1/2 bg-muted-foreground/20 rounded-sm"></div>
          <div className="w-3/4 h-2 bg-muted-foreground/30 rounded-sm mt-1"></div>
          <div className="w-1/2 h-2 bg-muted-foreground/30 rounded-sm"></div>
        </div>
      );
    case "promo-banner":
      return (
        <div className="w-full h-full flex items-center justify-center p-2">
          <div className="flex w-full items-center justify-between gap-2 rounded-sm border border-primary/30 bg-primary/15 px-2 py-1.5">
            <div className="h-1.5 w-2/3 rounded-sm bg-primary/25" />
            <div className="h-3 w-10 rounded-full bg-background/80" />
          </div>
        </div>
      );
    case "featured-products":
    case "category-showcase":
      return (
        <div className="w-full h-full grid grid-cols-3 gap-1 p-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex flex-col gap-1">
              <div className="w-full h-4 bg-muted-foreground/20 rounded-sm"></div>
              <div className="w-full h-1 bg-muted-foreground/30 rounded-sm"></div>
            </div>
          ))}
        </div>
      );
    case "rich-text":
    case "faq-accordion":
      return (
        <div className="w-full h-full flex flex-col justify-center gap-1 p-2">
          <div className="w-full h-1.5 bg-muted-foreground/20 rounded-sm"></div>
          <div className="w-5/6 h-1.5 bg-muted-foreground/20 rounded-sm"></div>
          <div className="w-4/6 h-1.5 bg-muted-foreground/20 rounded-sm"></div>
        </div>
      );
    case "trust-badges":
      return (
        <div className="grid h-full w-full grid-cols-3 gap-1 p-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex flex-col items-center justify-center gap-1 rounded-sm bg-muted-foreground/10 p-1.5">
              <div className="h-3 w-3 rounded-full bg-primary/25" />
              <div className="h-1 w-8 rounded-sm bg-muted-foreground/30" />
            </div>
          ))}
        </div>
      );
    case "testimonials":
      return (
        <div className="grid h-full w-full grid-cols-2 gap-1 p-2">
          {[1, 2].map((item) => (
            <div key={item} className="rounded-sm bg-muted-foreground/10 p-1.5">
              <div className="mb-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="h-1 w-1 rounded-full bg-primary/25" />
                ))}
              </div>
              <div className="h-1.5 w-full rounded-sm bg-muted-foreground/25" />
              <div className="mt-1 h-1.5 w-4/5 rounded-sm bg-muted-foreground/20" />
              <div className="mt-2 h-1 w-1/3 rounded-sm bg-primary/20" />
            </div>
          ))}
        </div>
      );
    case "countdown":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-2 p-2">
          <div className="h-2 w-2/3 rounded-sm bg-muted-foreground/30" />
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-sm bg-primary/15 p-1.5">
                <div className="h-2 rounded-sm bg-primary/25" />
                <div className="mt-1 h-1 rounded-sm bg-muted-foreground/20" />
              </div>
            ))}
          </div>
        </div>
      );
    case "social-feed":
      return (
        <div className="grid h-full w-full grid-cols-3 gap-1 p-2">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="rounded-sm bg-muted-foreground/20" />
          ))}
        </div>
      );
    case "video-reel":
      return (
        <div className="relative h-full w-full p-2">
          <div className="h-full rounded-sm bg-muted-foreground/20" />
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background/85 shadow-sm">
              <div className="ml-0.5 h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-primary/70" />
            </div>
          </div>
        </div>
      );
    case "recently-viewed":
      return (
        <div className="flex h-full w-full gap-1 p-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="min-w-0 flex-1 rounded-sm bg-muted-foreground/15 p-1">
              <div className="h-4 rounded-sm bg-muted-foreground/20" />
              <div className="mt-1 h-1 rounded-sm bg-muted-foreground/25" />
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className="w-full h-full border-2 border-dashed border-muted-foreground/20 rounded-md flex flex-col gap-1 items-center justify-center">
          <LayoutTemplate className="w-6 h-6 text-muted-foreground/50" />
        </div>
      );
  }
}

function getVariantFocusLabel(type: string, variantId: string) {
  if (type === "hero") {
    switch (variantId) {
      case "full-bleed":
        return "Image-led";
      case "split":
        return "Balanced";
      case "centered":
        return "Message-led";
      case "editorial":
        return "Story-led";
      default:
        return "Guided";
    }
  }

  if (type === "featured-products") {
    switch (variantId) {
      case "2-col":
        return "Premium";
      case "3-col":
        return "Balanced";
      case "4-col":
        return "Dense";
      case "3-col-sidebar-left":
      case "3-col-sidebar-right":
        return "Filter-ready";
      default:
        return "Catalog";
    }
  }

  if (type === "category-showcase") {
    switch (variantId) {
      case "cards":
        return "Clear";
      case "carousel":
        return "Swipe";
      case "masonry":
        return "Visual";
      case "compact-list":
        return "Practical";
      default:
        return "Guide";
    }
  }

  return "Layout";
}

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
    primary_zone_aliases?: string[];
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
    primary_zone_aliases: [],
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

function BasicStoreFlowSettingsPanel({ storeId, templateId }: { storeId: string; templateId: StorefrontTemplateId }) {
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
    setSettings((current) => {
      const nextSettings = {
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
      };

      return nextSettings;
    });
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
        ...(key === "delivery_settings" && field !== "enabled"
          ? { enabled: true }
          : {}),
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
      await queryClient.invalidateQueries({ queryKey: ["site_settings", storeId] });
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
    <div data-testid="basic-flow-settings-panel" className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Shopping flow</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Set how shoppers browse products, pay, receive orders, and get support.
        </p>
      </div>

      <div className="grid gap-3">
        {sectionLookup.get("catalog")?.visible ? (
        <details data-testid="basic-flow-panel-shop" className="rounded-lg border border-border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">{sectionLookup.get("catalog")?.title}</summary>
          <div className="mt-4 grid gap-3">
            <p className="text-xs leading-5 text-muted-foreground">{sectionLookup.get("catalog")?.description}</p>
            <div className="grid gap-1.5">
              <Label>Product Visibility</Label>
              <select
                data-testid="basic-flow-product-visibility"
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={settings.storefront_profile.product_visibility ?? "available"}
                onChange={(event) => updateFlowSetting("storefront_profile", "product_visibility", event.target.value)}
              >
                <option value="available">Show available products only</option>
                <option value="all">Show all products</option>
                <option value="featured">Favor featured products</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Product Upsell Title</Label>
              <Input
                data-testid="basic-flow-upsell-title"
                value={settings.upsells.complete_look_title ?? ""}
                onChange={(event) => updateFlowSetting("upsells", "complete_look_title", event.target.value)}
                placeholder="You may also like"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <Label>Show product-page upsell</Label>
              <Switch
                data-testid="basic-flow-upsell-enabled"
                checked={settings.upsells.complete_look_enabled ?? false}
                onCheckedChange={(checked) => updateFlowSetting("upsells", "complete_look_enabled", checked)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <SaveFlowButton settingKey="storefront_profile" />
              <SaveFlowButton settingKey="upsells" />
            </div>
          </div>
        </details>
        ) : null}

        {sectionLookup.get("delivery")?.visible ? (
        <details data-testid="basic-flow-panel-delivery" className="rounded-lg border border-border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">{sectionLookup.get("delivery")?.title}</summary>
          <div className="mt-4 grid gap-3">
            <p className="text-xs leading-5 text-muted-foreground">{sectionLookup.get("delivery")?.description}</p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <Label>Enable delivery fee</Label>
              <Switch
                data-testid="basic-flow-delivery-enabled"
                checked={settings.delivery_settings.enabled ?? true}
                onCheckedChange={(checked) => updateFlowSetting("delivery_settings", "enabled", checked)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Primary Zone Label</Label>
                <Input
                  data-testid="basic-flow-primary-zone-label"
                  value={settings.delivery_settings.primary_zone_label ?? ""}
                  onChange={(event) => updateFlowSetting("delivery_settings", "primary_zone_label", event.target.value)}
                  placeholder="Inside city"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Extended Zone Label</Label>
                <Input
                  data-testid="basic-flow-secondary-zone-label"
                  value={settings.delivery_settings.secondary_zone_label ?? ""}
                  onChange={(event) => updateFlowSetting("delivery_settings", "secondary_zone_label", event.target.value)}
                  placeholder="Outside city"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Primary Zone Cities</Label>
                <Input
                  data-testid="basic-flow-primary-zone-aliases"
                  value={(settings.delivery_settings.primary_zone_aliases ?? []).join(", ")}
                  onChange={(event) => updateFlowSetting(
                    "delivery_settings",
                    "primary_zone_aliases",
                    event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                  )}
                  placeholder="Dhaka, ঢাকা"
                />
                <p className="text-xs text-muted-foreground">Only these exact city names receive the primary delivery rate. Other cities use the extended rate.</p>
              </div>
              <div className="grid gap-1.5">
                <Label>Primary Fee</Label>
                <Input
                  data-testid="basic-flow-primary-delivery-fee"
                  type="number"
                  min={0}
                  value={settings.delivery_settings.delivery_fee ?? 0}
                  onChange={(event) => updateFlowSetting("delivery_settings", "delivery_fee", Number(event.target.value || 0))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Extended Fee</Label>
                <Input
                  data-testid="basic-flow-extended-delivery-fee"
                  type="number"
                  min={0}
                  value={settings.delivery_settings.delivery_fee_outside ?? 0}
                  onChange={(event) => updateFlowSetting("delivery_settings", "delivery_fee_outside", Number(event.target.value || 0))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Free Delivery Threshold</Label>
              <Input
                data-testid="basic-flow-free-delivery-threshold"
                type="number"
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
        <details data-testid="basic-flow-panel-checkout" className="rounded-lg border border-border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">{sectionLookup.get("checkout")?.title}</summary>
          <div className="mt-4 grid gap-3">
            <p className="text-xs leading-5 text-muted-foreground">{sectionLookup.get("checkout")?.description}</p>
            <div className="grid gap-1.5">
              <Label>Checkout Mode</Label>
              <select
                data-testid="basic-flow-checkout-mode"
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={settings.storefront_profile.checkout_mode ?? "standard"}
                onChange={(event) => updateFlowSetting("storefront_profile", "checkout_mode", event.target.value)}
              >
                <option value="standard">Standard checkout</option>
                <option value="whatsapp">WhatsApp-assisted checkout</option>
                <option value="inquiry">Inquiry first</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="space-y-1">
                <Label>Allow checkout without signup</Label>
                <p className="text-xs leading-5 text-muted-foreground">
                  Leave this on for guest checkout, or turn it off to require customer login before purchase.
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
                <div key={method.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <Label>{method.label}</Label>
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
                <Label>bKash Number</Label>
                <Input
                  data-testid="basic-flow-bkash-number"
                  value={settings.payment_settings.bkash_number ?? ""}
                  onChange={(event) => updateFlowSetting("payment_settings", "bkash_number", event.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Nagad Number</Label>
                <Input
                  data-testid="basic-flow-nagad-number"
                  value={settings.payment_settings.nagad_number ?? ""}
                  onChange={(event) => updateFlowSetting("payment_settings", "nagad_number", event.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Prepaid Badge</Label>
              <Input
                data-testid="basic-flow-prepaid-badge"
                value={settings.payment_settings.prepaid_badge_text ?? ""}
                onChange={(event) => updateFlowSetting("payment_settings", "prepaid_badge_text", event.target.value)}
                placeholder="Save more with prepaid payment"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <SaveFlowButton settingKey="storefront_profile" />
              <SaveFlowButton settingKey="payment_settings" />
            </div>
          </div>
        </details>
        ) : null}

        {sectionLookup.get("support")?.visible ? (
        <details data-testid="basic-flow-panel-support" className="rounded-lg border border-border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">{sectionLookup.get("support")?.title}</summary>
          <div className="mt-4 grid gap-3">
            <p className="text-xs leading-5 text-muted-foreground">{sectionLookup.get("support")?.description}</p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <Label>Show WhatsApp support button</Label>
              <Switch
                data-testid="basic-flow-whatsapp-enabled"
                checked={settings.whatsapp_support.enabled ?? false}
                onCheckedChange={(checked) => updateFlowSetting("whatsapp_support", "enabled", checked)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>WhatsApp Number</Label>
              <Input
                data-testid="basic-flow-whatsapp-number"
                value={settings.whatsapp_support.number ?? ""}
                onChange={(event) => updateFlowSetting("whatsapp_support", "number", event.target.value)}
                placeholder="8801XXXXXXXXX"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Default Support Message</Label>
              <Input
                data-testid="basic-flow-whatsapp-message"
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

export function BasicModeEditor({
  store,
  page,
  allPages,
  updateBlockProps,
  updateBlockMeta,
  reorderBlocks,
  updateThemeVar,
  updateThemeVars,
  updateThemePackage,
  updateThemeMode,
  updateFont,
  updateThemeScale,
  updateThemeAesthetic,
  updateThemeEffect,
  selectPage,
  addBlockOfType,
  removeBlock,
  duplicateBlock,
  previewChecked,
  availableBlocks,
}: BasicModeEditorProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("start");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [focusedContentBlockId, setFocusedContentBlockId] = useState<string | null>(null);
  const [focusedLayoutBlockId, setFocusedLayoutBlockId] = useState<string | null>(null);

  // AI Generator state
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const storefrontProfile = typeof store.siteSettings?.storefront_profile === "object" && store.siteSettings?.storefront_profile
    ? store.siteSettings.storefront_profile as Record<string, unknown>
    : {};
  const templateId = resolveStorefrontTemplateId(
    storefrontProfile.template_id,
    {
      templateSeedId: typeof storefrontProfile.template_id === "string" ? storefrontProfile.template_id : null,
      productVisibility: typeof storefrontProfile.product_visibility === "string" ? storefrontProfile.product_visibility : null,
    },
  );
  const pageType = resolveBasicEditorPageType(page.slug);
  const starterLayouts = getBasicStarterLayouts(templateId, pageType);

  const generateAITheme = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingTheme(true);
    try {
      const res = await fetch("/api/ai/generate-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generation failed");
      
      if (data.theme) {
        updateThemeVars({
          "--primary": data.theme.primary,
          "--accent": data.theme.accent,
          "--background": data.theme.background,
          "--foreground": data.theme.foreground,
          "--card": data.theme.background,
          "--card-foreground": data.theme.foreground,
        });
      }
      if (data.fonts) {
        updateFont("heading", data.fonts.heading);
        updateFont("body", data.fonts.body);
      }
      if (data.aesthetic) {
        updateThemeAesthetic(data.aesthetic);
      }
      if (data.hero) {
        const heroBlock = page.blocks.find((b: any) => b.type === "hero");
        if (heroBlock) {
          updateBlockProps(heroBlock.id, {
            tagline: data.hero.tagline,
            title: data.hero.title,
            highlight: data.hero.highlight,
            subtitle: data.hero.subtitle,
            ctaText: data.hero.ctaText
          });
        }
      }
      
      setIsAiDialogOpen(false);
      setAiPrompt("");
      toast.success(data.source === "fallback" ? "Generated a local theme suggestion." : "Generated a theme suggestion.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Theme generation failed.");
    } finally {
      setIsGeneratingTheme(false);
    }
  };

  const { vars } = resolveStoreThemeVars(store.theme);
  const primaryHsl = vars["--primary"] ?? "0 0% 100%";
  const primaryHex = hslChannelsToHex(primaryHsl) ?? "#000000";
  const accentHsl = vars["--accent"] ?? "0 0% 100%";
  const accentHex = hslChannelsToHex(accentHsl) ?? "#000000";
  const bgHsl = vars["--background"] ?? "0 0% 100%";
  const bgHex = hslChannelsToHex(bgHsl) ?? "#ffffff";
  const fgHsl = vars["--foreground"] ?? "0 0% 0%";
  const fgHex = hslChannelsToHex(fgHsl) ?? "#000000";
  const radiusScale = store.theme.radiusScale ?? 0.55;
  const densityScale = store.theme.densityScale ?? 0.5;
  const activeVibe = vibeCards.find((vibe) => vibe.id === store.theme.aesthetic);
  const effectState = {
    scrollReveals: store.theme.effects?.scrollReveals ?? false,
    hoverEffects: store.theme.effects?.hoverEffects ?? true,
    parallax: store.theme.effects?.parallax ?? false,
    intensity: store.theme.effects?.intensity ?? "medium",
  };
  const effectCards = [
    {
      key: "scrollReveals" as const,
      label: "Scroll Reveal",
      detail: "Sections gently appear as shoppers move down the page.",
      bestFor: "Best for story-led homepages.",
      enabled: effectState.scrollReveals,
    },
    {
      key: "hoverEffects" as const,
      label: "Hover Lift",
      detail: "Cards and buttons react when shoppers explore them.",
      bestFor: "Best for product grids and category cards.",
      enabled: effectState.hoverEffects,
    },
    {
      key: "parallax" as const,
      label: "Soft Parallax",
      detail: "Background media moves subtly for a more premium feel.",
      bestFor: "Best for strong hero imagery.",
      enabled: effectState.parallax,
    },
  ];
  const featuredThemePresets = themePresets.slice(0, 6);
  const extraThemePresets = themePresets.slice(6);
  const recommendedPaletteSets = [
    { id: "balanced-brand", label: "Balanced Brand", detail: "Safe, clean contrast for most stores.", primary: "#1f7a52", accent: "#d48a1f", background: "#f8fafc", foreground: "#0f172a" },
    { id: "soft-editorial", label: "Soft Editorial", detail: "Calmer, warmer storefront feel.", primary: "#7c4f3a", accent: "#d39d6a", background: "#f7f2eb", foreground: "#1f2937" },
    { id: "premium-contrast", label: "Premium Contrast", detail: "Stronger CTA separation for conversion-first pages.", primary: "#111827", accent: "#c28b2c", background: "#fffdf8", foreground: "#111827" },
    { id: "fresh-bright", label: "Fresh & Bright", detail: "Lighter, energetic look for food, beauty, and promos.", primary: "#0f766e", accent: "#fb7185", background: "#f8fffe", foreground: "#164e63" },
  ];
  const renderThemePresetCard = (preset: (typeof themePresets)[number]) => {
    const isSelected = store.theme.presetId === preset.id;

    return (
      <div
        key={preset.id}
        onClick={() => {
          updateThemePackage(preset.id);
          if (store.theme.mode === "dark" && !preset.dark) updateThemeMode("light");
        }}
        className={cn(
          "cursor-pointer rounded-xl border p-3 transition-all hover:border-primary/50",
          isSelected ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{preset.name}</span>
          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex h-12 w-full rounded-md border border-border/50 overflow-hidden" style={{ backgroundColor: preset.preview.bg }}>
          <div className="w-1/3 h-full" style={{ backgroundColor: preset.preview.primary }} />
          <div className="w-1/3 h-full ml-auto" style={{ backgroundColor: preset.preview.accent }} />
        </div>
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case "start": {
        const visibleSections = page.blocks.filter((block) => block.isVisible ?? block.visible ?? true).length;
        const heroBlock = page.blocks.find((block) => block.type === "hero");
        const heroProps = heroBlock?.props as Record<string, unknown> | undefined;
        const hasHeroMessage = Boolean(heroProps?.title || heroProps?.subtitle);
        const hasProductsSection = page.blocks.some((block) => block.type === "featured-products" && (block.isVisible ?? block.visible ?? true));
        const hasTrustSection = page.blocks.some((block) => ["trust-badges", "faq-accordion", "testimonials"].includes(block.type) && (block.isVisible ?? block.visible ?? true));
        const hasFlowSettings = Boolean(
          store.theme.aesthetic || store.theme.presetId !== "default" || page.blocks.some((block) => block.type === "featured-products"),
        );
        const readiness = [
          { label: "Hero message", done: hasHeroMessage, action: "Write the first impression" },
          { label: "Visible sections", done: visibleSections >= 3, action: "Add or show key sections" },
          { label: "Product path", done: hasProductsSection, action: "Add product discovery" },
          { label: "Trust proof", done: hasTrustSection, action: "Add FAQ or trust" },
          { label: "Theme chosen", done: store.theme.presetId !== "default" || Boolean(store.theme.aesthetic), action: "Pick the brand look" },
          { label: "Store flow", done: hasFlowSettings, action: "Review checkout settings" },
          { label: "Mobile check", done: previewChecked, action: "Open preview from the dock" },
        ];
        const completed = readiness.filter((item) => item.done).length;
        const nextAction = !hasHeroMessage
          ? { label: "Edit homepage message", section: "content" as SectionId }
          : !hasProductsSection || !hasTrustSection || visibleSections < 3
            ? { label: "Arrange sections", section: "layout" as SectionId }
            : !hasFlowSettings
              ? { label: "Review store flow", section: "pages" as SectionId }
            : { label: "Polish theme", section: "theme" as SectionId };
        const recommendedHints = [
          !hasHeroMessage ? "Write a specific hero promise and button before polishing colors." : null,
          !hasProductsSection ? "Add Featured Products so the page has a direct shopping path." : null,
          !hasTrustSection ? "Add FAQ, trust badges, or reviews to reduce checkout hesitation." : null,
          !previewChecked ? "Open mobile preview once before launch; most shoppers will arrive there first." : null,
        ].filter(Boolean);
        const startCards: Array<{ id: SectionId; title: string; detail: string; action: string; icon: typeof LayoutTemplate; done?: boolean }> = [
          {
            id: "content",
            title: "Edit Homepage",
            detail: hasHeroMessage ? "Your main message exists. Tighten buttons, FAQ, trust, and reviews next." : "Start with the headline, subtitle, and main button customers see first.",
            action: hasHeroMessage ? "Review copy" : "Write message",
            icon: MessageSquareText,
            done: hasHeroMessage,
          },
          {
            id: "layout",
            title: "Arrange Sections",
            detail: `${visibleSections} visible section${visibleSections === 1 ? "" : "s"}. Add trust, products, or FAQ if the page feels thin.`,
            action: "Open layout",
            icon: Layers,
            done: visibleSections >= 3,
          },
          {
            id: "theme",
            title: "Choose Style",
            detail: store.theme.aesthetic ? `Current vibe: ${store.theme.aesthetic}. Adjust colors and fonts when the preview feels close.` : "Pick an aesthetic, palette, and font pairing that fits the brand.",
            action: "Style store",
            icon: Palette,
            done: store.theme.presetId !== "default" || Boolean(store.theme.aesthetic),
          },
          {
            id: "launch",
            title: "Launch Check",
            detail: "Use this last to spot missing brand, content, mobile, and trust basics before publishing.",
            action: "Check readiness",
            icon: Rocket,
            done: completed >= 3,
          },
        ];

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/35 bg-primary/10 p-4 shadow-sm ring-1 ring-primary/10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Next best edit</p>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-foreground">{nextAction.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {page.title} · {visibleSections} visible section{visibleSections === 1 ? "" : "s"} · {previewChecked ? "mobile checked" : "mobile preview still unchecked"}
                  </p>
                </div>
              </div>
              <Button type="button" className="mt-3 min-h-11 w-full justify-center gap-2" onClick={() => setActiveSection(nextAction.section)}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {recommendedHints.length > 0 ? (
              <details className="rounded-xl border border-border bg-card p-3">
                <summary className="cursor-pointer text-sm font-medium text-foreground">More suggestions ({Math.min(recommendedHints.length, 3)})</summary>
                <div className="mt-3 space-y-2">
                  {recommendedHints.slice(0, 3).map((hint) => (
                    <div key={hint} className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                      <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{hint}</span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <div className="grid gap-2">
              {startCards.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "group min-h-12 rounded-xl border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
                    item.done ? "border-border/70 bg-background/50 text-muted-foreground" : "border-primary/30 bg-card shadow-sm",
                  )}
                >
                  <div className="flex items-center gap-3 sm:items-start">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.done ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground")}>
                      {item.done ? <CheckCircle2 className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{index + 1}. {item.title}</p>
                        <span className={cn(
                          "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
                          item.done ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                        )}>{item.done ? "Done" : item.action}</span>
                      </div>
                      <p className="mt-1 hidden text-xs leading-5 text-muted-foreground sm:block">{item.detail}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      }
      case "pages": {
        const pageGroups = [
          {
            id: "content",
            title: "Store pages",
            description: "Pages you can edit directly, such as Home, About, Contact, and campaign pages.",
            pages: allPages.filter((candidate) => getPageGroup(candidate) === "content"),
          },
          {
            id: "store-flow",
            title: "Shopping flow",
            description: "Shop, product, cart, and checkout pages. Use the settings below for payments, delivery, and support.",
            pages: allPages.filter((candidate) => getPageGroup(candidate) === "store-flow"),
          },
          {
            id: "system",
            title: "Platform pages",
            description: "These pages are managed by EZComo and are shown here only for context.",
            pages: allPages.filter((candidate) => getPageGroup(candidate) === "system"),
          },
        ].filter((group) => group.pages.length > 0);

        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Pages & shopping</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a page to edit, or adjust how shoppers browse, pay, receive orders, and get support.
              </p>
            </div>
            <div className="space-y-4">
              {pageGroups.map((group) => (
                <div key={group.id} className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-foreground">{group.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="space-y-2">
                    {group.pages.map((p) => {
                      const isSystem = group.id === "system";
                      const isStoreFlow = group.id === "store-flow";

                      return (
                        <Button
                          key={p.id}
                          variant={p.id === page.id ? "default" : "outline"}
                          className={cn("min-h-11 w-full justify-start", isSystem && "opacity-70")}
                          disabled={isSystem}
                          onClick={() => {
                            if (isSystem) return;
                            selectPage(p.id);
                            setActiveSection(isStoreFlow ? "pages" : "content");
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          <span className="min-w-0 flex-1 truncate text-left">{p.title}</span>
                          {isStoreFlow ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Flow</span> : null}
                          {isSystem ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">System</span> : null}
                          {p.id === page.id && <CheckCircle2 className="ml-2 h-4 w-4 shrink-0" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <BasicStoreFlowSettingsPanel storeId={store.id} templateId={templateId} />
            </div>
          </div>
        );
      }
      case "layout": {
        const focusedLayoutBlock = page.blocks.find((block) => block.id === focusedLayoutBlockId) ?? page.blocks[0] ?? null;
        const focusedLayoutIndex = focusedLayoutBlock ? page.blocks.findIndex((block) => block.id === focusedLayoutBlock.id) : -1;
        const focusedLayoutOptions = focusedLayoutBlock ? getBasicLayoutVariantOptions(templateId, focusedLayoutBlock.type) : [];

        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">Arrange the page</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add, hide, duplicate, or move sections until the page has a clear shopping path.
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="min-h-11 shrink-0 gap-2 sm:min-h-9">
                      <Plus className="h-4 w-4" /> Add Section
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add a Section</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-3 overflow-y-auto p-1 sm:grid-cols-2 sm:p-2 md:grid-cols-3">
                      {availableBlocks.map((block) => (
                        <div 
                          key={block.value} 
                          className="flex flex-col gap-2 p-3 border rounded-xl hover:border-primary cursor-pointer group transition-all"
                          onClick={() => addBlockOfType(block.value)}
                        >
                          <div className="aspect-video bg-muted/20 rounded-lg flex items-center justify-center p-1 group-hover:bg-primary/5 transition-colors border border-transparent group-hover:border-primary/20">
                            <BlockSkeletonPreview type={block.value} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{block.label}</p>
                            <p className="text-xs text-muted-foreground">{block.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            {starterLayouts.length > 0 ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Recommended composition</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {starterLayouts.slice(0, 2).map((layout, index) => (
                    <div key={layout.id} className={cn("rounded-xl border p-3", index === 0 ? "border-primary/40 bg-background/90 ring-1 ring-primary/20" : "border-border bg-background/70")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{layout.title}</p>
                        {index === 0 ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            Recommended
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-foreground/80">{layout.summary}</p>
                      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{layout.bestFor}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/20 p-2">
              {["Choose sections", "Reorder the story", "Pick layout style"].map((label, index) => (
                <span key={label} className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {index + 1}. {label}
                </span>
              ))}
            </div>
            {page.blocks.length > 0 ? (
              <div className="space-y-3">
                {page.blocks.map((block, index) => {
                  const isVisible = block.isVisible ?? block.visible ?? true;

                  return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggedBlockId(block.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", block.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = draggedBlockId ?? event.dataTransfer.getData("text/plain");
                      const startIndex = page.blocks.findIndex((item) => item.id === sourceId);
                      if (startIndex !== -1 && startIndex !== index) {
                        reorderBlocks(startIndex, index);
                        setFocusedLayoutBlockId(block.id);
                      }
                      setDraggedBlockId(null);
                    }}
                    onDragEnd={() => setDraggedBlockId(null)}
                    onClick={() => setFocusedLayoutBlockId(block.id)}
                    className={cn(
                      "group rounded-xl border bg-card p-3 text-left transition-colors",
                      focusedLayoutBlock?.id === block.id ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border hover:border-primary/40",
                      draggedBlockId === block.id && "border-primary bg-primary/5 opacity-70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/30">
                          <BlockSkeletonPreview type={block.type} />
                        </div>
                        <div className="flex min-w-0 flex-col items-start">
                          <span className="truncate text-sm font-semibold capitalize text-foreground">{index + 1}. {block.type.replace("-", " ")}</span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {block.layoutVariant ? block.layoutVariant : "Default layout"}
                            {!isVisible ? " · hidden" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 sm:h-8 sm:w-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateBlockMeta(block.id, { isVisible: !isVisible, visible: !isVisible });
                          }}
                          title={isVisible ? "Hide section" : "Show section"}
                        >
                          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 sm:h-8 sm:w-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            duplicateBlock(block.id);
                          }}
                          title="Duplicate section"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 sm:h-8 sm:w-8"
                          disabled={index === 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            reorderBlocks(index, index - 1);
                          }}
                          title="Move section up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 sm:h-8 sm:w-8"
                          disabled={index === page.blocks.length - 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            reorderBlocks(index, index + 1);
                          }}
                          title="Move section down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10 sm:h-8 sm:w-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeBlock(block.id);
                          }}
                          title="Remove section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                This page has no sections yet. Add a hero, products, trust badges, or FAQ section to give shoppers a clear path.
              </p>
            )}
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {focusedLayoutBlock ? `Layout Style: ${focusedLayoutBlock.type.replace("-", " ")}` : "Layout Style"}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {focusedLayoutOptions.length > 0
                    ? `Choose a visual structure for section ${focusedLayoutIndex + 1}.`
                    : "Select a hero, product, or category section to choose a layout variant."}
                </p>
              </div>
              {focusedLayoutBlock && focusedLayoutOptions.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {focusedLayoutOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => updateBlockMeta(focusedLayoutBlock.id, { layoutVariant: option.id })}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition-colors",
                        focusedLayoutBlock.layoutVariant === option.id ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <div className="relative aspect-video rounded-lg border border-border/70 bg-muted/30">
                        <BlockSkeletonPreview type={focusedLayoutBlock.type} variant={option.id} />
                        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                          <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                            {getVariantFocusLabel(focusedLayoutBlock.type, option.id)}
                          </span>
                          {option.recommended ? (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                              Recommended
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">{option.label}</p>
                        {focusedLayoutBlock.layoutVariant === option.id ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Active</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] font-medium leading-4 text-foreground/80">
                        {option.previewSummary ?? option.guidance}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{option.guidance}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-background/70 p-4 text-xs leading-5 text-muted-foreground">
                This section keeps a simple default layout. Use Content to edit the message, or duplicate it if you want to try another version.
              </div>
              )}
            </div>
          </div>
        );
      }
      case "content": {
        const focusedBlock = page.blocks.find((block) => block.id === focusedContentBlockId) ?? page.blocks[0] ?? null;
        const focusedIndex = focusedBlock ? page.blocks.findIndex((block) => block.id === focusedBlock.id) : -1;
        const previousBlock = focusedIndex > 0 ? page.blocks[focusedIndex - 1] : null;
        const nextBlock = focusedIndex >= 0 && focusedIndex < page.blocks.length - 1 ? page.blocks[focusedIndex + 1] : null;

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Edit one section at a time</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a section, improve the customer-facing copy, then move to the next one.
              </p>
            </div>
            {page.blocks.length > 0 ? (
              <div className="space-y-4">
                <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                  {page.blocks.map((block, index) => {
                    const isFocused = focusedBlock?.id === block.id;
                    const props = block.props as Record<string, unknown>;
                    const label = String(props.title ?? props.tagline ?? block.type.replace("-", " "));

                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => setFocusedContentBlockId(block.id)}
                        className={cn(
                          "min-h-11 min-w-[188px] snap-start rounded-xl border p-2.5 text-left transition-colors",
                          isFocused ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                            <LayoutTemplate className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold capitalize text-foreground">{index + 1}. {block.type.replace("-", " ")}</p>
                              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", (block.isVisible ?? block.visible ?? true) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                {(block.isVisible ?? block.visible ?? true) ? "Live" : "Hidden"}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{label || "Untitled section"}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {focusedBlock ? (
                  <div className="rounded-xl border border-primary/20 bg-card p-3 ring-1 ring-primary/10 sm:p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Editing Section {focusedIndex + 1}</p>
                        <h4 className="mt-1 text-base font-semibold capitalize text-foreground">{focusedBlock.type.replace("-", " ")}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {(focusedBlock.isVisible ?? focusedBlock.visible ?? true) ? "Visible on storefront" : "Hidden from shoppers"} - {focusedIndex + 1} of {page.blocks.length}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 sm:h-8 sm:w-8"
                          disabled={!previousBlock}
                          onClick={() => previousBlock && setFocusedContentBlockId(previousBlock.id)}
                          title="Previous section"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 sm:h-8 sm:w-8"
                          disabled={!nextBlock}
                          onClick={() => nextBlock && setFocusedContentBlockId(nextBlock.id)}
                          title="Next section"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <BasicBlockMiniEditor
                      block={focusedBlock}
                      storeId={store.id}
                      updateBlockProps={updateBlockProps}
                      updateBlockMeta={updateBlockMeta}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Add a section from Layout first, then Content will show the editing controls here.
              </p>
            )}
          </div>
        );
      }
      case "theme":
        {
          const getLuminance = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
          };
          const getContrast = (hex1: string, hex2: string) => {
            try {
              const lum1 = getLuminance(hex1);
              const lum2 = getLuminance(hex2);
              const brightest = Math.max(lum1, lum2);
              const darkest = Math.min(lum1, lum2);
              return (brightest + 0.05) / (darkest + 0.05);
            } catch {
              return 4.5;
            }
          };
          const primaryContrast = getContrast(primaryHex, bgHex);
          const foregroundContrast = getContrast(fgHex, bgHex);
          const isPrimaryLowContrast = primaryContrast < 4.5;
          const isForegroundLowContrast = foregroundContrast < 4.5;
        return (
          <div className="space-y-10">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Choose the brand feel</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick a vibe first. The editor will pair fonts with it, then you can tune colors only if needed.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current style</p>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{activeVibe?.label ?? "Not chosen yet"}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {activeVibe?.detail ?? "Choose a look below to give the storefront a stronger direction."}
                    </p>
                  </div>
                  {activeVibe ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <Palette className="h-5 w-5 shrink-0 text-primary" />}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {vibeCards.map((vibe) => (
                  <button
                    key={vibe.id}
                    type="button"
                    onClick={() => {
                      updateThemeAesthetic(vibe.id);
                      updateFont("heading", vibe.heading);
                      updateFont("body", vibe.body);
                    }}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
                      store.theme.aesthetic === vibe.id ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card",
                    )}
                  >
                    <div className="flex h-10 overflow-hidden rounded-lg border border-border/70">
                      {vibe.swatches.map((swatch, index) => (
                        <span key={`${vibe.id}-${swatch}-${index}`} className="flex-1" style={{ backgroundColor: swatch }} />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{vibe.label}</p>
                      {store.theme.aesthetic === vibe.id ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{vibe.detail}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Generate a Starting Style</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Describe the store and the editor will suggest colors, fonts, vibe, and hero copy.
                    </p>
                  </div>
                <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Sparkles className="w-4 h-4" /> Generate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Generate Store Theme</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>What does your store sell?</Label>
                        <Input 
                          placeholder="e.g. Minimalist eco-friendly skincare"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") generateAITheme();
                          }}
                        />
                      </div>
                      <Button 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                        onClick={generateAITheme}
                        disabled={isGeneratingTheme || !aiPrompt.trim()}
                      >
                        {isGeneratingTheme ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Magic...</>
                        ) : (
                          <><Wand2 className="mr-2 h-4 w-4" /> Generate Theme</>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Spacing and shape</h4>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Adjust how rounded and spacious the storefront feels without changing layout structure.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "compact-sharp", label: "Compact & Sharp", detail: "Tighter cards and crisp corners.", radius: 0.18, density: 0.25 },
                    { id: "balanced", label: "Balanced", detail: "Safe starting point for most stores.", radius: 0.55, density: 0.5 },
                    { id: "soft-airy", label: "Soft & Airy", detail: "More breathing room and softer shapes.", radius: 0.82, density: 0.78 },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        updateThemeScale("radius", option.radius);
                        updateThemeScale("density", option.density);
                      }}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
                        Math.abs(radiusScale - option.radius) < 0.05 && Math.abs(densityScale - option.density) < 0.05
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-card",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{option.label}</p>
                        {Math.abs(radiusScale - option.radius) < 0.05 && Math.abs(densityScale - option.density) < 0.05 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.detail}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Corner softness</Label>
                      <span className="text-xs text-muted-foreground">{Math.round(radiusScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(radiusScale * 100)}
                      onChange={(event) => updateThemeScale("radius", Number(event.target.value) / 100)}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Spacing density</Label>
                      <span className="text-xs text-muted-foreground">{Math.round(densityScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(densityScale * 100)}
                      onChange={(event) => updateThemeScale("density", Number(event.target.value) / 100)}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">Theme Colors</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Use four simple controls: Brand, Accent, Background, and Text.
                </p>
              </div>
               
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={store.theme.mode === "light" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => updateThemeMode("light")}
                  >
                    <Sun className="h-4 w-4 mr-2" /> Light
                  </Button>
                  <Button 
                    variant={store.theme.mode === "dark" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => updateThemeMode("dark")}
                  >
                    <Moon className="h-4 w-4 mr-2" /> Dark
                  </Button>
                </div>
                <Separator />
                <Tabs defaultValue="gallery">
                  <TabsList className="w-full">
                    <TabsTrigger value="gallery" className="flex-1">Palette Gallery</TabsTrigger>
                    <TabsTrigger value="custom" className="flex-1">Custom Palette</TabsTrigger>
                  </TabsList>
                  <TabsContent value="gallery" className="mt-4 space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recommended quick palettes</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {recommendedPaletteSets.map((palette) => (
                          <button
                            key={palette.id}
                            type="button"
                            onClick={() => updateThemeVars({
                              "--primary": palette.primary,
                              "--accent": palette.accent,
                              "--background": palette.background,
                              "--foreground": palette.foreground,
                              "--card": palette.background,
                              "--card-foreground": palette.foreground,
                            })}
                            className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                          >
                            <div className="flex h-10 overflow-hidden rounded-lg border border-border/60">
                              {[palette.background, palette.primary, palette.accent, palette.foreground].map((swatch, index) => (
                                <span key={`${palette.id}-${swatch}-${index}`} className="flex-1" style={{ backgroundColor: swatch }} />
                              ))}
                            </div>
                            <p className="mt-3 text-sm font-semibold text-foreground">{palette.label}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{palette.detail}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {featuredThemePresets.map(renderThemePresetCard)}
                    </div>
                    {extraThemePresets.length > 0 ? (
                      <details className="rounded-lg border border-border bg-muted/20 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          More palettes ({extraThemePresets.length})
                        </summary>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {extraThemePresets.map(renderThemePresetCard)}
                        </div>
                      </details>
                    ) : null}
                  </TabsContent>
                  <TabsContent value="custom" className="mt-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label>Brand</Label>
                        <p className="text-xs text-muted-foreground">Main buttons and important highlights.</p>
                      </div>
                      <Input
                        type="color"
                        className="h-10 w-16 p-1 cursor-pointer"
                        value={primaryHex}
                        onChange={(e) => updateThemeVar("--primary", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label>Accent</Label>
                        <p className="text-xs text-muted-foreground">Badges, small highlights, and emphasis.</p>
                      </div>
                      <Input
                        type="color"
                        className="h-10 w-16 p-1 cursor-pointer"
                        value={accentHex}
                        onChange={(e) => updateThemeVar("--accent", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label>Background</Label>
                        <p className="text-xs text-muted-foreground">Main page background.</p>
                      </div>
                      <Input
                        type="color"
                        className="h-10 w-16 p-1 cursor-pointer"
                        value={bgHex}
                        onChange={(e) => updateThemeVar("--background", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label>Text</Label>
                        <p className="text-xs text-muted-foreground">Main text color across the storefront.</p>
                      </div>
                      <Input
                        type="color"
                        className="h-10 w-16 p-1 cursor-pointer"
                        value={fgHex}
                        onChange={(e) => updateThemeVar("--foreground", e.target.value)}
                      />
                    </div>
                    
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Readability check</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">Check that buttons and text stay easy to read.</p>
                        </div>
                        <Badge variant={isPrimaryLowContrast || isForegroundLowContrast ? "secondary" : "outline"}>
                          {isPrimaryLowContrast || isForegroundLowContrast ? "Needs review" : "Looks good"}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-card p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Brand buttons</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">{primaryContrast.toFixed(1)}:1</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {isPrimaryLowContrast
                              ? `Brand color may blend into the page. Try making it ${getLuminance(bgHex) > 0.5 ? "darker" : "lighter"} or choose a stronger preset.`
                              : "Buttons and key highlights should stand out well enough."}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Main text</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">{foregroundContrast.toFixed(1)}:1</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {isForegroundLowContrast
                              ? `Main text may be hard to read. Try making text ${getLuminance(bgHex) > 0.5 ? "darker" : "lighter"} for safer reading.`
                              : "Main reading contrast looks healthy for most shoppers."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        );
        }
      case "effects":
        return (
          <div className="space-y-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Motion and polish
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Keep effects subtle by default. Use stronger motion only when it helps products feel more premium or playful.
                </p>
              </div>

              <div className="grid gap-3">
                {effectCards.map((effect) => (
                  <button
                    key={effect.key}
                    type="button"
                    onClick={() => updateThemeEffect(effect.key, !effect.enabled)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
                      effect.enabled ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{effect.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{effect.detail}</p>
                        <p className="mt-2 text-[11px] font-medium text-primary">{effect.bestFor}</p>
                      </div>
                      <Switch
                        checked={effect.enabled}
                        onCheckedChange={(checked) => updateThemeEffect(effect.key, checked)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Effect preview</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {effectCards.map((effect) => (
                    <div key={`${effect.key}-preview`} className="rounded-xl border border-border bg-card p-3">
                      <div
                        className={cn(
                          "flex h-24 items-end rounded-lg border border-border/70 bg-gradient-to-br from-background to-muted/50 p-3 transition-all duration-300",
                          effect.key === "hoverEffects" && effect.enabled && "hover:-translate-y-1 hover:shadow-lg",
                          effect.key === "parallax" && effect.enabled && "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%),linear-gradient(to_bottom_right,var(--tw-gradient-stops))]",
                          effect.key === "scrollReveals" && effect.enabled && "animate-pulse",
                        )}
                      >
                        <div className="space-y-1">
                          <div className="h-2 w-16 rounded-full bg-primary/30" />
                          <div className="h-1.5 w-24 rounded-full bg-muted-foreground/25" />
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-foreground">{effect.label}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        {effect.enabled ? "On for your storefront." : "Off for a calmer storefront."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base">Effect strength</Label>
              <p className="text-sm text-muted-foreground">Choose how much movement shoppers should notice.</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "subtle", label: "Subtle", detail: "Quiet" },
                  { id: "medium", label: "Balanced", detail: "Default" },
                  { id: "bold", label: "Bold", detail: "Expressive" },
                ].map(level => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => updateThemeEffect("intensity", level.id as any)}
                    className={cn(
                      "min-h-11 rounded-xl border p-3 text-center transition-colors",
                      effectState.intensity === level.id ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" : "border-border bg-card text-foreground hover:border-primary/40",
                    )}
                  >
                    <span className="block text-xs font-semibold">{level.label}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{level.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Section-level control</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Need different motion on one section? Open it in Content and turn on `Override Global Effects`. Everything else can keep the store-wide setting.
              </p>
            </div>
          </div>
        );
      case "fonts":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Typography</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the fonts used across your store.
              </p>
            </div>
            
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Smart Pairings
              </p>
              <p className="mt-1 text-xs text-muted-foreground mb-3">Try these curated typography combinations for an instant professional look.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button variant="outline" size="sm" className="justify-start whitespace-normal text-left" onClick={() => { updateFont("heading", "Playfair Display"); updateFont("body", "Source Sans 3"); }}>Elegant</Button>
                <Button variant="outline" size="sm" className="justify-start whitespace-normal text-left" onClick={() => { updateFont("heading", "Oswald"); updateFont("body", "Lato"); }}>Modern</Button>
                <Button variant="outline" size="sm" className="justify-start whitespace-normal text-left" onClick={() => { updateFont("heading", "Inter"); updateFont("body", "Inter"); }}>Clean</Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Heading Font</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {HEADING_FONTS.map(font => (
                    <Button
                      key={font}
                      variant={store.theme.headingFont === font ? "default" : "outline"}
                      className="justify-start truncate"
                      style={{ fontFamily: font }}
                      onClick={() => updateFont("heading", font)}
                    >
                      {font}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Body Font</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {BODY_FONTS.map(font => (
                    <Button
                      key={font}
                      variant={store.theme.bodyFont === font ? "default" : "outline"}
                      className="justify-start truncate"
                      style={{ fontFamily: font }}
                      onClick={() => updateFont("body", font)}
                    >
                      {font}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case "launch": {
        const checklist = [
          { id: "theme", label: "Customize store theme", detail: "Pick a vibe, palette, and fonts.", done: store.theme.presetId !== "default" || Boolean(store.theme.aesthetic), section: "theme" as SectionId },
          { id: "pages", label: "Edit homepage content", detail: "Make the headline, CTA, trust, and products feel ready.", done: allPages.some(p => p.blocks.length > 3), section: "content" as SectionId },
          { id: "mobile", label: "Check mobile preview", detail: "Use the floating Preview action, then return here.", done: previewChecked, section: "start" as SectionId },
          { id: "logo", label: "Upload brand logo", detail: "Add your logo in Store Settings.", done: !!store.logoUrl, section: null },
          { id: "domain", label: "Connect custom domain", detail: "Connect your domain in Store Settings.", done: !!store.customDomain, section: null },
        ];
        const completed = checklist.filter(c => c.done).length;
        const progress = Math.round((completed / checklist.length) * 100);
        const nextChecklistItem = checklist.find((item) => !item.done);
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Launch Checklist
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Complete these steps to get your store ready for launch.
              </p>
            </div>

            {nextChecklistItem ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 ring-1 ring-primary/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Next launch task</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{nextChecklistItem.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{nextChecklistItem.detail}</p>
                {nextChecklistItem.section ? (
                  <Button type="button" size="sm" className="mt-3 min-h-11 gap-2 sm:min-h-9" onClick={() => setActiveSection(nextChecklistItem.section)}>
                    <Wand2 className="h-4 w-4" />
                    Open Task
                  </Button>
                ) : (
                  <p className="mt-3 rounded-lg border border-border bg-background/80 p-3 text-xs text-muted-foreground">
                    This is managed in Store Settings, so you can finish it there when you are ready.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">Ready for a final preview.</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">All Basic checks are complete. Save, preview the storefront, and publish when the page feels right.</p>
              </div>
            )}
            
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Store Readiness</span>
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              <div className="space-y-3 pt-4">
                {checklist.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.section}
                    onClick={() => item.section && setActiveSection(item.section)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
                      item.done ? "bg-primary/5" : "bg-muted/30",
                      item.section && "hover:bg-primary/10",
                    )}
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-medium", item.done ? "text-foreground" : "text-muted-foreground")}>
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.detail}</span>
                    </span>
                    {item.section ? <span className="shrink-0 text-[11px] font-medium text-primary">{item.done ? "Review" : "Open"}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }
    }
  };

  const navItems = [
    { id: "start", icon: Wand2, label: "Start Here", shortLabel: "Start", group: "Plan", hint: "See the next best task." },
    { id: "pages", icon: FileText, label: "Pages & Shopping", shortLabel: "Pages", group: "Structure", hint: "Choose pages and buying flow." },
    { id: "layout", icon: Layers, label: "Arrange Sections", shortLabel: "Layout", group: "Structure", hint: "Show, hide, and reorder sections." },
    { id: "content", icon: LayoutTemplate, label: "Edit Content", shortLabel: "Content", group: "Content", hint: "Change text, offers, and section copy." },
    { id: "theme", icon: Palette, label: "Brand Style", shortLabel: "Theme", group: "Style", hint: "Choose colors and visual direction." },
    { id: "effects", icon: Sparkles, label: "Motion", shortLabel: "Effects", group: "Style", hint: "Add polish and subtle interactions." },
    { id: "fonts", icon: Type, label: "Fonts", shortLabel: "Fonts", group: "Style", hint: "Pick the store voice and readability." },
    { id: "launch", icon: Rocket, label: "Launch Check", shortLabel: "Launch", group: "Finish", hint: "Preview, review, and publish confidently." },
  ] as const;
  const activeNavIndex = Math.max(0, navItems.findIndex((item) => item.id === activeSection));
  const activeNavItem = navItems[activeNavIndex] ?? navItems[0];
  const previousNavItem = activeNavIndex > 0 ? navItems[activeNavIndex - 1] : null;
  const nextNavItem = activeNavIndex < navItems.length - 1 ? navItems[activeNavIndex + 1] : null;
  const visibleBlockCount = page.blocks.filter((block) => block.isVisible ?? block.visible ?? true).length;
  const hiddenBlockCount = Math.max(0, page.blocks.length - visibleBlockCount);
  const contentPageCount = allPages.filter((candidate) => getPageGroup(candidate) === "content").length;
  const navGroups = [
    {
      id: "plan",
      title: "Plan",
      items: navItems.filter((item) => item.group === "Plan"),
    },
    {
      id: "structure",
      title: "Build",
      items: navItems.filter((item) => item.group === "Structure"),
    },
    {
      id: "content",
      title: "Write",
      items: navItems.filter((item) => item.group === "Content"),
    },
    {
      id: "style",
      title: "Style",
      items: navItems.filter((item) => item.group === "Style"),
    },
    {
      id: "finish",
      title: "Finish",
      items: navItems.filter((item) => item.group === "Finish"),
    },
  ];

  return (
    <div data-testid="basic-mode-editor" className="flex h-full w-full flex-col bg-card text-card-foreground">
      <div className="sticky top-0 z-10 border-b border-primary/10 bg-card/95 p-2 backdrop-blur sm:bg-muted/20 sm:p-3">
        <div className="mb-2 rounded-2xl border border-primary/15 bg-primary/[0.03] p-3 shadow-sm sm:mb-3 sm:rounded-3xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-primary">
                  Guided editor
                </Badge>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-foreground sm:text-xl">{page.title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Make this page clearer for shoppers, then preview and launch when it feels ready.
              </p>
              <p className="mt-2 text-xs text-muted-foreground sm:hidden">
                {visibleBlockCount} live · {hiddenBlockCount} hidden · {contentPageCount} page{contentPageCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="hidden gap-2 sm:grid sm:grid-cols-3 lg:min-w-[360px]">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Visible</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{visibleBlockCount} live sections</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Hidden</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{hiddenBlockCount} tucked away</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pages</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{contentPageCount} content pages</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 sm:hidden">
          <div className="rounded-2xl border border-border/70 bg-background/85 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 min-w-20 rounded-full px-3 text-xs"
                disabled={!previousNavItem}
                onClick={() => previousNavItem && setActiveSection(previousNavItem.id)}
              >
                <ArrowUp className="mr-1 h-3.5 w-3.5 rotate-[-90deg]" />
                Back
              </Button>
              <div className="min-w-0 flex-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Task {activeNavIndex + 1} of {navItems.length}</p>
                <p className="truncate text-sm font-semibold text-foreground">{activeNavItem.shortLabel}</p>
                <div className="mx-auto mt-1.5 h-1.5 w-24 max-w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${((activeNavIndex + 1) / navItems.length) * 100}%` }}
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-11 min-w-20 rounded-full px-3 text-xs"
                disabled={!nextNavItem}
                onClick={() => nextNavItem && setActiveSection(nextNavItem.id)}
              >
                Next
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`basic-mode-tab-${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "min-h-11 min-w-[112px] snap-start rounded-2xl border px-3 py-2 text-left transition-colors",
                  activeSection === item.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-background/70",
                )}
                title={item.label}
              >
                <div className="flex items-center gap-2">
                  <item.icon className={cn("h-4 w-4 shrink-0", activeSection === item.id ? "text-primary" : "text-muted-foreground")} />
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm font-medium", activeSection === item.id ? "text-foreground" : "text-muted-foreground")}>{item.shortLabel}</p>
                    <p className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{item.group}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="hidden gap-3 sm:grid">
          {navGroups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-border/70 bg-background/70 p-2">
              <div className="mb-2 px-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <Button
                    key={item.id}
                    data-testid={`basic-mode-tab-${item.id}`}
                    variant={activeSection === item.id ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-auto min-w-0 shrink-0 items-start gap-2 rounded-2xl px-3 py-2 text-left",
                      activeSection === item.id ? "bg-primary/10 text-primary ring-1 ring-primary/25 hover:bg-primary/20 hover:text-primary" : "text-muted-foreground",
                    )}
                    onClick={() => setActiveSection(item.id)}
                    title={item.label}
                  >
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-[11px] leading-4 text-muted-foreground">{item.hint}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 hidden items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-3 py-2 sm:flex">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{activeNavItem.label}</p>
            <p className="text-xs leading-5 text-muted-foreground">{activeNavItem.hint}</p>
          </div>
          <div className="flex items-center gap-2">
            {previousNavItem ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setActiveSection(previousNavItem.id)}
              >
                <ArrowUp className="mr-1 h-3.5 w-3.5 rotate-[-90deg]" />
                Back
              </Button>
            ) : null}
            {nextNavItem ? (
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => setActiveSection(nextNavItem.id)}
              >
                Next
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-muted/10 p-3 pb-32 sm:p-5 sm:pb-5">
        {renderSection()}
      </div>
    </div>
  );
}
