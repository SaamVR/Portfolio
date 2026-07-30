"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Layers,
  LayoutTemplate,
  Loader2,
  MapPin,
  MessageCircleMore,
  Package,
  Rocket,
  Save,
  Search,
  Share2,
  Sparkles,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AdminPreviewStoreButton } from "@/components/admin/AdminPreviewStoreButton";
import { MerchantPreviewChecklist } from "@/components/admin/MerchantPreviewChecklist";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StorefrontPreviewFrame } from "@/components/storefront/StorefrontPreviewFrame";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontTemplateRenderer } from "@/components/storefront/StorefrontTemplateRenderer";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
import { BASIC_THEME_TOKENS, GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { fallbackPageBlueprints, loadPageBlueprints, type CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import { getCatalogModeLabel } from "@/lib/cms/storefront-compat";
import {
  type LaunchTemplatePaymentDefaults,
} from "@/lib/cms/launch-templates";
import { isTemplateSeedMetadata, reseedTemplateCatalog, unseedTemplateCatalog } from "@/lib/cms/template-seed-management";
import { createStoreSlug } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { buildPageBuilderPath } from "@/lib/admin-paths";
import type { Store, StorePage } from "@/lib/cms/schema";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { getEffectiveSubscriptionStatus } from "@/lib/billing/plans";
import {
  fallbackStoreBlueprints,
  findStoreBlueprintById,
  loadStoreBlueprints,
  resolveStoreBlueprint,
  type StoreBlueprintDefinition,
} from "@/lib/cms/store-blueprints";
import {
  buildStorefrontTemplateSiteSettingsEntries,
  getStorefrontTemplateSeedDefinition,
  getStorefrontTemplateDefinition,
  resolveStorefrontTemplateProfile,
  storefrontTemplateOptions,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { instantiateStorePagesFromTemplate } from "@/lib/cms/template-pages";
import { resolveOnboardingTemplateBehavior } from "@/lib/cms/onboarding-template-registry";
import { resolveStorefrontOrderExperienceFromProfile } from "@/lib/cms/storefront-order-experience";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";
import {
  fallbackThemePackages,
  resolveThemePackageById,
  loadThemePackages,
  type ThemePackageDefinition,
} from "@/lib/theme-packages";
import type { Json } from "@/integrations/supabase/types";

interface DraftState {
  storeName: string;
  slug: string;
  customDomain?: string;
  description: string;
  logoUrl: string;
  blueprintId: string;
  businessFamily: StoreBlueprintDefinition["businessFamily"];
  catalogMode: StoreBlueprintDefinition["catalogMode"];
  themePackageId: string;
  themeMode: Store["theme"]["mode"];
  headingFont: string;
  bodyFont: string;
  borderRadius: string;
  customCssVars: Record<string, string>;
  heroTagline: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroMediaUrl: string;
  payment: LaunchTemplatePaymentDefaults & {
    bkash_number: string;
    nagad_number: string;
  };
  contactPage: {
    badge: string;
    title: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    whatsapp: string;
    formButtonLabel: string;
    responseTimeLabel: string;
    responseTimeText: string;
    mapEnabled: boolean;
    mapEmbedUrl: string;
  };
  delivery: {
    enabled: boolean;
    primaryZoneLabel: string;
    secondaryZoneLabel: string;
    deliveryFee: number;
    deliveryFeeOutside: number;
    freeThreshold: number;
  };
  whatsappSupport: {
    enabled: boolean;
    number: string;
    message: string;
  };
  faqEntries: Array<{ q: string; a: string }>;
  isPublished: boolean;
}

type ContentSectionId = "hero" | "delivery" | "lead" | "whatsapp";
type LaunchCompletionState = {
  published: boolean;
  templateId: string;
};

function getTemplateSeedDefaults(templateId: string, blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints) {
  const templateProfile = resolveStorefrontTemplateProfile(templateId, { blueprintId: templateId });
  const blueprint = findStoreBlueprintById(templateProfile.seedBlueprintId, blueprints)
    ?? resolveStoreBlueprint(templateProfile.seedBlueprintId, blueprints);

  return {
    templateProfile,
    seedDefinition: templateProfile.seedDefinition,
    blueprint,
  };
}

async function saveStoreScopedSiteSettings(
  client: typeof supabase,
  storeId: string,
  entries: Array<{ key: string; value: Json }>,
) {
  if (entries.length === 0) {
    return { error: null };
  }

  const uniqueEntries = Array.from(
    new Map(entries.map((entry) => [entry.key, entry])).values(),
  );
  const keys = uniqueEntries.map((entry) => entry.key);

  const { data: existingRows, error: existingRowsError } = await client
    .from("site_settings")
    .select("id, key")
    .eq("store_id", storeId)
    .in("key", keys);

  if (existingRowsError) {
    return { error: existingRowsError };
  }

  const existingKeySet = new Set(
    ((existingRows as Array<{ id: string; key: string }> | null) ?? []).map((row) => row.key),
  );

  const rowsToUpdate = uniqueEntries.filter((entry) => existingKeySet.has(entry.key));
  for (const row of rowsToUpdate) {
    const { error } = await client
      .from("site_settings")
      .update({ value: row.value })
      .eq("store_id", storeId)
      .eq("key", row.key);
    if (error) {
      return { error };
    }
  }

  const rowsToInsert = uniqueEntries
    .filter((entry) => !existingKeySet.has(entry.key))
    .map((entry) => ({
      store_id: storeId,
      key: entry.key,
      value: entry.value,
    }));

  if (rowsToInsert.length > 0) {
    const { error } = await client.from("site_settings").insert(rowsToInsert);
    if (error) {
      return { error };
    }
  }

  return { error: null };
}

function OnboardingPreviewCard({
  icon: Icon,
  title,
  description,
  points,
}: {
  icon: typeof Truck;
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-background p-2 text-primary shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {points.length > 0 ? (
        <div className="mt-3 space-y-2">
          {points.slice(0, 3).map((point) => (
            <div key={point} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getBlueprintSiteSettingRecord(blueprint: StoreBlueprintDefinition, key: string) {
  const value = blueprint.defaultSiteSettings[key];
  return typeof value === "object" && value ? value as Record<string, unknown> : {};
}

function getDefaultContactPage(blueprint: StoreBlueprintDefinition) {
  const contact = getBlueprintSiteSettingRecord(blueprint, "contact_page");
  return {
    badge: typeof contact.badge === "string" ? contact.badge : "Get in touch",
    title: typeof contact.title === "string" ? contact.title : "Contact Us",
    description: typeof contact.description === "string" ? contact.description : blueprint.storeDescription,
    address: typeof contact.address === "string" ? contact.address : "",
    phone: typeof contact.phone === "string" ? contact.phone : "",
    email: typeof contact.email === "string" ? contact.email : "",
    whatsapp: typeof contact.whatsapp === "string" ? contact.whatsapp : "",
    formButtonLabel: typeof contact.form_button_label === "string" ? contact.form_button_label : "Send Message",
    responseTimeLabel: typeof contact.response_time_label === "string" ? contact.response_time_label : "Response Time",
    responseTimeText: typeof contact.response_time_text === "string" ? contact.response_time_text : "Usually within 1 business day.",
    mapEnabled: Boolean(contact.map_enabled),
    mapEmbedUrl: typeof contact.map_embed_url === "string" ? contact.map_embed_url : "",
  };
}

function getDefaultDeliverySettings(blueprint: StoreBlueprintDefinition) {
  const delivery = getBlueprintSiteSettingRecord(blueprint, "delivery_settings");
  return {
    enabled: Boolean(delivery.enabled),
    primaryZoneLabel: typeof delivery.primary_zone_label === "string" ? delivery.primary_zone_label : "Primary delivery zone",
    secondaryZoneLabel: typeof delivery.secondary_zone_label === "string" ? delivery.secondary_zone_label : "Extended delivery zone",
    deliveryFee: typeof delivery.delivery_fee === "number" ? delivery.delivery_fee : 80,
    deliveryFeeOutside: typeof delivery.delivery_fee_outside === "number" ? delivery.delivery_fee_outside : 150,
    freeThreshold: typeof delivery.free_threshold === "number" ? delivery.free_threshold : 2000,
  };
}

function getDefaultWhatsAppSupport(blueprint: StoreBlueprintDefinition) {
  const whatsapp = getBlueprintSiteSettingRecord(blueprint, "whatsapp_support");
  return {
    enabled: Boolean(whatsapp.enabled),
    number: typeof whatsapp.number === "string" ? whatsapp.number : "",
    message: typeof whatsapp.message === "string" ? whatsapp.message : "Hi! I need help with my order.",
  };
}

function getDefaultFaqEntries(blueprint: StoreBlueprintDefinition) {
  const faq = blueprint.defaultSiteSettings.faq_entries;
  if (!Array.isArray(faq)) {
    return [] as Array<{ q: string; a: string }>;
  }

  return faq
    .filter((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry))
    .map((entry) => ({
      q: typeof (entry as Record<string, unknown>).q === "string" ? (entry as Record<string, unknown>).q as string : "",
      a: typeof (entry as Record<string, unknown>).a === "string" ? (entry as Record<string, unknown>).a as string : "",
    }))
    .filter((entry) => entry.q || entry.a);
}

function getOnboardingContextCopy(
  templateId: string,
  catalogMode: DraftState["catalogMode"],
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
) {
  const { blueprint } = getTemplateSeedDefaults(templateId, blueprints);
  const templateProfile = resolveStorefrontTemplateProfile(templateId, {
    blueprintId: blueprint.id,
    productVisibility: catalogMode === "menu"
      ? "menu"
      : catalogMode === "single_product"
        ? "single_product"
        : catalogMode === "landing_only"
          ? "landing_only"
          : catalogMode === "inquiry_only"
            ? "inquiry_only"
            : null,
  });
  const templateDefinition = getStorefrontTemplateDefinition(templateProfile.templateId);
  const behavior = resolveOnboardingTemplateBehavior({
    blueprint,
    templateId: templateProfile.templateId,
  });
  const storefrontProfile = (typeof blueprint.defaultSiteSettings.storefront_profile === "object" && blueprint.defaultSiteSettings.storefront_profile)
    ? blueprint.defaultSiteSettings.storefront_profile as Record<string, unknown>
    : {};
  const orderExperience = resolveStorefrontOrderExperienceFromProfile({
    ...storefrontProfile,
    template_id: templateProfile.templateId,
    product_visibility: catalogMode === "menu"
      ? "menu"
      : catalogMode === "single_product"
        ? "single_product"
        : catalogMode === "landing_only"
          ? "landing_only"
          : catalogMode === "inquiry_only"
            ? "inquiry_only"
            : storefrontProfile.product_visibility,
  });

  return {
    templateProfile,
    templateDefinition,
    orderExperience,
    behavior,
    labels: {
      setupBadge: behavior.setupBadge,
      paymentIntro: behavior.paymentIntro,
      launchChecklist: behavior.launchChecklist,
      seedButton: behavior.seedButton,
      previewDescription: behavior.previewDescription,
      blueprintHelper: behavior.blueprintHelper,
      contentIntro: behavior.contentIntro,
      catalogIntro: behavior.catalogIntro,
      launchSuccess: orderExperience.labels.orderPlacedTitle,
    },
  };
}

const onboardingCatalogModes = [
  "single_product",
  "multi_product",
  "menu",
  "inquiry_only",
  "landing_only",
] as const;

const onboardingCatalogModeDescriptions: Record<(typeof onboardingCatalogModes)[number], string> = {
  single_product: "One flagship offer with a tighter conversion path.",
  multi_product: "A classic browse-and-buy product catalog.",
  menu: "Menu or assortment browsing with local ordering.",
  inquiry_only: "Browse-only or quote-led selling with assisted conversion.",
  landing_only: "A marketing-first launch page with direct contact or WhatsApp ordering.",
};

function getBlueprintPaymentDefaults(blueprintId: string): LaunchTemplatePaymentDefaults {
  return getBlueprintPaymentDefaultsFromCollection(blueprintId);
}

function getBlueprintPaymentDefaultsFromCollection(
  blueprintId: string,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): LaunchTemplatePaymentDefaults {
  const { seedDefinition } = getTemplateSeedDefaults(blueprintId, blueprints);
  const blueprintPaymentSettings = seedDefinition.defaultSiteSettings.payment_settings;
  if (typeof blueprintPaymentSettings === "object" && blueprintPaymentSettings) {
    const paymentSettings = blueprintPaymentSettings as Record<string, unknown>;
    return {
      cod_enabled: typeof paymentSettings.cod_enabled === "boolean"
        ? paymentSettings.cod_enabled as boolean
        : true,
      bkash_enabled: typeof paymentSettings.bkash_enabled === "boolean"
        ? paymentSettings.bkash_enabled as boolean
        : false,
      nagad_enabled: typeof paymentSettings.nagad_enabled === "boolean"
        ? paymentSettings.nagad_enabled as boolean
        : false,
      prepaid_badge_text: typeof paymentSettings.prepaid_badge_text === "string"
        ? paymentSettings.prepaid_badge_text
        : "",
      prepayment_discount_type: (paymentSettings.prepayment_discount_type as LaunchTemplatePaymentDefaults["prepayment_discount_type"] | undefined) ?? "none",
      prepayment_discount_value: typeof paymentSettings.prepayment_discount_value === "number"
        ? paymentSettings.prepayment_discount_value as number
        : 0,
    };
  }
  return {
    cod_enabled: true,
    bkash_enabled: false,
    nagad_enabled: false,
    prepaid_badge_text: "",
    prepayment_discount_type: "none",
    prepayment_discount_value: 0,
  };
}

function getDefaultBlueprintId(availableBlueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints) {
  return availableBlueprints.find((item) => item.id === "general-catalog")?.id
    ?? availableBlueprints[0]?.id
    ?? "general-catalog";
}

function getBlueprintDraftStoreName(blueprint: StoreBlueprintDefinition) {
  return `${blueprint.shortName} Store`;
}

function draftFromBlueprint(
  blueprintId: string,
  themePackages: ThemePackageDefinition[],
  previous?: Partial<DraftState>,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): DraftState {
  const { templateProfile, blueprint, seedDefinition } = getTemplateSeedDefaults(blueprintId, blueprints);
  const themePackage = resolveThemePackageById(previous?.themePackageId, themePackages, seedDefinition.defaultTheme.presetId);
  const storeName = previous?.storeName || getBlueprintDraftStoreName(blueprint);

  return {
    storeName,
    slug: previous?.slug || createStoreSlug(storeName),
    customDomain: previous?.customDomain || "",
    description: previous?.description || seedDefinition.storeDescription,
    logoUrl: previous?.logoUrl || "",
    blueprintId: templateProfile.templateId,
    businessFamily: previous?.businessFamily || templateProfile.businessFamily,
    catalogMode: previous?.catalogMode || templateProfile.catalogMode,
    themePackageId: previous?.themePackageId || themePackage.id,
    themeMode: previous?.themeMode || themePackage.mode || seedDefinition.defaultTheme.mode,
    headingFont: previous?.headingFont || themePackage.tokens.typography.headingFont || seedDefinition.defaultTheme.headingFont || "",
    bodyFont: previous?.bodyFont || themePackage.tokens.typography.bodyFont || seedDefinition.defaultTheme.bodyFont || "",
    borderRadius: previous?.borderRadius || themePackage.tokens.components.borderRadius || seedDefinition.defaultTheme.borderRadius || "0.75rem",
    customCssVars: previous?.customCssVars || {},
    heroTagline: previous?.heroTagline || seedDefinition.hero.tagline,
    heroTitle: previous?.heroTitle || seedDefinition.hero.title,
    heroHighlight: previous?.heroHighlight || seedDefinition.hero.highlight,
    heroSubtitle: previous?.heroSubtitle || seedDefinition.hero.subtitle,
    heroMediaUrl: previous?.heroMediaUrl || "",
    payment: {
      ...getBlueprintPaymentDefaults(blueprint.id),
      ...getBlueprintPaymentDefaultsFromCollection(blueprint.id, blueprints),
      bkash_number: previous?.payment?.bkash_number || "",
      nagad_number: previous?.payment?.nagad_number || "",
    },
    contactPage: {
      ...getDefaultContactPage(blueprint),
      ...previous?.contactPage,
    },
    delivery: {
      ...getDefaultDeliverySettings(blueprint),
      ...previous?.delivery,
    },
    whatsappSupport: {
      ...getDefaultWhatsAppSupport(blueprint),
      ...previous?.whatsappSupport,
    },
    faqEntries: previous?.faqEntries?.length ? previous.faqEntries : getDefaultFaqEntries(blueprint),
    isPublished: previous?.isPublished ?? false,
  };
}

function applyHeroToPages(pages: StorePage[], draft: DraftState): StorePage[] {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type !== "hero") {
        return block;
      }

      return {
        ...block,
        props: {
          ...block.props,
          tagline: draft.heroTagline,
          title: draft.heroTitle,
          highlight: draft.heroHighlight,
          subtitle: draft.heroSubtitle,
          mediaUrl: draft.heroMediaUrl,
          mediaType: draft.heroMediaUrl ? "image" : undefined,
        },
      };
    }),
  }));
}

function applyCatalogModeToPages(pages: StorePage[], draft: DraftState): StorePage[] {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type === "hero" && draft.catalogMode === "landing_only") {
        return {
          ...block,
          props: {
            ...block.props,
            ctaText: "Order via WhatsApp",
            ctaLink: "#whatsapp",
            secondaryCtaText: undefined,
            secondaryCtaLink: undefined,
          },
        };
      }

      if (block.type === "featured-products") {
        if (draft.catalogMode === "landing_only") {
          return {
            ...block,
            props: {
              ...block.props,
              title: block.props.title || "Offerings",
              tagline: block.props.tagline || "Direct Order",
            },
          };
        }

        if (draft.catalogMode === "single_product") {
          return {
            ...block,
            props: {
              ...block.props,
              limit: 1,
              title: block.props.title || "Featured Item",
              tagline: block.props.tagline || "Primary Offer",
            },
          };
        }

        if (draft.catalogMode === "inquiry_only") {
          return {
            ...block,
            props: {
              ...block.props,
              title: block.props.title || "Browse the Offerings",
              tagline: block.props.tagline || "Inquiry",
            },
          };
        }
      }

      if (block.type === "promo-banner") {
        if (draft.catalogMode === "landing_only") {
          return {
            ...block,
            props: {
              ...block.props,
              title: "Order Directly via WhatsApp",
              subtitle: "Skip traditional cart and checkout forms. Chat directly with us to place your order.",
              ctaText: "Order on WhatsApp",
              ctaLink: "#whatsapp",
            },
          };
        }

        if (draft.catalogMode === "inquiry_only") {
          return {
            ...block,
            props: {
              ...block.props,
              title: "Talk with the seller before checkout",
              subtitle: "Use WhatsApp, phone, or a contact form when pricing, availability, or fulfillment needs a conversation first.",
              ctaText: "Start a Conversation",
            },
          };
        }
      }

      return block;
    }),
  }));
}

function buildPreviewStore(
  draft: DraftState,
  activeStoreId: string,
  themePackages: ThemePackageDefinition[],
  pageBlueprints: CmsPageBlueprint[] = fallbackPageBlueprints,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): Store {
  const templateProfile = resolveStorefrontTemplateProfile(draft.blueprintId, { blueprintId: draft.blueprintId });
  const seedDefinition = templateProfile.seedDefinition;
  const themePackage = resolveThemePackageById(draft.themePackageId, themePackages, seedDefinition.defaultTheme.presetId);
  const templatePages = applyCatalogModeToPages(
    applyHeroToPages(instantiateStorePagesFromTemplate(templateProfile, pageBlueprints), draft),
    draft,
  );

  return {
    id: activeStoreId,
    name: draft.storeName,
    slug: draft.slug,
    logoUrl: draft.logoUrl || undefined,
    description: draft.description,
    currencyCode: "BDT",
    locale: "en-BD",
    isPublished: draft.isPublished,
    theme: {
      presetId: themePackage.presetId,
      themePackageId: themePackage.id,
      mode: draft.themeMode,
      aesthetic: seedDefinition.defaultTheme.aesthetic || "minimal",
      effects: seedDefinition.defaultTheme.effects || { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: draft.headingFont,
      bodyFont: draft.bodyFont,
      borderRadius: draft.borderRadius,
      customCssVars: {
        ...(themePackage.tokens[draft.themeMode] ?? {}),
        ...draft.customCssVars,
      },
      customCss: themePackage.customCss,
    },
    pages: templatePages,
  };
}

function getStoreUrl(slug: string, customDomain?: string | null) {
  return absoluteStoreUrl({ slug, customDomain }, "/");
}

function getPrimaryCatalogAction(templateId: string, catalogMode: DraftState["catalogMode"]) {
  if (templateId === "real-estate") {
    return {
      label: "Add your first listing",
      helper: "Start by creating a property listing with price, location, and listing type.",
      href: "/admin/products?action=add",
    };
  }

  if (templateId === "hotel") {
    return {
      label: "Add your first room",
      helper: "Create a room entry with pricing, occupancy, amenities, and policies.",
      href: "/admin/products?action=add",
    };
  }

  if (templateId === "service" || templateId === "booking") {
    return {
      label: "Add your first service",
      helper: "Create the first service package so the storefront has something ready to book or request.",
      href: "/admin/products?action=add",
    };
  }

  if (catalogMode === "inquiry_only") {
    return {
      label: "Add your first catalog item",
      helper: "Create the first inquiry-led item so visitors can request pricing or details.",
      href: "/admin/products?action=add",
    };
  }

  return {
    label: "Add your first product",
    helper: "Create the first product so the storefront is ready for browsing and checkout.",
    href: "/admin/products?action=add",
  };
}

function getContentSectionCards(context: ReturnType<typeof getOnboardingContextCopy>) {
  const sections: Array<{
    id: ContentSectionId;
    title: string;
    description: string;
    visible: boolean;
    icon: typeof Sparkles;
  }> = [
    {
      id: "hero",
      title: "Hero and brand message",
      description: "Headline, highlight, supporting copy, and primary media.",
      visible: true,
      icon: Sparkles,
    },
    {
      id: "delivery",
      title: context.behavior.deliverySectionTitle,
      description: context.behavior.deliverySectionDescription,
      visible: context.behavior.showDeliveryFields,
      icon: Truck,
    },
    {
      id: "lead",
      title: context.behavior.leadSectionTitle,
      description: context.behavior.leadSectionDescription,
      visible: context.behavior.showLeadContactFields,
      icon: MapPin,
    },
    {
      id: "whatsapp",
      title: context.behavior.whatsappSectionTitle,
      description: context.behavior.whatsappSectionDescription,
      visible: context.behavior.showWhatsAppFields,
      icon: MessageCircleMore,
    },
  ];

  return sections.filter((section) => section.visible);
}

function renderOnboardingSegmentCard({
  active,
  title,
  description,
  icon: Icon,
  meta,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: typeof Sparkles;
  meta?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-2 ${active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
          {meta ? <div className="mt-3">{meta}</div> : null}
        </div>
        {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
      </div>
    </button>
  );
}

export default function OnboardingWizard() {
  const { user, role, activeStoreId: contextStoreId, setActiveStoreId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedStoreId = searchParams?.get("storeId");
  const guideMode = searchParams?.get("guide") === "continue";
  const requestedStepId = searchParams?.get("step");
  const activeStoreId = requestedStoreId || contextStoreId;
  const { data: entitlements } = useStoreEntitlements(activeStoreId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(true);
  const [initialSetupCompleted, setInitialSetupCompleted] = useState(false);
  const [blueprints, setBlueprints] = useState<StoreBlueprintDefinition[]>(fallbackStoreBlueprints);
  const [themePackages, setThemePackages] = useState<ThemePackageDefinition[]>(fallbackThemePackages);
  const [pageBlueprints, setPageBlueprints] = useState<CmsPageBlueprint[]>(fallbackPageBlueprints);
  const [draft, setDraft] = useState<DraftState>(() => draftFromBlueprint(getDefaultBlueprintId(), fallbackThemePackages));
  const [contentSection, setContentSection] = useState<ContentSectionId>("hero");
  const [seedingTemplateData, setSeedingTemplateData] = useState(false);
  const [unseedingTemplateData, setUnseedingTemplateData] = useState(false);
  const [catalogSeedMetadata, setCatalogSeedMetadata] = useState<Record<string, unknown> | null>(null);
  const [completionState, setCompletionState] = useState<LaunchCompletionState | null>(null);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("all");
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>("");
  const [previewModalTemplateId, setPreviewModalTemplateId] = useState<StorefrontTemplateId | null>(null);
  const [templatePage, setTemplatePage] = useState<number>(1);
  const TEMPLATES_PER_PAGE = 6;

  const activeTemplateProfile = useMemo(
    () => resolveStorefrontTemplateProfile(draft.blueprintId, { blueprintId: draft.blueprintId }),
    [draft.blueprintId],
  );
  const onboardingContext = useMemo(
    () => getOnboardingContextCopy(draft.blueprintId, draft.catalogMode, blueprints),
    [blueprints, draft.blueprintId, draft.catalogMode],
  );
  const availableCatalogModes = useMemo(() => {
    const allowed = onboardingContext.behavior.allowedCatalogModes;
    return allowed === "all" ? onboardingCatalogModes : allowed;
  }, [onboardingContext.behavior.allowedCatalogModes]);
  const showDeliveryFields = onboardingContext.behavior.showDeliveryFields;
  const showLeadContactFields = onboardingContext.behavior.showLeadContactFields;
  const showMapFields = onboardingContext.behavior.showMapFields;
  const showWhatsAppFields = onboardingContext.behavior.showWhatsAppFields;
  const steps = activeTemplateProfile.seedDefinition.onboarding.steps;
  const requestedStepIndex = useMemo(() => {
    if (!requestedStepId) return 0;
    const index = steps.findIndex((step) => step.id === requestedStepId);
    return index >= 0 ? index : 0;
  }, [requestedStepId, steps]);
  const activeStep = steps[activeIndex] ?? steps[0];
  const previewStore = useMemo(
    () => buildPreviewStore(draft, activeStoreId ?? "preview-store", themePackages, pageBlueprints, blueprints),
    [draft, activeStoreId, blueprints, pageBlueprints, themePackages],
  );
  const contentSections = useMemo(
    () => getContentSectionCards(onboardingContext),
    [onboardingContext],
  );

  const filteredTemplateOptions = useMemo(() => {
    return storefrontTemplateOptions.filter((option) => {
      const seedDefinition = getStorefrontTemplateSeedDefinition(option.value);
      if (templateCategoryFilter !== "all") {
        if (templateCategoryFilter === "commerce" && seedDefinition.businessFamily !== "commerce") return false;
        if (templateCategoryFilter === "booking" && seedDefinition.businessFamily !== "booking" && !seedDefinition.group.includes("Hospitality")) return false;
        if (templateCategoryFilter === "service" && seedDefinition.businessFamily !== "service" && !seedDefinition.group.includes("Services")) return false;
        if (templateCategoryFilter === "listing" && seedDefinition.businessFamily !== "listing" && !seedDefinition.group.includes("Real Estate")) return false;
      }
      if (templateSearchQuery.trim()) {
        const query = templateSearchQuery.toLowerCase().trim();
        const matchesName = option.label.toLowerCase().includes(query);
        const matchesDesc = option.description.toLowerCase().includes(query);
        const matchesCatalog = seedDefinition.catalogMode.toLowerCase().includes(query);
        const matchesFamily = seedDefinition.businessFamily.toLowerCase().includes(query);
        const matchesGroup = seedDefinition.group.toLowerCase().includes(query);
        const matchesCapability = seedDefinition.capabilities.some((cap) => cap.toLowerCase().includes(query));
        return matchesName || matchesDesc || matchesCatalog || matchesFamily || matchesGroup || matchesCapability;
      }
      return true;
    });
  }, [templateCategoryFilter, templateSearchQuery]);

  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplateOptions.length / TEMPLATES_PER_PAGE));
  const paginatedTemplateOptions = useMemo(() => {
    const start = (templatePage - 1) * TEMPLATES_PER_PAGE;
    return filteredTemplateOptions.slice(start, start + TEMPLATES_PER_PAGE);
  }, [filteredTemplateOptions, templatePage]);

  const filteredTemplateGroups = useMemo(() => {
    const grouped = new Map<string, typeof storefrontTemplateOptions>();
    for (const option of filteredTemplateOptions) {
      const seedDefinition = getStorefrontTemplateSeedDefinition(option.value);
      const existing = grouped.get(seedDefinition.group) ?? [];
      existing.push(option);
      grouped.set(seedDefinition.group, existing);
    }
    return Array.from(grouped.entries());
  }, [filteredTemplateOptions]);

  const previewModalProfile = useMemo(() => {
    if (!previewModalTemplateId) return null;
    return resolveStorefrontTemplateProfile(previewModalTemplateId, { blueprintId: previewModalTemplateId });
  }, [previewModalTemplateId]);

  const previewModalDraft = useMemo(() => {
    if (!previewModalTemplateId) return null;
    return draftFromBlueprint(previewModalTemplateId, themePackages);
  }, [previewModalTemplateId, themePackages]);

  const previewModalStore = useMemo(() => {
    if (!previewModalDraft) return null;
    return buildPreviewStore(previewModalDraft, "preview-modal-store", themePackages, pageBlueprints, blueprints);
  }, [previewModalDraft, themePackages, pageBlueprints, blueprints]);

  const previewModalHomepage = useMemo(() => {
    if (!previewModalStore) return null;
    return previewModalStore.pages.find((page) => page.isHomepage) ?? previewModalStore.pages[0] ?? null;
  }, [previewModalStore]);

  const templateOptionGroups = useMemo(() => {
    const grouped = new Map<string, typeof storefrontTemplateOptions>();
    for (const option of storefrontTemplateOptions) {
      const seedDefinition = getStorefrontTemplateSeedDefinition(option.value);
      const existing = grouped.get(seedDefinition.group) ?? [];
      existing.push(option);
      grouped.set(seedDefinition.group, existing);
    }
    return Array.from(grouped.entries());
  }, []);
  const previewHomepage = previewStore.pages.find((page) => page.isHomepage) ?? previewStore.pages[0] ?? null;
  const storeUrl = getStoreUrl(draft.slug, draft.customDomain);
  const canGoNext = activeIndex < steps.length - 1;
  const canGoBack = activeIndex > 0;
  const blueprintEditingEnabled = getFeatureEnabled(entitlements?.featureMap, "cms_pages", true);
  const themePresetsEnabled = getFeatureEnabled(entitlements?.featureMap, "theme_presets", true);
  const launchAction = useMemo(
    () => getPrimaryCatalogAction(draft.blueprintId, draft.catalogMode),
    [draft.blueprintId, draft.catalogMode],
  );

  useEffect(() => {
    if (requestedStoreId && requestedStoreId !== contextStoreId) {
      setActiveStoreId(requestedStoreId);
    }
  }, [contextStoreId, requestedStoreId, setActiveStoreId]);

  useEffect(() => {
    if (!requestedStepId) return;
    if (requestedStepIndex !== activeIndex) {
      setActiveIndex(requestedStepIndex);
    }
  }, [activeIndex, requestedStepId, requestedStepIndex]);

  useEffect(() => {
    setActiveIndex(requestedStepIndex);
    setSlugAvailable(true);
    setSlugChecking(false);
    setSaving(false);
    setInitialSetupCompleted(false);
    setCompletionState(null);
    setBlueprints(fallbackStoreBlueprints);
    setThemePackages(fallbackThemePackages);
    setPageBlueprints(fallbackPageBlueprints);
    setDraft(draftFromBlueprint(getDefaultBlueprintId(), fallbackThemePackages));
    setContentSection("hero");
    setCatalogSeedMetadata(null);
    setLoading(role === "admin" && Boolean(activeStoreId));
  }, [activeStoreId, requestedStepIndex, role]);

  useEffect(() => {
    if (!pathname || !searchParams) return;
    const currentStep = steps[activeIndex];
    if (!currentStep) return;
    if (requestedStepId && activeIndex !== requestedStepIndex) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextParams.get("step") === currentStep.id) return;
    nextParams.set("step", currentStep.id);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [activeIndex, pathname, requestedStepId, requestedStepIndex, router, searchParams, steps]);

  useEffect(() => {
    if (role !== "admin") return;
    let active = true;

    const loadDraft = async () => {
      if (!activeStoreId) {
        if (active) {
          setActiveIndex(requestedStepIndex);
          setSlugAvailable(true);
          setSlugChecking(false);
          setDraft(draftFromBlueprint(getDefaultBlueprintId(), fallbackThemePackages));
          setLoading(false);
        }
        return;
      }

      if (active) {
        setLoading(true);
      }
      try {
        const [loadedBlueprints, loadedThemePackages, loadedPageBlueprints] = await Promise.all([
          loadStoreBlueprints(supabase),
          loadThemePackages(supabase, activeStoreId),
          loadPageBlueprints(supabase),
        ]);
        if (!active) return;
        setBlueprints(loadedBlueprints);
        setThemePackages(loadedThemePackages);
        setPageBlueprints(loadedPageBlueprints);

        const [{ data: storeRecord }, { data: themeRecord }, { data: onboardingSettings }, businessProfileResult] = await Promise.all([
          supabase
            .from("stores")
            .select("name, slug, custom_domain, description, logo_url, store_type, is_published")
            .eq("id", activeStoreId as string)
            .maybeSingle(),
          supabase
            .from("store_themes")
            .select("preset_id, theme_package_id, mode, typography, components, colors, custom_css, resolved_tokens")
            .eq("store_id", activeStoreId as string)
            .maybeSingle(),
          supabase.from("site_settings").select("key, value").eq("store_id", activeStoreId as string).in("key", ["payment_settings", "onboarding_status", "storefront_profile", "contact_page", "delivery_settings", "whatsapp_support", "faq_entries", "catalog_seed_metadata"]),
          supabase
            .from("store_business_profiles")
            .select("blueprint_id, blueprint_version, business_family, catalog_mode")
            .eq("store_id", activeStoreId as string)
            .maybeSingle(),
        ]);

        const store = storeRecord as {
          name?: string;
          slug?: string;
          custom_domain?: string | null;
          description?: string;
          logo_url?: string;
          store_type?: string;
          is_published?: boolean;
        } | null;
        const theme = themeRecord as {
          preset_id?: string;
          theme_package_id?: string | null;
          mode?: Store["theme"]["mode"];
          colors?: Record<string, string>;
          typography?: { headingFont?: string; bodyFont?: string };
          components?: { borderRadius?: string };
        } | null;
        const siteSettingsRows = Array.isArray(onboardingSettings) ? onboardingSettings as Array<{ key?: string; value?: unknown }> : [];
        const payment = ((siteSettingsRows.find((entry) => entry.key === "payment_settings")?.value ?? {}) as Partial<DraftState["payment"]>);
        const storefrontProfileSetting = (siteSettingsRows.find((entry) => entry.key === "storefront_profile")?.value ?? {}) as Record<string, unknown>;
        const contactPageSetting = ((siteSettingsRows.find((entry) => entry.key === "contact_page")?.value ?? {}) as Partial<DraftState["contactPage"]>);
        const deliverySetting = ((siteSettingsRows.find((entry) => entry.key === "delivery_settings")?.value ?? {}) as Record<string, unknown>);
        const whatsappSupportSetting = ((siteSettingsRows.find((entry) => entry.key === "whatsapp_support")?.value ?? {}) as Partial<DraftState["whatsappSupport"]>);
        const faqEntriesSetting = (siteSettingsRows.find((entry) => entry.key === "faq_entries")?.value ?? []) as unknown;
        const catalogSeedMetadataSetting = siteSettingsRows.find((entry) => entry.key === "catalog_seed_metadata")?.value ?? null;
        const onboardingStatus = (siteSettingsRows.find((entry) => entry.key === "onboarding_status")?.value ?? {}) as {
          completed?: boolean;
          completed_at?: string | null;
        };
        const businessProfile = businessProfileResult?.data as {
          blueprint_id?: string;
          blueprint_version?: number | null;
          business_family?: DraftState["businessFamily"];
          catalog_mode?: DraftState["catalogMode"];
        } | null;
        const templateProfile = resolveStorefrontTemplateProfile(
          storefrontProfileSetting?.template_id,
          {
            blueprintId: typeof businessProfile?.blueprint_id === "string"
              ? businessProfile.blueprint_id
              : typeof storefrontProfileSetting?.blueprint_id === "string"
                ? storefrontProfileSetting.blueprint_id
                : store?.store_type ?? getDefaultBlueprintId(loadedBlueprints),
            productVisibility: typeof storefrontProfileSetting?.product_visibility === "string"
              ? storefrontProfileSetting.product_visibility
              : null,
          },
        );
        const { blueprint: safeBlueprint, seedDefinition: safeSeedDefinition } = getTemplateSeedDefaults(
          templateProfile.templateId,
          loadedBlueprints,
        );
        const hasCompletedInitialSetup = Boolean(
          store?.is_published
          || onboardingStatus?.completed
          || onboardingStatus?.completed_at,
        );

        if (!active) return;
        setInitialSetupCompleted(hasCompletedInitialSetup);
        setCatalogSeedMetadata(isTemplateSeedMetadata(catalogSeedMetadataSetting) ? catalogSeedMetadataSetting as Record<string, unknown> : null);
        setDraft(draftFromBlueprint(templateProfile.templateId, loadedThemePackages, {
          storeName: store?.name || getBlueprintDraftStoreName(safeBlueprint),
          slug: store?.slug || createStoreSlug(store?.name || getBlueprintDraftStoreName(safeBlueprint)),
          customDomain: store?.custom_domain || "",
          description: store?.description || undefined,
          logoUrl: store?.logo_url || "",
          businessFamily: businessProfile?.business_family || safeSeedDefinition.businessFamily,
          catalogMode: businessProfile?.catalog_mode || safeSeedDefinition.catalogMode,
          themePackageId: theme?.theme_package_id || theme?.preset_id || safeSeedDefinition.defaultTheme.presetId,
          themeMode: theme?.mode || undefined,
          headingFont: theme?.typography?.headingFont || undefined,
          bodyFont: theme?.typography?.bodyFont || undefined,
          borderRadius: theme?.components?.borderRadius || undefined,
          customCssVars: theme?.colors || {},
          payment: {
            ...getBlueprintPaymentDefaultsFromCollection(safeBlueprint.id, loadedBlueprints),
            ...payment,
            bkash_number: payment.bkash_number || "",
            nagad_number: payment.nagad_number || "",
          },
          contactPage: {
            ...getDefaultContactPage(safeBlueprint),
            ...contactPageSetting,
          },
          delivery: {
            ...getDefaultDeliverySettings(safeBlueprint),
            enabled: Boolean(deliverySetting.enabled),
            primaryZoneLabel: typeof deliverySetting.primary_zone_label === "string" ? deliverySetting.primary_zone_label : getDefaultDeliverySettings(safeBlueprint).primaryZoneLabel,
            secondaryZoneLabel: typeof deliverySetting.secondary_zone_label === "string" ? deliverySetting.secondary_zone_label : getDefaultDeliverySettings(safeBlueprint).secondaryZoneLabel,
            deliveryFee: typeof deliverySetting.delivery_fee === "number" ? deliverySetting.delivery_fee : getDefaultDeliverySettings(safeBlueprint).deliveryFee,
            deliveryFeeOutside: typeof deliverySetting.delivery_fee_outside === "number" ? deliverySetting.delivery_fee_outside : getDefaultDeliverySettings(safeBlueprint).deliveryFeeOutside,
            freeThreshold: typeof deliverySetting.free_threshold === "number" ? deliverySetting.free_threshold : getDefaultDeliverySettings(safeBlueprint).freeThreshold,
          },
          whatsappSupport: {
            ...getDefaultWhatsAppSupport(safeBlueprint),
            ...whatsappSupportSetting,
          },
          faqEntries: Array.isArray(faqEntriesSetting)
            ? faqEntriesSetting
                .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
                .map((entry) => ({
                  q: typeof entry.q === "string" ? entry.q : "",
                  a: typeof entry.a === "string" ? entry.a : "",
                }))
            : getDefaultFaqEntries(safeBlueprint),
          isPublished: store?.is_published ?? false,
        }, loadedBlueprints));
        setActiveIndex(requestedStepIndex);
        setContentSection("hero");
      } catch (error) {
        if (active) {
          console.error("Failed to load onboarding draft:", error);
          toast.error("Failed to refresh onboarding data. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDraft();
    return () => {
      active = false;
    };
  }, [activeStoreId, requestedStepIndex, role]);

  useEffect(() => {
    setSaving(false);
  }, [activeStoreId]);

  useEffect(() => {
    if (initialSetupCompleted) {
      setSlugChecking(false);
      setSlugAvailable(true);
      return;
    }

    const checkSlug = async () => {
      if (!draft.slug.trim()) {
        setSlugAvailable(false);
        return;
      }

      setSlugChecking(true);
      const { data } = await (supabase as any)
        .from("stores")
        .select("id, slug")
        .eq("slug", draft.slug)
        .neq("id", activeStoreId)
        .maybeSingle();
      setSlugAvailable(!data);
      setSlugChecking(false);
    };

    const timer = window.setTimeout(() => void checkSlug(), 300);
    return () => window.clearTimeout(timer);
  }, [activeStoreId, draft.slug, initialSetupCompleted]);

  if (role !== "admin") {
    return null;
  }

  const updateDraft = (patch: Partial<DraftState>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updatePayment = (patch: Partial<DraftState["payment"]>) => {
    setDraft((current) => ({
      ...current,
      payment: {
        ...current.payment,
        ...patch,
      },
    }));
  };

  const updateContactPage = (patch: Partial<DraftState["contactPage"]>) => {
    setDraft((current) => ({
      ...current,
      contactPage: {
        ...current.contactPage,
        ...patch,
      },
    }));
  };

  const updateDelivery = (patch: Partial<DraftState["delivery"]>) => {
    setDraft((current) => ({
      ...current,
      delivery: {
        ...current.delivery,
        ...patch,
      },
    }));
  };

  const updateWhatsAppSupport = (patch: Partial<DraftState["whatsappSupport"]>) => {
    setDraft((current) => ({
      ...current,
      whatsappSupport: {
        ...current.whatsappSupport,
        ...patch,
      },
    }));
  };

  const seedTemplateDemoData = async () => {
    if (!activeStoreId) {
      toast.error("Open the merchant store first, then retry.");
      return;
    }

    setSeedingTemplateData(true);
    try {
      const currentSeedMetadata = isTemplateSeedMetadata(catalogSeedMetadata)
        ? catalogSeedMetadata
        : null;
      const catalogSeed = await reseedTemplateCatalog(
        supabase as any,
        activeStoreId,
        draft.blueprintId,
        currentSeedMetadata,
      );

      const seededSiteSettings = catalogSeed.siteSettings as {
        categories_custom_data?: Json;
        seed_testimonials?: Json;
        services_seed?: Json;
      };

      const nextSeedSettings = {
        catalog_seed_metadata: catalogSeed.metadata as Json,
        categories_custom_data: seededSiteSettings.categories_custom_data ?? ([] as Json),
        seed_testimonials: seededSiteSettings.seed_testimonials ?? ([] as Json),
        services_seed: seededSiteSettings.services_seed ?? ([] as Json),
      };

      const { error } = await saveStoreScopedSiteSettings(
        supabase,
        activeStoreId,
        Object.entries(nextSeedSettings).map(([key, value]) => ({
          key,
          value,
        })),
      );

      if (error) {
        throw error;
      }

      setCatalogSeedMetadata(catalogSeed.metadata as unknown as Record<string, unknown>);
      toast.success(`${activeTemplateProfile.seedDefinition.name} demo data seeded for this store.`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to seed template demo data.");
    } finally {
      setSeedingTemplateData(false);
    }
  };

  const unseedTemplateDemoData = async () => {
    if (!activeStoreId) {
      toast.error("Open the merchant store first, then retry.");
      return;
    }

    setUnseedingTemplateData(true);
    try {
      await unseedTemplateCatalog(
        supabase as any,
        activeStoreId,
        isTemplateSeedMetadata(catalogSeedMetadata) ? catalogSeedMetadata : null,
      );

      const clearedSeedSettings = {
        catalog_seed_metadata: {} as Json,
        categories_custom_data: [] as Json,
        seed_testimonials: [] as Json,
        services_seed: [] as Json,
      };

      const { error } = await saveStoreScopedSiteSettings(
        supabase,
        activeStoreId,
        Object.entries(clearedSeedSettings).map(([key, value]) => ({
          key,
          value,
        })),
      );

      if (error) {
        throw error;
      }

      setCatalogSeedMetadata(null);
      toast.success("Seeded demo catalog removed from this store.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to unseed template demo data.");
    } finally {
      setUnseedingTemplateData(false);
    }
  };

  const applyBlueprint = (blueprintId: string) => {
    setDraft((current) =>
      draftFromBlueprint(blueprintId, themePackages, {
        storeName: current.storeName,
        slug: current.slug,
        customDomain: current.customDomain,
        description: current.description,
        logoUrl: current.logoUrl,
        themePackageId: current.themePackageId,
        themeMode: current.themeMode,
        headingFont: current.headingFont,
        bodyFont: current.bodyFont,
        borderRadius: current.borderRadius,
        customCssVars: current.customCssVars,
        payment: {
          ...getBlueprintPaymentDefaultsFromCollection(blueprintId, blueprints),
          bkash_number: current.payment.bkash_number,
          nagad_number: current.payment.nagad_number,
        },
        contactPage: current.contactPage,
        delivery: current.delivery,
        whatsappSupport: current.whatsappSupport,
        faqEntries: current.faqEntries,
        isPublished: current.isPublished,
      }, blueprints),
    );
    setCatalogSeedMetadata(null);
    setContentSection("hero");
  };

  const saveAndLaunch = async (publish: boolean) => {
    if (!user) {
      toast.error("Sign in as admin before launching.");
      return;
    }

    if (!activeStoreId) {
      toast.error("No store context found. Please start from the signup page.");
      return;
    }

    if (!slugAvailable) {
      toast.error("Choose an available store slug first.");
      setActiveIndex(0);
      return;
    }

    setSaving(true);
    try {
      if (publish) {
        const { data: subscription } = await supabase
          .from("store_subscriptions")
          .select("status, trial_ends_at")
          .eq("store_id", activeStoreId)
          .maybeSingle();
        const effectiveStatus = getEffectiveSubscriptionStatus(subscription as { status?: string | null; trial_ends_at?: string | null } | null);
        if (effectiveStatus === "past_due" || effectiveStatus === "cancelled") {
          toast.error("Your trial has ended for this store. Complete billing before publishing it live again.");
          return;
        }
      }

      const { blueprint: selectedBlueprint, seedDefinition } = getTemplateSeedDefaults(draft.blueprintId, blueprints);
      const templateProfile = resolveStorefrontTemplateProfile(draft.blueprintId, {
        blueprintId: selectedBlueprint.id,
        productVisibility: typeof (seedDefinition.defaultSiteSettings.storefront_profile as Record<string, unknown> | undefined)?.product_visibility === "string"
          ? (seedDefinition.defaultSiteSettings.storefront_profile as Record<string, string>).product_visibility
          : null,
      });
      const selectedThemePackage = resolveThemePackageById(draft.themePackageId, themePackages, seedDefinition.defaultTheme.presetId);
      const pages = buildPreviewStore(
        { ...draft, isPublished: publish },
        activeStoreId,
        themePackages,
        pageBlueprints,
        blueprints,
      ).pages;

      const { error: storeError } = await supabase.from("stores").update(
        {
          name: draft.storeName.trim() || getBlueprintDraftStoreName(selectedBlueprint),
          slug: draft.slug.trim() || createStoreSlug(draft.storeName.trim() || getBlueprintDraftStoreName(selectedBlueprint)),
          description: draft.description.trim() || seedDefinition.storeDescription,
          store_type: templateProfile.seedBlueprintId,
          logo_url: draft.logoUrl.trim() || null,
          currency_code: "BDT",
          locale: "en-BD",
          is_published: publish,
        },
      ).eq("id", activeStoreId);

      if (storeError) {
        toast.error(`Failed to save store setup: ${storeError.message || storeError.details || storeError.hint || JSON.stringify(storeError)}`);
        return;
      }

      const persistResult = await persistStorefrontState({
        client: supabase,
        store: {
          id: activeStoreId,
          name: draft.storeName.trim() || getBlueprintDraftStoreName(selectedBlueprint),
          slug: draft.slug.trim() || createStoreSlug(draft.storeName.trim() || getBlueprintDraftStoreName(selectedBlueprint)),
          logoUrl: draft.logoUrl.trim() || undefined,
          customDomain: draft.customDomain?.trim() || undefined,
          description: draft.description.trim() || seedDefinition.storeDescription,
          currencyCode: "BDT",
          locale: "en-BD",
          isPublished: publish,
          theme: {
            presetId: selectedThemePackage.presetId,
            themePackageId: selectedThemePackage.id,
            mode: draft.themeMode,
            aesthetic: seedDefinition.defaultTheme.aesthetic || "minimal",
            effects: seedDefinition.defaultTheme.effects || { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
            headingFont: draft.headingFont,
            bodyFont: draft.bodyFont,
            borderRadius: draft.borderRadius,
            customCssVars: draft.customCssVars,
            customCss: selectedThemePackage.customCss ?? undefined,
          },
          pages,
        },
        blueprint: selectedBlueprint,
        ownerId: user.id,
        themePackages,
      });

      if (persistResult.error) {
        toast.error(`Failed to save storefront setup: ${persistResult.error.message || "Unknown persistence error"}`);
        return;
      }

      const siteSettingsRows = buildStorefrontTemplateSiteSettingsEntries(templateProfile.seedDefinition, {
        payment_settings: draft.payment as unknown as Json,
        contact_page: {
          badge: draft.contactPage.badge,
          title: draft.contactPage.title,
          description: draft.contactPage.description,
          address: draft.contactPage.address,
          phone: draft.contactPage.phone,
          email: draft.contactPage.email,
          whatsapp: draft.whatsappSupport.number || draft.contactPage.whatsapp,
          form_button_label: draft.contactPage.formButtonLabel,
          response_time_label: draft.contactPage.responseTimeLabel,
          response_time_text: draft.contactPage.responseTimeText,
          map_enabled: draft.contactPage.mapEnabled,
          map_embed_url: draft.contactPage.mapEmbedUrl,
        } as Json,
        delivery_settings: {
          enabled: draft.delivery.enabled,
          primary_zone_label: draft.delivery.primaryZoneLabel,
          secondary_zone_label: draft.delivery.secondaryZoneLabel,
          delivery_fee: draft.delivery.deliveryFee,
          delivery_fee_outside: draft.delivery.deliveryFeeOutside,
          free_threshold: draft.delivery.freeThreshold,
        } as Json,
        whatsapp_support: {
          enabled: draft.whatsappSupport.enabled,
          number: draft.whatsappSupport.number,
          message: draft.whatsappSupport.message,
        } as Json,
        faq_entries: draft.faqEntries as unknown as Json,
        onboarding_status: {
          completed: true,
          completed_at: new Date().toISOString(),
          completed_via: publish ? "publish" : "draft_save",
        } as Json,
      }).map((entry) => ({
        store_id: activeStoreId,
        key: entry.key,
        value: entry.value,
      }));

      const { error: siteSettingsError } = await saveStoreScopedSiteSettings(
        supabase,
        activeStoreId,
        siteSettingsRows.map((entry) => ({
          key: entry.key,
          value: entry.value as Json,
        })),
      );

      if (siteSettingsError) {
        toast.error("Failed to save blueprint defaults.");
        return;
      }

      await supabase
        .from("store_business_profiles")
        .upsert(
          {
            store_id: activeStoreId,
            blueprint_id: templateProfile.seedBlueprintId,
            blueprint_version: 1,
            business_family: templateProfile.businessFamily,
            catalog_mode: templateProfile.catalogMode,
            enabled_modules: templateProfile.seedDefinition.capabilities,
          },
          { onConflict: "store_id" },
        );

      setDraft((current) => ({ ...current, isPublished: publish }));
      setCompletionState({
        published: publish,
        templateId: draft.blueprintId,
      });
      toast.success(publish ? "Store is live." : "Store setup saved.");
    } finally {
      setSaving(false);
    }
  };

  const copyStoreUrl = async () => {
    await navigator.clipboard.writeText(storeUrl);
    toast.success("Store URL copied.");
  };

  if (completionState && activeStoreId) {
    const dashboardHref = `/admin?storeId=${encodeURIComponent(activeStoreId)}`;
    const onboardingGuideHref = `/admin/onboarding?storeId=${encodeURIComponent(activeStoreId)}&guide=continue`;
    const pageBuilderHref = buildPageBuilderPath("basic", { storeId: activeStoreId });
    const launchReadinessHref = `/admin/launch?storeId=${encodeURIComponent(activeStoreId)}`;
    const firstCatalogHref = `${launchAction.href}${launchAction.href.includes("?") ? "&" : "?"}storeId=${encodeURIComponent(activeStoreId)}`;
    const completionChecklist = [
      {
        label: completionState.published ? "Storefront is published" : "Storefront draft is saved",
        done: true,
        hint: completionState.published ? "The saved storefront is now reachable through the current launch URL." : "You can keep refining this draft before going live.",
      },
      {
        label: "Storefront URL is locked in",
        done: Boolean(storeUrl),
        hint: "Keep this URL stable so previews, links, and future traffic stay consistent.",
      },
      {
        label: "Ordering path is visible",
        done: Boolean(draft.payment.cod_enabled || draft.payment.bkash_enabled || draft.payment.nagad_enabled || draft.whatsappSupport.enabled || draft.contactPage.phone || draft.contactPage.email),
        hint: "Buyers should always have a clear path to order, pay, or contact the merchant.",
      },
      {
        label: "Setup can hand off to real catalog work",
        done: Boolean(draft.storeName.trim() && draft.heroTitle.trim()),
        hint: "The next best move is to replace setup placeholders with real products, services, or offers.",
      },
    ];

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-border">
          <CardHeader className="space-y-3">
            <Badge variant="secondary" className="w-fit gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Launch successful
            </Badge>
            <CardTitle className="text-2xl">
              {completionState.published ? "Your storefront is live." : "Your storefront draft is ready."}
            </CardTitle>
            <CardDescription className="max-w-2xl">
              The template, theme, storefront settings, and store-local onboarding data are saved. The next best step is to add the first real catalog item for this storefront type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <MerchantPreviewChecklist items={completionChecklist} />
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-sm font-medium text-foreground">Storefront URL</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input readOnly value={storeUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={copyStoreUrl} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">{launchAction.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{launchAction.helper}</p>
                <Button type="button" asChild className="mt-4 gap-2">
                  <a href={firstCatalogHref}>
                    <Package className="h-4 w-4" />
                    {launchAction.label}
                  </a>
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Next tools</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button type="button" asChild variant="outline" className="justify-start gap-2">
                    <a href={dashboardHref}>
                      <ArrowLeft className="h-4 w-4" />
                      Go to Dashboard
                    </a>
                  </Button>
                  <Button type="button" asChild variant="outline" className="justify-start gap-2">
                    <a href={launchReadinessHref}>
                      <Rocket className="h-4 w-4" />
                      Open Launch Readiness
                    </a>
                  </Button>
                  <Button type="button" asChild variant="outline" className="justify-start gap-2">
                    <a href={pageBuilderHref}>
                      <Sparkles className="h-4 w-4" />
                      Open Store Editor
                    </a>
                  </Button>
                  <Button type="button" asChild variant="outline" className="justify-start gap-2">
                    <a href={onboardingGuideHref}>
                      <Save className="h-4 w-4" />
                      Reopen Guided Setup
                    </a>
                  </Button>
                  <Button type="button" asChild variant="outline" className="justify-start gap-2">
                    <a href={storeUrl} target="_blank" rel="noreferrer">
                      <Eye className="h-4 w-4" />
                      View Store
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (initialSetupCompleted && !guideMode && activeStoreId) {
    const siteSettingsHref = `/admin/site-settings?storeId=${encodeURIComponent(activeStoreId)}`;
    const pageBuilderHref = buildPageBuilderPath("basic", { storeId: activeStoreId });
    const dashboardHref = `/admin?storeId=${encodeURIComponent(activeStoreId)}`;
    const onboardingGuideHref = `/admin/onboarding?storeId=${encodeURIComponent(activeStoreId)}&guide=continue`;
    const firstCatalogHref = `${launchAction.href}${launchAction.href.includes("?") ? "&" : "?"}storeId=${encodeURIComponent(activeStoreId)}`;

    return (
      <div className="mx-auto max-w-3xl">
        <Card className="border-border">
          <CardHeader className="space-y-3">
            <Badge variant="secondary" className="w-fit gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Setup locked
            </Badge>
            <CardTitle className="text-2xl">This store has already completed first-time setup</CardTitle>
            <CardDescription className="max-w-2xl">
              The storefront URL and initial launch wiring are locked after the first setup so live routing stays stable. You can still use onboarding as a guided checklist, then move into the editor and settings screens for deeper changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-sm font-medium text-foreground">Current storefront URL</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input readOnly value={storeUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={copyStoreUrl} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild className="gap-2">
                <a href={dashboardHref}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href={firstCatalogHref}>
                  <Package className="h-4 w-4" />
                  {launchAction.label}
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href={onboardingGuideHref}>
                  <Sparkles className="h-4 w-4" />
                  Continue Guided Setup
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href={siteSettingsHref}>
                  <Save className="h-4 w-4" />
                  Open Site Settings
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href={pageBuilderHref}>
                  <Package className="h-4 w-4" />
                  Edit Storefront
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href={storeUrl} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4" />
                  View Store
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !activeStoreId) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {onboardingContext.labels.setupBadge}
          </Badge>
          <h1 className="font-heading text-3xl font-bold text-foreground">Launch your store</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A template-first setup flow that keeps the commerce engine intact while making each storefront flexible, tenant-scoped, and easier to launch with the shared template system.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              data-testid={`onboarding-step-${step.id}`}
              onClick={() => setActiveIndex(index)}
              aria-current={activeIndex === index ? "step" : undefined}
              className={`rounded-lg border p-3 text-left transition-colors ${
                activeIndex === index
                  ? "border-primary bg-primary/10 text-primary"
                  : index < activeIndex
                    ? "border-primary/30 bg-card text-foreground"
                    : "border-border bg-card text-muted-foreground"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">
                  {index < activeIndex ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="text-xs font-semibold">{step.title}</span>
              </div>
              <p className="hidden text-[11px] leading-4 sm:block">{step.description}</p>
            </button>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>{activeStep.title}</CardTitle>
            <CardDescription>{activeStep.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeStep.id === "blueprint" ? (
              <div className="grid gap-6">
                {!blueprintEditingEnabled ? (
                  <div className="rounded-lg border border-dashed border-border bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 shrink-0" />
                    <span>
                      Template switching is disabled for this store package right now. The current storefront still works, but changing template-driven page defaults is locked.
                    </span>
                  </div>
                ) : null}

                {/* Active Template Header Banner */}
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 text-xs">
                        Active: {activeTemplateProfile.seedDefinition.name}
                      </Badge>
                      <Badge variant="outline" className="capitalize bg-background/80 text-xs">
                        {activeTemplateProfile.catalogMode.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {activeTemplateProfile.businessFamily}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {activeTemplateProfile.seedDefinition.name} Template
                    </h3>
                  </div>

                  {/* Seed / Unseed Demo Data Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void seedTemplateDemoData()}
                      disabled={!activeStoreId || seedingTemplateData}
                      className="gap-1.5 font-medium text-xs h-9"
                    >
                      {seedingTemplateData ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Package className="h-3.5 w-3.5" />
                      )}
                      {catalogSeedMetadata ? "Reseed Demo Data" : "Seed Demo Data"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void unseedTemplateDemoData()}
                      disabled={!activeStoreId || unseedingTemplateData || !catalogSeedMetadata}
                      className="gap-1.5 font-medium text-xs h-9"
                    >
                      {unseedingTemplateData ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      Unseed Demo Catalog
                    </Button>
                  </div>
                </div>

                {/* Filter & Search Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t pt-5">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <LayoutTemplate className="h-5 w-5 text-primary" /> Store Templates
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Browse {storefrontTemplateOptions.length} specialized store templates designed for high merchant conversion.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 text-xs">
                      {[
                        { id: "all", label: "All Templates" },
                        { id: "commerce", label: "Retail & Shop" },
                        { id: "service", label: "Services" },
                        { id: "booking", label: "Booking" },
                        { id: "listing", label: "Real Estate" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setTemplateCategoryFilter(cat.id);
                            setTemplatePage(1);
                          }}
                          className={cn(
                            "rounded-lg px-3 py-1.5 font-medium transition-all",
                            templateCategoryFilter === cat.id
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search templates..."
                        value={templateSearchQuery}
                        onChange={(e) => {
                          setTemplateSearchQuery(e.target.value);
                          setTemplatePage(1);
                        }}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Template Cards Grid (Rows and Columns like Products) */}
                {filteredTemplateOptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-12 text-center">
                    <LayoutTemplate className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h4 className="font-semibold text-foreground">No templates match your search</h4>
                    <p className="text-xs text-muted-foreground mt-1">Try clearing your search or category filter.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setTemplateCategoryFilter("all");
                        setTemplateSearchQuery("");
                        setTemplatePage(1);
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {paginatedTemplateOptions.map((item) => {
                        const seedDefinition = getStorefrontTemplateSeedDefinition(item.value);
                        const referenceImage = getStorefrontTemplateReferenceImage(item.value);
                        const isCurrentActive = draft.blueprintId === item.value;

                        return (
                          <div
                            key={item.value}
                            className={cn(
                              "group relative h-[420px] w-full rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/60",
                              isCurrentActive
                                ? "ring-2 ring-primary border-primary shadow-lg"
                                : "border-border/80 shadow-sm"
                            )}
                          >
                            {/* Long Rectangle Site Preview Background */}
                            <div className="absolute inset-0 h-full w-full bg-muted">
                              {referenceImage ? (
                                <img
                                  src={referenceImage}
                                  alt={`${item.label} site preview`}
                                  className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center bg-muted/40 p-4 text-center">
                                  <LayoutTemplate className="h-10 w-10 text-muted-foreground/30 mb-2" />
                                  <p className="text-xs text-muted-foreground">Preview coming soon</p>
                                </div>
                              )}
                            </div>

                            {/* Top Selected Badge */}
                            {isCurrentActive && (
                              <div className="absolute top-3 right-3 z-20">
                                <Badge className="bg-emerald-600 text-white font-semibold text-xs gap-1 shadow-md border-0 px-3 py-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                                </Badge>
                              </div>
                            )}

                            {/* White Gradient Overlay from Middle to Bottom */}
                            <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-white via-white/95 via-40% to-transparent dark:from-slate-950 dark:via-slate-950/95 p-5 flex flex-col justify-end space-y-2.5 z-10">
                              {/* Category & Mode Badges */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold uppercase tracking-wider">
                                  {seedDefinition.businessFamily}
                                </Badge>
                                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-foreground text-[10px] font-medium capitalize">
                                  {seedDefinition.catalogMode.replace(/_/g, " ")}
                                </Badge>
                              </div>

                              {/* Template Name */}
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                                  {item.label}
                                </h4>
                                {isCurrentActive ? (
                                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                                ) : null}
                              </div>

                              {/* Small Details / Description */}
                              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>

                              {/* Feature Tags */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                {seedDefinition.capabilities.slice(0, 3).map((capability) => (
                                  <span
                                    key={capability}
                                    className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                                  >
                                    {capability.replace(/_/g, " ")}
                                  </span>
                                ))}
                                {seedDefinition.capabilities.length > 3 && (
                                  <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                                    +{seedDefinition.capabilities.length - 3}
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-2 flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant={isCurrentActive ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "flex-1 h-9 font-semibold text-xs transition-all rounded-xl",
                                    isCurrentActive
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-0"
                                      : "bg-white/90 dark:bg-slate-900/90 hover:bg-primary hover:text-primary-foreground border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (blueprintEditingEnabled) applyBlueprint(item.value);
                                  }}
                                  disabled={!blueprintEditingEnabled}
                                >
                                  {isCurrentActive ? (
                                    <>
                                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Active Template
                                    </>
                                  ) : (
                                    "Select Template"
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-9 w-9 p-0 text-xs rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewModalTemplateId(item.value);
                                  }}
                                  title="Preview Template"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {filteredTemplateOptions.length > TEMPLATES_PER_PAGE && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-5 mt-4">
                        <p className="text-xs text-muted-foreground">
                          Showing <span className="font-semibold text-foreground">{(templatePage - 1) * TEMPLATES_PER_PAGE + 1}</span>–<span className="font-semibold text-foreground">{Math.min(templatePage * TEMPLATES_PER_PAGE, filteredTemplateOptions.length)}</span> of <span className="font-semibold text-foreground">{filteredTemplateOptions.length}</span> templates
                        </p>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={templatePage <= 1}
                            onClick={() => setTemplatePage((p) => Math.max(1, p - 1))}
                            className="h-8 gap-1 text-xs rounded-lg"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" /> Previous
                          </Button>

                          <div className="flex items-center gap-1 px-3 text-xs font-semibold text-foreground">
                            Page {templatePage} of {totalTemplatePages}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={templatePage >= totalTemplatePages}
                            onClick={() => setTemplatePage((p) => Math.min(totalTemplatePages, p + 1))}
                            className="h-8 gap-1 text-xs rounded-lg"
                          >
                            Next <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Interactive Live Blueprint Preview Modal */}
                <Dialog
                  open={!!previewModalTemplateId}
                  onOpenChange={(open) => {
                    if (!open) setPreviewModalTemplateId(null);
                  }}
                >
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className="bg-primary text-primary-foreground capitalize">
                          {previewModalProfile?.businessFamily}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {previewModalProfile?.catalogMode.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <DialogTitle className="text-2xl font-bold">
                        {previewModalProfile?.seedDefinition.name} Blueprint
                      </DialogTitle>
                      <DialogDescription>
                        {previewModalProfile?.seedDefinition.description}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
                      {/* Left: Template Specs */}
                      <div className="space-y-4 rounded-xl border p-4 bg-card">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Store Overview</h4>
                          <p className="text-sm mt-1 text-foreground leading-relaxed">
                            {previewModalProfile?.seedDefinition.storeDescription}
                          </p>
                        </div>

                        <div className="space-y-1.5 border-t pt-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hero Headline</h4>
                          <p className="text-sm font-semibold text-foreground">
                            {previewModalProfile?.seedDefinition.hero.title}{" "}
                            <span className="text-primary">{previewModalProfile?.seedDefinition.hero.highlight}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {previewModalProfile?.seedDefinition.hero.subtitle}
                          </p>
                        </div>

                        <div className="space-y-2 border-t pt-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Built-in Capabilities</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {previewModalProfile?.seedDefinition.capabilities.map((cap) => (
                              <Badge key={cap} variant="secondary" className="text-xs capitalize">
                                {cap.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 border-t pt-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recommended Pages</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {previewModalProfile?.seedDefinition.recommendedPageSet.map((pg) => (
                              <Badge key={pg} variant="outline" className="text-xs">
                                {pg}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Interactive Storefront Frame */}
                      <div className="rounded-xl border p-4 bg-muted/20">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5 text-primary" /> Blueprint Mobile Layout
                          </p>
                        </div>
                        <StorefrontPreviewFrame viewport="mobile" title={`${previewModalProfile?.seedDefinition.name} preview`}>
                          {previewModalHomepage && previewModalStore ? (
                            <StorefrontTemplateRenderer
                              store={previewModalStore}
                              page={previewModalHomepage}
                              blocks={[...previewModalHomepage.blocks].sort((a, b) => a.sortOrder - b.sortOrder)}
                              adminMode={false}
                              selectedBlockId={null}
                              canManageStorefront={false}
                              onSelectBlock={() => {}}
                            />
                          ) : null}
                        </StorefrontPreviewFrame>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
                      <Button type="button" variant="outline" onClick={() => setPreviewModalTemplateId(null)}>
                        Close Preview
                      </Button>
                      <Button
                        type="button"
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={() => {
                          if (previewModalTemplateId && blueprintEditingEnabled) {
                            applyBlueprint(previewModalTemplateId);
                            setPreviewModalTemplateId(null);
                            toast.success(`Applied ${previewModalProfile?.seedDefinition.name} blueprint`);
                          }
                        }}
                        disabled={!blueprintEditingEnabled}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Apply Blueprint
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : null}

            {activeStep.id === "brand" ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Store Name</Label>
                  <Input
                    data-testid="onboarding-store-name"
                    value={draft.storeName}
                    onChange={(event) => {
                      const storeName = event.target.value;
                      updateDraft({ storeName, slug: createStoreSlug(storeName) });
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Store Slug</Label>
                  <Input
                    data-testid="onboarding-store-slug"
                    value={draft.slug}
                    onChange={(event) => updateDraft({ slug: createStoreSlug(event.target.value) })}
                    disabled={initialSetupCompleted}
                  />
                  <p className={`text-xs ${initialSetupCompleted || slugAvailable ? "text-muted-foreground" : "text-destructive"}`}>
                    {initialSetupCompleted
                      ? "Store URL is locked after first-time setup."
                      : slugChecking ? "Checking availability..." : slugAvailable ? "Slug is available." : "Slug is already used."}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea rows={4} value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Logo URL</Label>
                  <CloudinaryUpload
                    value={draft.logoUrl}
                    onChange={(url) => updateDraft({ logoUrl: url })}
                    folder="logos"
                    label="Upload logo"
                    showPreview
                    resourceType="image"
                    storeId={activeStoreId ?? undefined}
                  />
                </div>
              </div>
            ) : null}

            {activeStep.id === "content" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  {onboardingContext.labels.contentIntro}
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Hero and first impression</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Set the main headline, supporting copy, and primary visual merchants want customers to see first.
                    </p>
                  </div>
                  {showDeliveryFields ? (
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-sm font-semibold text-foreground">Delivery and fulfillment</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Control zones, fees, and free-delivery thresholds when the template depends on local delivery confidence.
                      </p>
                    </div>
                  ) : null}
                  {showLeadContactFields ? (
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-sm font-semibold text-foreground">Contact and lead capture</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Publish the right contact details, response promise, and map or visit information for this business type.
                      </p>
                    </div>
                  ) : null}
                  {showWhatsAppFields ? (
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-sm font-semibold text-foreground">WhatsApp and direct support</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Add a direct chat shortcut for faster questions, orders, or appointment-style conversations.
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {contentSections.map((section) =>
                    renderOnboardingSegmentCard({
                      active: contentSection === section.id,
                      title: section.title,
                      description: section.description,
                      icon: section.icon,
                      onClick: () => setContentSection(section.id),
                    }),
                  )}
                </div>
                {contentSection === "hero" ? (
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">What this controls</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        This updates the most important storefront introduction across the selected template preview and launch pages.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label>Tagline</Label>
                      <Input value={draft.heroTagline} onChange={(event) => updateDraft({ heroTagline: event.target.value })} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input value={draft.heroTitle} onChange={(event) => updateDraft({ heroTitle: event.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Highlight</Label>
                        <Input value={draft.heroHighlight} onChange={(event) => updateDraft({ heroHighlight: event.target.value })} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Subtitle</Label>
                      <Textarea rows={4} value={draft.heroSubtitle} onChange={(event) => updateDraft({ heroSubtitle: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Hero Image or Video</Label>
                      <CloudinaryUpload
                        value={draft.heroMediaUrl}
                        onChange={(url) => updateDraft({ heroMediaUrl: url })}
                        folder="hero"
                        accept="image/*,video/*"
                        label="Upload hero media"
                        resourceType="auto"
                        storeId={activeStoreId ?? undefined}
                      />
                    </div>
                  </div>
                ) : null}
                {showDeliveryFields && contentSection === "delivery" ? (
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <OnboardingPreviewCard
                      icon={Truck}
                      title={onboardingContext.behavior.deliverySectionTitle}
                      description={onboardingContext.behavior.deliverySectionDescription}
                      points={onboardingContext.behavior.deliveryPreviewPoints}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{onboardingContext.behavior.deliverySectionTitle}</p>
                      <p className="text-xs text-muted-foreground">{onboardingContext.behavior.deliverySectionDescription}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">Delivery visibility</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Customers use this information to judge whether ordering is convenient before they reach checkout.
                      </p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Enable delivery pricing</p>
                        <p className="text-xs text-muted-foreground">Show delivery fees and free-delivery thresholds during checkout.</p>
                      </div>
                      <Switch checked={draft.delivery.enabled} onCheckedChange={(checked) => updateDelivery({ enabled: checked })} />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3 rounded-lg border border-border p-4">
                        <p className="text-sm font-medium text-foreground">Delivery zones</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Primary Zone</Label>
                            <Input value={draft.delivery.primaryZoneLabel} onChange={(event) => updateDelivery({ primaryZoneLabel: event.target.value })} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Extended Zone</Label>
                            <Input value={draft.delivery.secondaryZoneLabel} onChange={(event) => updateDelivery({ secondaryZoneLabel: event.target.value })} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 rounded-lg border border-border p-4">
                        <p className="text-sm font-medium text-foreground">Pricing rules</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="grid gap-2">
                            <Label>Primary Fee</Label>
                            <Input type="number" min={0} value={draft.delivery.deliveryFee} onChange={(event) => updateDelivery({ deliveryFee: Number(event.target.value) || 0 })} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Extended Fee</Label>
                            <Input type="number" min={0} value={draft.delivery.deliveryFeeOutside} onChange={(event) => updateDelivery({ deliveryFeeOutside: Number(event.target.value) || 0 })} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Free Delivery Threshold</Label>
                            <Input type="number" min={0} value={draft.delivery.freeThreshold} onChange={(event) => updateDelivery({ freeThreshold: Number(event.target.value) || 0 })} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                {showLeadContactFields && contentSection === "lead" ? (
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <OnboardingPreviewCard
                      icon={showMapFields ? MapPin : Building2}
                      title={onboardingContext.behavior.leadSectionTitle}
                      description={onboardingContext.behavior.leadSectionDescription}
                      points={onboardingContext.behavior.leadPreviewPoints}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{onboardingContext.behavior.leadSectionTitle}</p>
                      <p className="text-xs text-muted-foreground">{onboardingContext.behavior.leadSectionDescription}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">Lead funnel basics</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Keep this simple: headline, trust promise, best contact methods, and what happens after someone reaches out.
                      </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3 rounded-lg border border-border p-4">
                        <p className="text-sm font-medium text-foreground">Page copy</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Contact Badge</Label>
                            <Input value={draft.contactPage.badge} onChange={(event) => updateContactPage({ badge: event.target.value })} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Form Button</Label>
                            <Input value={draft.contactPage.formButtonLabel} onChange={(event) => updateContactPage({ formButtonLabel: event.target.value })} />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Contact Title</Label>
                          <Input value={draft.contactPage.title} onChange={(event) => updateContactPage({ title: event.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Contact Description</Label>
                          <Textarea rows={3} value={draft.contactPage.description} onChange={(event) => updateContactPage({ description: event.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-3 rounded-lg border border-border p-4">
                        <p className="text-sm font-medium text-foreground">Contact details</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Phone</Label>
                            <Input value={draft.contactPage.phone} onChange={(event) => updateContactPage({ phone: event.target.value })} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input value={draft.contactPage.email} onChange={(event) => updateContactPage({ email: event.target.value })} />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Address</Label>
                          <Input value={draft.contactPage.address} onChange={(event) => updateContactPage({ address: event.target.value })} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Response Label</Label>
                            <Input value={draft.contactPage.responseTimeLabel} onChange={(event) => updateContactPage({ responseTimeLabel: event.target.value })} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Response Time</Label>
                            <Input value={draft.contactPage.responseTimeText} onChange={(event) => updateContactPage({ responseTimeText: event.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {showMapFields ? (
                      <>
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Show map</p>
                            <p className="text-xs text-muted-foreground">Useful for offices, hotels, showrooms, and property visits.</p>
                          </div>
                          <Switch checked={draft.contactPage.mapEnabled} onCheckedChange={(checked) => updateContactPage({ mapEnabled: checked })} />
                        </div>
                        {draft.contactPage.mapEnabled ? (
                          <div className="grid gap-2">
                            <Label>Map Embed URL</Label>
                            <Input value={draft.contactPage.mapEmbedUrl} onChange={(event) => updateContactPage({ mapEmbedUrl: event.target.value })} placeholder="https://www.google.com/maps/embed?pb=..." />
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
                {showWhatsAppFields && contentSection === "whatsapp" ? (
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <OnboardingPreviewCard
                      icon={MessageCircleMore}
                      title={onboardingContext.behavior.whatsappSectionTitle}
                      description={onboardingContext.behavior.whatsappSectionDescription}
                      points={onboardingContext.behavior.whatsappPreviewPoints}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{onboardingContext.behavior.whatsappSectionTitle}</p>
                      <p className="text-xs text-muted-foreground">{onboardingContext.behavior.whatsappSectionDescription}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">Direct conversation shortcut</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Use this when the storefront relies on quick questions, assisted sales, or post-order support through chat.
                      </p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Enable WhatsApp support</p>
                        <p className="text-xs text-muted-foreground">Show a direct support or inquiry shortcut across the storefront.</p>
                      </div>
                      <Switch checked={draft.whatsappSupport.enabled} onCheckedChange={(checked) => updateWhatsAppSupport({ enabled: checked })} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>WhatsApp Number</Label>
                        <Input value={draft.whatsappSupport.number} onChange={(event) => updateWhatsAppSupport({ number: event.target.value })} placeholder="+8801..." />
                      </div>
                      <div className="grid gap-2">
                        <Label>Starter Message</Label>
                        <Input value={draft.whatsappSupport.message} onChange={(event) => updateWhatsAppSupport({ message: event.target.value })} />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeStep.id === "catalog" ? (
              <div className="grid gap-3">
                <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  {onboardingContext.labels.catalogIntro}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">How customers buy</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Decide whether this store should behave like a normal catalog, a single-product launch, a menu, or an inquiry-led experience.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Template-aware behavior</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Only catalog modes that make sense for the chosen template appear here, so merchants avoid invalid combinations.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Easy to change later</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      This sets the default shopping flow now, but deeper catalog and checkout controls stay editable later in settings.
                    </p>
                  </div>
                </div>
                {availableCatalogModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateDraft({ catalogMode: mode })}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      draft.catalogMode === mode ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{getCatalogModeLabel(mode)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {onboardingCatalogModeDescriptions[mode]}
                        </p>
                      </div>
                      {draft.catalogMode === mode ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {activeStep.id === "theme" ? (
              <div className="space-y-4">
                {!themePresetsEnabled ? (
                  <p className="text-xs text-muted-foreground">
                    Theme switching is disabled for this store package. Saved theme data still previews normally.
                  </p>
                ) : null}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Pick a starting style</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Choose the closest design package first, then adjust mode, fonts, radius, and brand colors below.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Safe defaults first</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      This keeps the setup simple for new merchants while still preserving full editing flexibility later in the storefront editor.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Preview-driven</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Every theme change updates the live preview, so merchants can judge the overall look without touching code.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {themePackages.map((themePackage) => {
                    const isActive = draft.themePackageId === themePackage.id;
                    return (
                      <button
                        key={themePackage.id}
                        type="button"
                        onClick={() => {
                          if (!themePresetsEnabled) return;
                          updateDraft({
                            themePackageId: themePackage.id,
                            themeMode: themePackage.mode,
                            headingFont: themePackage.tokens.typography.headingFont || draft.headingFont,
                            bodyFont: themePackage.tokens.typography.bodyFont || draft.bodyFont,
                            borderRadius: themePackage.tokens.components.borderRadius || draft.borderRadius,
                          });
                        }}
                        disabled={!themePresetsEnabled}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          isActive ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                        } ${!themePresetsEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <div className="mb-3 flex gap-1.5">
                          <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.bg }} />
                          <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.primary }} />
                          <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.accent }} />
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{themePackage.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{themePackage.description}</p>
                          </div>
                          {isActive ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Display basics</p>
                      <p className="text-xs text-muted-foreground">Set the main visual personality for this storefront.</p>
                    </div>
                    <div className="grid gap-2">
                      <Label>Mode</Label>
                      <Select value={draft.themeMode} onValueChange={(value) => updateDraft({ themeMode: value as Store["theme"]["mode"] })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Heading Font</Label>
                        <Input value={draft.headingFont} onChange={(event) => updateDraft({ headingFont: event.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Body Font</Label>
                        <Input value={draft.bodyFont} onChange={(event) => updateDraft({ bodyFont: event.target.value })} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Border Radius</Label>
                      <Input value={draft.borderRadius} onChange={(event) => updateDraft({ borderRadius: event.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Basic Color Customizer</p>
                      <p className="text-xs text-muted-foreground">Customize primary, accent, and background brand colors that save to customCssVars.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {BASIC_THEME_TOKENS.map((token) => {
                        const resolvedVars = resolveStoreThemeVars({
                          presetId: draft.themePackageId,
                          themePackageId: draft.themePackageId,
                          mode: draft.themeMode,
                          customCssVars: draft.customCssVars,
                        }, themePackages).vars;
                        const currentValue = draft.customCssVars[token.key] ?? resolvedVars[token.key] ?? "";

                        return (
                          <div key={token.key} className="grid gap-2">
                            <Label>{token.label}</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="color"
                                value={hslChannelsToHex(currentValue) ?? (currentValue.startsWith("#") ? currentValue : "#000000")}
                                onChange={(event) => {
                                  const next = hexToHslChannels(event.target.value) ?? event.target.value;
                                  updateDraft({
                                    customCssVars: {
                                      ...draft.customCssVars,
                                      [token.key]: next,
                                    },
                                  });
                                }}
                                className="h-10 w-16 cursor-pointer p-1"
                              />
                              <Input
                                value={currentValue}
                                onChange={(event) => updateDraft({
                                  customCssVars: {
                                    ...draft.customCssVars,
                                    [token.key]: event.target.value,
                                  },
                                })}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeStep.id === "payments" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  {onboardingContext.labels.paymentIntro}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Keep launch simple</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Start with the payment methods you actually use today. Merchants can expand options later without blocking launch.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Merchant-specific settings</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      These values stay store-specific, so payment numbers and checkout behavior do not leak across merchants.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Prepaid vs delivery</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Use prepaid methods for confirmation-first selling, COD for physical delivery flows, or both when needed.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Prepaid payment methods</p>
                      <p className="text-xs text-muted-foreground">Turn on only the numbers this merchant is ready to receive payments on.</p>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">bKash</p>
                          <p className="text-xs text-muted-foreground">Manual merchant number for prepaid orders.</p>
                        </div>
                        <Switch checked={draft.payment.bkash_enabled} onCheckedChange={(checked) => updatePayment({ bkash_enabled: checked })} />
                      </div>
                      {draft.payment.bkash_enabled ? (
                        <div className="grid gap-2">
                          <Label>bKash Number</Label>
                          <Input data-testid="onboarding-bkash-number" value={draft.payment.bkash_number} placeholder="01XXXXXXXXX" onChange={(event) => updatePayment({ bkash_number: event.target.value })} />
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-3 rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Nagad</p>
                          <p className="text-xs text-muted-foreground">Manual merchant number for prepaid orders.</p>
                        </div>
                        <Switch checked={draft.payment.nagad_enabled} onCheckedChange={(checked) => updatePayment({ nagad_enabled: checked })} />
                      </div>
                      {draft.payment.nagad_enabled ? (
                        <div className="grid gap-2">
                          <Label>Nagad Number</Label>
                          <Input value={draft.payment.nagad_number} placeholder="01XXXXXXXXX" onChange={(event) => updatePayment({ nagad_number: event.target.value })} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Delivery payment option</p>
                      <p className="text-xs text-muted-foreground">Useful for physical product and local-delivery businesses that confirm payment at handoff.</p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Allow customers to pay when products arrive.</p>
                      </div>
                      <Switch checked={draft.payment.cod_enabled} onCheckedChange={(checked) => updatePayment({ cod_enabled: checked })} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeStep.id === "launch" ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Ready to go live</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      This is the final review step before saving or publishing the storefront with the current setup choices.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Publish when you are confident</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Save draft if you want to review later, or publish immediately when the store details, theme, and payments are ready.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Demo data stays optional</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Seed demo products only when the merchant wants example content to launch faster or preview the template properly.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-5">
                  <p className="text-sm text-muted-foreground">Store URL</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input readOnly value={storeUrl} className="font-mono text-xs" />
                    <Button type="button" variant="outline" onClick={copyStoreUrl} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{onboardingContext.templateDefinition.label}</Badge>
                    <Badge variant="secondary">{draft.catalogMode.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary">{onboardingContext.templateProfile.businessFamily}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {onboardingContext.labels.launchChecklist}
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Launch actions</p>
                      <p className="text-xs text-muted-foreground">Use the primary action that matches the merchant's confidence level right now.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button type="button" data-testid="onboarding-publish-store" onClick={() => void saveAndLaunch(true)} disabled={saving || !slugAvailable} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                        Publish Store
                      </Button>
                      <Button type="button" data-testid="onboarding-save-draft" variant="outline" onClick={() => void saveAndLaunch(false)} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Draft
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {slugAvailable
                        ? "The storefront URL is available and ready for save or publish."
                        : "Fix the store URL first before publishing this storefront."}
                    </p>
                  </div>
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Optional demo content</p>
                      <p className="text-xs text-muted-foreground">Use demo data only when it helps the merchant preview the template or launch faster.</p>
                    </div>
                    <div className="grid gap-3">
                      <Button type="button" variant="outline" onClick={() => void seedTemplateDemoData()} disabled={seedingTemplateData || !slugAvailable} className="gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                        {seedingTemplateData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                        {catalogSeedMetadata ? "Reseed Demo Data" : onboardingContext.labels.seedButton}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => void unseedTemplateDemoData()} disabled={unseedingTemplateData || !catalogSeedMetadata} className="gap-2">
                        {unseedingTemplateData ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                        Unseed Demo Data
                      </Button>
                    </div>
                  </div>
                </div>
                <Button type="button" variant="secondary" asChild className="w-full gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`My store is live: ${storeUrl}`)}`} target="_blank" rel="noreferrer">
                    <Share2 className="h-4 w-4" />
                    Share to WhatsApp
                  </a>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setActiveIndex((current) => Math.max(0, current - 1))} disabled={!canGoBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {canGoNext ? (
            <Button type="button" data-testid="onboarding-next-step" onClick={() => setActiveIndex((current) => Math.min(steps.length - 1, current + 1))} className="gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <AdminPreviewStoreButton variant="button" />
              <Button type="button" asChild variant="outline" className="gap-2">
                <a href={storeUrl} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4" />
                  View Store
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:h-max">
        <StoreProvider store={previewStore}>
          <StoreThemeScope theme={previewStore.theme}>
            <StorefrontPreviewFrame viewport="mobile" title="Onboarding storefront preview" showToolbar={true}>
              {previewHomepage ? (
                <StorefrontTemplateRenderer
                  store={previewStore}
                  page={previewHomepage}
                  blocks={[...previewHomepage.blocks].sort((a, b) => a.sortOrder - b.sortOrder)}
                  adminMode={false}
                  selectedBlockId={null}
                  canManageStorefront={false}
                  onSelectBlock={() => {}}
                />
              ) : null}
            </StorefrontPreviewFrame>
          </StoreThemeScope>
        </StoreProvider>
      </div>
    </div>
  );
}
