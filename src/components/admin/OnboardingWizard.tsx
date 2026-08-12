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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Layers,
  LayoutTemplate,
  Maximize2,
  Minimize2,
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MerchantPreviewChecklist, type PreviewChecklistItem } from "@/components/admin/MerchantPreviewChecklist";
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
import {
  HomepageSectionChoiceCard,
  HomepageSectionLinkArrow,
  homepageSectionLinkIconClassName,
} from "@/components/admin/HomepageSectionChoiceCard";
import {
  createRegistryDefaultBlock,
  fallbackBlockRegistry,
  prioritizeRecommendedBlocks,
  type CmsBlockRegistryItem,
} from "@/lib/cms/block-registry";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
import { refreshStorefrontContentCache } from "@/lib/storefront-cache-client";
import { BASIC_THEME_TOKENS, GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { getCatalogModeLabel } from "@/lib/cms/storefront-compat";
import {
  type LaunchTemplatePaymentDefaults,
} from "@/lib/cms/launch-templates";
import { isTemplateSeedMetadata, reseedTemplateCatalog, unseedTemplateCatalog } from "@/lib/cms/template-seed-management";
import { createStoreSlug } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { buildPageBuilderPath, buildSiteSettingsPath, getHomepageSectionEditorLink } from "@/lib/admin-paths";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { getEffectiveSubscriptionStatus } from "@/lib/billing/plans";
import {
  fallbackStorefrontTemplateSeeds,
  findStorefrontTemplateSeedById,
  resolveStorefrontTemplateSeed,
  type StorefrontTemplateSeedDefinition,
} from "@/lib/cms/storefront-template-seeds";
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
import {
  applyHomepageSectionVisibilityToPages,
  createDefaultHomepageSectionVisibility,
  getOptionalTemplateHomepageSectionChoices,
  normalizeHomepageSectionVisibility,
} from "@/lib/cms/template-homepage-sections";
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
  templateId: string;
  onboardingMode: "template" | "blank";
  blankBusinessFamily: StorefrontTemplateSeedDefinition["businessFamily"];
  starterBlockSelections: string[];
  starterVariantSelections: Record<string, string>;
  businessFamily: StorefrontTemplateSeedDefinition["businessFamily"];
  catalogMode: StorefrontTemplateSeedDefinition["catalogMode"];
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
  homepageSectionVisibility: Record<string, boolean>;
  isPublished: boolean;
}

type ContentSectionId = "hero" | "layout" | "delivery" | "lead" | "whatsapp";
type LaunchCompletionState = {
  published: boolean;
  templateId: string;
};

type PreviewDockMode = "closed" | "half" | "fullscreen";

function getTemplateSeedDefaults(templateId: string, templateSeeds: StorefrontTemplateSeedDefinition[] = fallbackStorefrontTemplateSeeds) {
  const templateProfile = resolveStorefrontTemplateProfile(templateId, { templateSeedId: templateId });
  const templateSeed = findStorefrontTemplateSeedById(templateProfile.templateSeedId, templateSeeds)
    ?? resolveStorefrontTemplateSeed(templateProfile.templateSeedId, templateSeeds);

  return {
    templateProfile,
    seedDefinition: templateProfile.seedDefinition,
    templateSeed,
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

function BlankBuilderPreviewShell({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border p-2",
        tone === "primary"
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-muted/20",
      )}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-12 rounded-full bg-muted-foreground/20" />
          <div className="h-2 w-8 rounded-full bg-muted-foreground/15" />
        </div>
        {children}
      </div>
    </div>
  );
}

function BlankBuilderBlockPreview({
  blockType,
  variantId,
  draft,
}: {
  blockType: string;
  variantId?: string;
  draft?: Pick<DraftState, "heroTagline" | "heroTitle" | "heroSubtitle" | "heroMediaUrl" | "faqEntries">;
}) {
  if (blockType === "hero") {
    const heroTagline = draft?.heroTagline?.trim() || "New collection";
    const heroTitle = draft?.heroTitle?.trim() || "Bring your storefront to life";
    const heroSubtitle = draft?.heroSubtitle?.trim() || "Start with a strong first impression, then refine the rest as real content comes in.";
    const hasHeroMedia = Boolean(draft?.heroMediaUrl?.trim());

    if (variantId === "split") {
      return (
        <BlankBuilderPreviewShell tone="primary">
          <div className="grid grid-cols-[1.1fr_0.9fr] gap-2">
            <div className="space-y-1.5 rounded-md bg-background p-2">
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-primary/80">{heroTagline}</p>
              <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-foreground">{heroTitle}</p>
              <p className="line-clamp-2 text-[10px] leading-4 text-muted-foreground">{heroSubtitle}</p>
              <div className="inline-flex h-5 items-center rounded-full bg-primary/20 px-2 text-[9px] font-medium text-primary">Shop now</div>
            </div>
            <div className="rounded-md bg-primary/15">
              <div className="flex h-full items-end justify-end rounded-md border border-dashed border-primary/20 p-2 text-[9px] text-primary/70">
                {hasHeroMedia ? "Hero media ready" : "Add hero media"}
              </div>
            </div>
          </div>
        </BlankBuilderPreviewShell>
      );
    }

    if (variantId === "centered") {
      return (
        <BlankBuilderPreviewShell tone="primary">
          <div className="rounded-md bg-background px-3 py-4 text-center">
            <p className="mx-auto max-w-[90%] truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-primary/80">{heroTagline}</p>
            <p className="mx-auto mt-2 line-clamp-2 max-w-[90%] text-[11px] font-semibold leading-4 text-foreground">{heroTitle}</p>
            <p className="mx-auto mt-1 line-clamp-2 max-w-[85%] text-[10px] leading-4 text-muted-foreground">{heroSubtitle}</p>
            <div className="mx-auto mt-3 inline-flex h-5 items-center rounded-full bg-primary/20 px-2 text-[9px] font-medium text-primary">Explore</div>
          </div>
        </BlankBuilderPreviewShell>
      );
    }

    if (variantId === "editorial") {
      return (
        <BlankBuilderPreviewShell tone="primary">
          <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
            <div className="rounded-md bg-primary/15">
              <div className="flex h-full items-end justify-end rounded-md border border-dashed border-primary/20 p-2 text-[9px] text-primary/70">
                {hasHeroMedia ? "Editorial media" : "Add image"}
              </div>
            </div>
            <div className="space-y-1.5 rounded-md bg-background p-2">
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-primary/80">{heroTagline}</p>
              <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-foreground">{heroTitle}</p>
              <p className="line-clamp-2 text-[10px] leading-4 text-muted-foreground">{heroSubtitle}</p>
              <div className="grid grid-cols-2 gap-1 pt-1">
                <div className="flex h-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-medium text-primary">Primary</div>
                <div className="flex h-4 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">Secondary</div>
              </div>
            </div>
          </div>
        </BlankBuilderPreviewShell>
      );
    }

    return (
      <BlankBuilderPreviewShell tone="primary">
        <div className="rounded-md bg-background p-3">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-primary/80">{heroTagline}</p>
          <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-4 text-foreground">{heroTitle}</p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{heroSubtitle}</p>
          <div className="mt-3 inline-flex h-5 items-center rounded-full bg-primary/20 px-2 text-[9px] font-medium text-primary">Browse</div>
        </div>
      </BlankBuilderPreviewShell>
    );
  }

  if (blockType === "featured-products") {
    const isSidebar = variantId === "3-col-sidebar-left" || variantId === "3-col-sidebar-right";
    const columnCount = variantId === "2-col" ? 2 : variantId === "4-col" ? 4 : 3;

    return (
      <BlankBuilderPreviewShell>
        <div className={cn("grid gap-2", isSidebar ? "grid-cols-[0.4fr_1fr]" : "")}>
          {isSidebar && variantId === "3-col-sidebar-left" ? <div className="rounded-md bg-background/80" /> : null}
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
            {Array.from({ length: columnCount }).map((_, index) => (
              <div key={index} className="space-y-1 rounded-md bg-background p-1.5">
                <div className="aspect-[4/5] rounded bg-primary/10" />
                <div className="h-2 rounded-full bg-foreground/15" />
                <div className="h-2 w-2/3 rounded-full bg-foreground/10" />
              </div>
            ))}
          </div>
          {isSidebar && variantId === "3-col-sidebar-right" ? <div className="rounded-md bg-background/80" /> : null}
        </div>
      </BlankBuilderPreviewShell>
    );
  }

  if (blockType === "category-showcase") {
    if (variantId === "carousel") {
      return (
        <BlankBuilderPreviewShell>
          <div className="flex gap-1.5 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="min-w-0 flex-1 rounded-md bg-background p-1.5">
                <div className="aspect-square rounded bg-primary/10" />
                <div className="mt-1 h-2 rounded-full bg-foreground/12" />
              </div>
            ))}
          </div>
        </BlankBuilderPreviewShell>
      );
    }

    if (variantId === "compact-list") {
      return (
        <BlankBuilderPreviewShell>
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 rounded-md bg-background p-1.5">
                <div className="h-7 w-7 rounded bg-primary/10" />
                <div className="h-2 flex-1 rounded-full bg-foreground/12" />
              </div>
            ))}
          </div>
        </BlankBuilderPreviewShell>
      );
    }

    return (
      <BlankBuilderPreviewShell>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-md bg-background p-1.5">
              <div className="aspect-square rounded bg-primary/10" />
              <div className="mt-1 h-2 rounded-full bg-foreground/12" />
            </div>
          ))}
        </div>
      </BlankBuilderPreviewShell>
    );
  }

  if (blockType === "promo-banner") {
    return (
      <BlankBuilderPreviewShell tone="primary">
        <div className="rounded-md bg-primary/15 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-primary/80">Offer</p>
              <p className="line-clamp-1 text-[11px] font-medium text-foreground">Highlight a timely promotion or announcement</p>
            </div>
            <div className="flex h-5 items-center rounded-full bg-background/80 px-2 text-[9px] font-medium text-foreground">View</div>
          </div>
        </div>
      </BlankBuilderPreviewShell>
    );
  }

  if (blockType === "trust-badges") {
    return (
      <BlankBuilderPreviewShell>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-md bg-background p-1.5 text-center">
              <div className="mx-auto h-5 w-5 rounded-full bg-primary/12" />
              <p className="mx-auto mt-1 max-w-[90%] truncate text-[9px] text-muted-foreground">
                {["Secure", "Fast", "Trusted"][index] ?? "Verified"}
              </p>
            </div>
          ))}
        </div>
      </BlankBuilderPreviewShell>
    );
  }

  if (blockType === "testimonials") {
    return (
      <BlankBuilderPreviewShell>
        <div className="grid grid-cols-2 gap-1.5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-md bg-background p-2">
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((__, starIndex) => (
                  <div key={starIndex} className="h-2 w-2 rounded-full bg-primary/20" />
                ))}
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-muted-foreground">
                Quick proof that this storefront feels credible and easy to buy from.
              </p>
            </div>
          ))}
        </div>
      </BlankBuilderPreviewShell>
    );
  }

  if (blockType === "faq-accordion") {
    const previewFaqs = draft?.faqEntries?.filter((entry) => entry.q.trim()).slice(0, 3) ?? [];

    return (
      <BlankBuilderPreviewShell>
        <div className="space-y-1.5">
          {(previewFaqs.length > 0
            ? previewFaqs
            : Array.from({ length: 3 }).map((_, index) => ({
                q: index === 0 ? "Do you deliver?" : index === 1 ? "How do I order?" : "Can I customize later?",
                a: "",
              }))).map((entry, index) => (
            <div key={index} className="flex items-center justify-between rounded-md bg-background px-2 py-2">
              <p className="truncate pr-2 text-[9px] text-muted-foreground">{entry.q}</p>
              <div className="h-4 w-4 rounded-full bg-primary/12" />
            </div>
          ))}
        </div>
      </BlankBuilderPreviewShell>
    );
  }

  if (blockType === "rich-text") {
    return (
      <BlankBuilderPreviewShell>
        <div className="rounded-md bg-background p-2">
          <p className="text-[11px] font-medium text-foreground">Tell the store story</p>
          <p className="mt-2 line-clamp-3 text-[9px] leading-4 text-muted-foreground">
            Useful when the merchant needs a short founder note, buying guide, service explanation, or trust-building introduction.
          </p>
        </div>
      </BlankBuilderPreviewShell>
    );
  }

  return (
    <BlankBuilderPreviewShell>
      <div className="rounded-md bg-background p-2">
        <div className="h-3 w-1/2 rounded-full bg-foreground/15" />
        <div className="mt-2 h-10 rounded-md bg-primary/10" />
      </div>
    </BlankBuilderPreviewShell>
  );
}

function getTemplateSeedSiteSettingRecord(templateSeed: StorefrontTemplateSeedDefinition, key: string) {
  const value = templateSeed.defaultSiteSettings[key];
  return typeof value === "object" && value ? value as Record<string, unknown> : {};
}

function getDefaultContactPage(templateSeed: StorefrontTemplateSeedDefinition) {
  const contact = getTemplateSeedSiteSettingRecord(templateSeed, "contact_page");
  return {
    badge: typeof contact.badge === "string" ? contact.badge : "Get in touch",
    title: typeof contact.title === "string" ? contact.title : "Contact Us",
    description: typeof contact.description === "string" ? contact.description : templateSeed.storeDescription,
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

function getDefaultDeliverySettings(templateSeed: StorefrontTemplateSeedDefinition) {
  const delivery = getTemplateSeedSiteSettingRecord(templateSeed, "delivery_settings");
  return {
    enabled: Boolean(delivery.enabled),
    primaryZoneLabel: typeof delivery.primary_zone_label === "string" ? delivery.primary_zone_label : "Primary delivery zone",
    secondaryZoneLabel: typeof delivery.secondary_zone_label === "string" ? delivery.secondary_zone_label : "Extended delivery zone",
    deliveryFee: typeof delivery.delivery_fee === "number" ? delivery.delivery_fee : 80,
    deliveryFeeOutside: typeof delivery.delivery_fee_outside === "number" ? delivery.delivery_fee_outside : 150,
    freeThreshold: typeof delivery.free_threshold === "number" ? delivery.free_threshold : 2000,
  };
}

function getDefaultWhatsAppSupport(templateSeed: StorefrontTemplateSeedDefinition) {
  const whatsapp = getTemplateSeedSiteSettingRecord(templateSeed, "whatsapp_support");
  return {
    enabled: Boolean(whatsapp.enabled),
    number: typeof whatsapp.number === "string" ? whatsapp.number : "",
    message: typeof whatsapp.message === "string" ? whatsapp.message : "Hi! I need help with my order.",
  };
}

function getDefaultFaqEntries(templateSeed: StorefrontTemplateSeedDefinition) {
  const faq = templateSeed.defaultSiteSettings.faq_entries;
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
  templateSeeds: StorefrontTemplateSeedDefinition[] = fallbackStorefrontTemplateSeeds,
) {
  const { templateSeed } = getTemplateSeedDefaults(templateId, templateSeeds);
  const templateProfile = resolveStorefrontTemplateProfile(templateId, {
    templateSeedId: templateSeed.id,
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
    templateSeed,
    templateId: templateProfile.templateId,
  });
  const storefrontProfile = (typeof templateSeed.defaultSiteSettings.storefront_profile === "object" && templateSeed.defaultSiteSettings.storefront_profile)
    ? templateSeed.defaultSiteSettings.storefront_profile as Record<string, unknown>
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
      templateHelper: behavior.templateHelper,
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

function getTemplatePaymentDefaults(templateId: string): LaunchTemplatePaymentDefaults {
  return getTemplatePaymentDefaultsFromCollection(templateId);
}

function getTemplatePaymentDefaultsFromCollection(
  templateId: string,
  templateSeeds: StorefrontTemplateSeedDefinition[] = fallbackStorefrontTemplateSeeds,
): LaunchTemplatePaymentDefaults {
  const { seedDefinition } = getTemplateSeedDefaults(templateId, templateSeeds);
  const templatePaymentSettings = seedDefinition.defaultSiteSettings.payment_settings;
  if (typeof templatePaymentSettings === "object" && templatePaymentSettings) {
    const paymentSettings = templatePaymentSettings as Record<string, unknown>;
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

function getDefaultTemplateSeedId(availableTemplateSeeds: StorefrontTemplateSeedDefinition[] = fallbackStorefrontTemplateSeeds) {
  return availableTemplateSeeds.find((item) => item.id === "general-catalog")?.id
    ?? availableTemplateSeeds[0]?.id
    ?? "general-catalog";
}

function getTemplateSeedDraftStoreName(templateSeed: StorefrontTemplateSeedDefinition) {
  return `${templateSeed.shortName} Store`;
}

function getBlankDefaultBlockSelections(businessFamily: StorefrontTemplateSeedDefinition["businessFamily"]) {
  if (businessFamily === "service" || businessFamily === "booking" || businessFamily === "donation") {
    return ["hero", "rich-text"];
  }

  return ["hero", "featured-products"];
}

function getBlankCatalogMode(businessFamily: StorefrontTemplateSeedDefinition["businessFamily"]): StorefrontTemplateSeedDefinition["catalogMode"] {
  switch (businessFamily) {
    case "service":
    case "booking":
    case "listing":
      return "inquiry_only";
    default:
      return "multi_product";
  }
}

function getBlankCapabilities(businessFamily: StorefrontTemplateSeedDefinition["businessFamily"]) {
  switch (businessFamily) {
    case "booking":
      return ["booking_requests", "lead_capture", "availability"];
    case "listing":
      return ["lead_capture", "listing_catalog", "viewing_requests"];
    case "service":
      return ["lead_capture", "packages", "service_inquiries"];
    default:
      return ["catalog", "cart", "checkout"];
  }
}

type BlankBlockSuggestion = CmsBlockRegistryItem & {
  reason: string;
  relevanceLabel: string;
  score: number;
};

function formatVariantLabel(value: string) {
  return value.replace(/-/g, " ");
}

function getBlankBlockPriority(block: CmsBlockRegistryItem["value"], businessFamily: StorefrontTemplateSeedDefinition["businessFamily"]) {
  const familyOrder: Record<StorefrontTemplateSeedDefinition["businessFamily"], Array<CmsBlockRegistryItem["value"]>> = {
    commerce: [
      "featured-products",
      "category-showcase",
      "promo-banner",
      "trust-badges",
      "testimonials",
      "faq-accordion",
      "rich-text",
      "video-reel",
      "social-feed",
      "comparison",
      "recently-viewed",
      "recommended-products",
    ],
    booking: [
      "rich-text",
      "trust-badges",
      "promo-banner",
      "testimonials",
      "faq-accordion",
      "video-reel",
      "social-feed",
    ],
    listing: [
      "featured-products",
      "trust-badges",
      "rich-text",
      "testimonials",
      "faq-accordion",
      "promo-banner",
      "video-reel",
      "social-feed",
    ],
    service: [
      "rich-text",
      "trust-badges",
      "testimonials",
      "faq-accordion",
      "promo-banner",
      "video-reel",
      "social-feed",
    ],
    donation: [
      "rich-text",
      "trust-badges",
      "testimonials",
      "faq-accordion",
      "promo-banner",
      "video-reel",
      "social-feed",
    ],
  };

  return familyOrder[businessFamily].indexOf(block);
}

function getBlankBlockReason(block: CmsBlockRegistryItem, businessFamily: StorefrontTemplateSeedDefinition["businessFamily"], isRequired: boolean) {
  if (isRequired) {
    if (businessFamily === "service" || businessFamily === "booking") {
      return "Included first because every guided launch needs a hero and a clear main conversion section.";
    }

    return "Included first because every guided launch needs a hero and a main catalog-style conversion section.";
  }

  const businessFamilyReasons: Partial<Record<CmsBlockRegistryItem["value"], Partial<Record<StorefrontTemplateSeedDefinition["businessFamily"], string>>>> = {
    "featured-products": {
      commerce: "Best early choice when shoppers need the main products, offers, or listings in front of them quickly.",
      listing: "Useful when the homepage should move visitors straight into active listings or featured properties.",
    },
    "category-showcase": {
      commerce: "A strong early add when the store has multiple collections, menus, or product groups to browse.",
    },
    "promo-banner": {
      commerce: "Helpful for offers, shipping cues, or campaign messaging near the top of the homepage.",
      booking: "Helpful for seasonal promotions, limited-time packages, or reservation offers.",
      listing: "Helpful for featured offers, neighborhood campaigns, or seller-focused callouts.",
      service: "Helpful for limited packages, consultation offers, or a strong lead-driving callout.",
      donation: "Helpful for time-bound campaigns, donation drives, or cause updates that need immediate attention.",
    },
    "trust-badges": {
      commerce: "Suggested early because new stores usually benefit from faster payment, delivery, and support trust.",
      booking: "Suggested early because guests want confidence around service quality, support, and reservation handling.",
      listing: "Suggested early because property and listing journeys need extra trust before inquiry.",
      service: "Suggested early because service buyers want confidence before they message or book.",
      donation: "Suggested early because donors need confidence about legitimacy, support, and how contributions are handled.",
    },
    testimonials: {
      commerce: "Useful when social proof should show up before shoppers hesitate on a first purchase.",
      booking: "Useful when guest feedback helps reduce booking hesitation.",
      listing: "Useful when client proof or past results help move visitors into inquiry.",
      service: "Useful when client proof is important before someone requests a consultation.",
      donation: "Useful when donor stories or beneficiary proof helps visitors trust the campaign before contributing.",
    },
    "faq-accordion": {
      commerce: "Useful when shipping, return, sizing, or payment questions are likely to slow purchase.",
      booking: "Useful when timing, cancellation, or reservation questions matter early.",
      listing: "Useful when visitors need answers before sending a viewing or pricing inquiry.",
      service: "Useful when scope, timeline, or pricing questions come up often.",
      donation: "Useful when donors need quick answers about impact, payment methods, transparency, or campaign rules.",
    },
    "rich-text": {
      commerce: "Useful when the homepage needs brand story, policy context, or delivery details beyond product cards.",
      booking: "A good early section for explaining the reservation flow and guest expectations clearly.",
      listing: "A good early section for explaining process, location context, or how inquiries work.",
      service: "A good early section for explaining packages, process, and what happens after inquiry.",
      donation: "A good early section for explaining the mission, campaign context, and how donations make a difference.",
    },
    "video-reel": {
      commerce: "Helpful when demos or motion explain the product faster than text alone.",
      booking: "Helpful for tours, room previews, or showing the atmosphere before booking.",
      listing: "Helpful for walkthroughs, neighborhood clips, or featured property motion.",
      service: "Helpful when demonstrations or behind-the-scenes proof build trust quickly.",
      donation: "Helpful when campaign videos, field updates, or founder messages make the cause feel more real.",
    },
    "social-feed": {
      commerce: "Best when the brand already has good visual proof from customers or creators.",
      booking: "Best when recent guest moments or venue visuals help bookings.",
      listing: "Best when live social proof supports discovery and credibility.",
      service: "Best when project snapshots or client moments build confidence.",
      donation: "Best when campaign updates, volunteer moments, or beneficiary visuals support credibility.",
    },
    comparison: {
      commerce: "Useful when buyers compare packages, devices, plans, or feature tiers before buying.",
    },
    "recently-viewed": {
      commerce: "More valuable once shoppers browse multiple items and return often.",
    },
    "recommended-products": {
      commerce: "Best after the main catalog flow is already clear and you want stronger cross-sell support.",
    },
  };

  return businessFamilyReasons[block.value]?.[businessFamily]
    ?? "A supporting section you can add now or turn on later from onboarding and settings.";
}

function buildBlankBlockSuggestions(
  blocks: CmsBlockRegistryItem[],
  businessFamily: StorefrontTemplateSeedDefinition["businessFamily"],
  recommendedBlockSet: readonly string[],
): BlankBlockSuggestion[] {
  const requiredDefaults = new Set(getBlankDefaultBlockSelections(businessFamily));
  const recommended = prioritizeRecommendedBlocks(blocks, { recommendedBlockSet: [...recommendedBlockSet] });
  const recommendedOrder = new Map(recommended.map((block, index) => [block.value, index]));

  return [...blocks]
    .map((block) => {
      const isRequired = requiredDefaults.has(block.value);
      const priorityIndex = getBlankBlockPriority(block.value, businessFamily);
      const recommendedIndex = recommendedOrder.get(block.value) ?? 999;
      const score = (
        (isRequired ? 1000 : 0)
        + (priorityIndex >= 0 ? 400 - (priorityIndex * 20) : 0)
        + (recommendedIndex < 999 ? 180 - Math.min(recommendedIndex, 8) * 8 : 0)
        + (block.layer === "core" ? 20 : 0)
        + (block.variantIds.length > 0 ? 12 : 0)
      );

      return {
        ...block,
        score,
        relevanceLabel: isRequired
          ? "Starter default"
          : priorityIndex >= 0
            ? priorityIndex < 3
              ? "Strong match"
              : "Good fit"
            : "Optional later",
        reason: getBlankBlockReason(block, businessFamily, isRequired),
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.label.localeCompare(right.label);
      });
}

function sortStarterBlockSelections(
  selections: string[],
  businessFamily: StorefrontTemplateSeedDefinition["businessFamily"],
) {
  const requiredDefaults = new Set(getBlankDefaultBlockSelections(businessFamily));

  return [...new Set(selections)]
    .sort((left, right) => {
      const leftRequired = requiredDefaults.has(left);
      const rightRequired = requiredDefaults.has(right);

      if (leftRequired !== rightRequired) {
        return leftRequired ? -1 : 1;
      }

      const priorityDelta = getBlankBlockPriority(left as CmsBlockRegistryItem["value"], businessFamily) - getBlankBlockPriority(right as CmsBlockRegistryItem["value"], businessFamily);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.localeCompare(right);
    });
}

function getOrderedStarterBlockSelections(
  businessFamily: StorefrontTemplateSeedDefinition["businessFamily"],
  selections: string[],
) {
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const blockType of [...getBlankDefaultBlockSelections(businessFamily), ...selections]) {
    if (seen.has(blockType)) {
      continue;
    }

    seen.add(blockType);
    ordered.push(blockType);
  }

  return ordered;
}

function buildBlankBuilderChecklist(
  draft: DraftState,
  selectedBlocks: string[],
): PreviewChecklistItem[] {
  const heroVariant = draft.starterVariantSelections.hero || "full-bleed";
  const defaultBlocks = getBlankDefaultBlockSelections(draft.blankBusinessFamily);
  const hasOptionalStoryBlock = selectedBlocks.some((block) => !defaultBlocks.includes(block));
  const contentHeavyBlocks = selectedBlocks.filter((block) =>
    ["promo-banner", "faq-accordion", "testimonials", "trust-badges", "social-feed", "video-reel", "comparison", "rich-text"].includes(block),
  );

  return [
    {
      label: "Starter homepage structure is set",
      done: selectedBlocks.length >= defaultBlocks.length,
      hint: "Core sections stay included, and you can still rearrange or expand them before launch.",
    },
    {
      label: "Hero message feels launch-ready",
      done: Boolean(draft.heroTitle.trim() && draft.heroSubtitle.trim()),
      hint: "A strong headline and supporting line make the blank template feel intentional immediately.",
    },
    {
      label: "Media-heavy hero layouts have artwork",
      done: !["full-bleed", "editorial", "split"].includes(heroVariant) || Boolean(draft.heroMediaUrl.trim()),
      hint: "Split, editorial, and full-bleed heroes look much stronger once a real image is attached.",
    },
    {
      label: "Optional storytelling sections are intentional",
      done: hasOptionalStoryBlock,
      hint: hasOptionalStoryBlock
        ? "Nice. The homepage goes beyond the bare minimum and starts explaining the offer."
        : "A minimal homepage is fine, but consider one extra supporting section if the merchant needs more context.",
    },
    {
      label: "Selected optional sections can be personalized later",
      done: contentHeavyBlocks.length === 0,
      hint: contentHeavyBlocks.length > 0
        ? `${contentHeavyBlocks.slice(0, 3).map((block) => formatVariantLabel(block)).join(", ")} will feel stronger after a quick content pass in Styles.`
        : "Nothing content-heavy is waiting on extra setup yet.",
    },
  ];
}

function draftFromTemplateSeed(
  templateId: string,
  themePackages: ThemePackageDefinition[],
  previous?: Partial<DraftState>,
  templateSeeds: StorefrontTemplateSeedDefinition[] = fallbackStorefrontTemplateSeeds,
): DraftState {
  const { templateProfile, templateSeed, seedDefinition } = getTemplateSeedDefaults(templateId, templateSeeds);
  const themePackage = resolveThemePackageById(previous?.themePackageId, themePackages, seedDefinition.defaultTheme.presetId);
  const storeName = previous?.storeName || getTemplateSeedDraftStoreName(templateSeed);

  return {
    storeName,
    slug: previous?.slug || createStoreSlug(storeName),
    customDomain: previous?.customDomain || "",
    description: previous?.description || seedDefinition.storeDescription,
    logoUrl: previous?.logoUrl || "",
    templateId: templateProfile.templateId,
    onboardingMode: previous?.onboardingMode || seedDefinition.onboardingMode,
    blankBusinessFamily: previous?.blankBusinessFamily || templateProfile.businessFamily,
    starterBlockSelections: previous?.starterBlockSelections?.length
      ? previous.starterBlockSelections
      : getBlankDefaultBlockSelections(templateProfile.businessFamily),
    starterVariantSelections: previous?.starterVariantSelections || {},
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
      ...getTemplatePaymentDefaults(templateSeed.id),
      ...getTemplatePaymentDefaultsFromCollection(templateSeed.id, templateSeeds),
      bkash_number: previous?.payment?.bkash_number || "",
      nagad_number: previous?.payment?.nagad_number || "",
    },
    contactPage: {
      ...getDefaultContactPage(templateSeed),
      ...previous?.contactPage,
    },
    delivery: {
      ...getDefaultDeliverySettings(templateSeed),
      ...previous?.delivery,
    },
    whatsappSupport: {
      ...getDefaultWhatsAppSupport(templateSeed),
      ...previous?.whatsappSupport,
    },
    faqEntries: previous?.faqEntries?.length ? previous.faqEntries : getDefaultFaqEntries(templateSeed),
    homepageSectionVisibility: normalizeHomepageSectionVisibility(
      templateProfile.templateId,
      previous?.homepageSectionVisibility ?? createDefaultHomepageSectionVisibility(templateProfile.templateId),
    ),
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

function applyBlankHomepageComposition(pages: StorePage[], draft: DraftState): StorePage[] {
  if (draft.onboardingMode !== "blank") {
    return pages;
  }

  const selectedBlocks = getOrderedStarterBlockSelections(draft.blankBusinessFamily, draft.starterBlockSelections);

  const homepageBlocks = selectedBlocks.map((blockType, index) => {
    const block = createRegistryDefaultBlock(blockType as StorePageBlock["type"], index);
    const selectedVariant = draft.starterVariantSelections[blockType];

    if (block.type !== "hero") {
      return {
        ...block,
        layoutVariant: selectedVariant || block.layoutVariant,
      };
    }

    return {
      ...block,
      layoutVariant: selectedVariant || block.layoutVariant,
      props: {
        ...block.props,
        tagline: draft.heroTagline,
        title: draft.heroTitle,
        highlight: draft.heroHighlight,
        subtitle: draft.heroSubtitle,
        mediaUrl: draft.heroMediaUrl,
        mediaType: draft.heroMediaUrl ? "image" as const : undefined,
      },
    };
  });

  return pages.map((page) => (
    page.isHomepage
      ? {
          ...page,
          blocks: homepageBlocks,
        }
      : page
  ));
}

function buildPreviewStore(
  draft: DraftState,
  activeStoreId: string,
  themePackages: ThemePackageDefinition[],
  templateSeeds: StorefrontTemplateSeedDefinition[] = fallbackStorefrontTemplateSeeds,
): Store {
  const templateProfile = resolveStorefrontTemplateProfile(draft.templateId, { templateSeedId: draft.templateId });
  const seedDefinition = templateProfile.seedDefinition;
  const themePackage = resolveThemePackageById(draft.themePackageId, themePackages, seedDefinition.defaultTheme.presetId);
  const templatePages = applyHomepageSectionVisibilityToPages(
      applyCatalogModeToPages(
        applyBlankHomepageComposition(
        applyHeroToPages(instantiateStorePagesFromTemplate(templateProfile), draft),
          draft,
        ),
        draft,
    ),
    templateProfile.templateId,
    draft.homepageSectionVisibility,
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
      id: "layout",
      title: "Homepage sections",
      description: "Choose optional template sections to show on launch.",
      visible: true,
      icon: Layers,
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
  const [templateSeeds, setTemplateSeeds] = useState<StorefrontTemplateSeedDefinition[]>(fallbackStorefrontTemplateSeeds);
  const [themePackages, setThemePackages] = useState<ThemePackageDefinition[]>(fallbackThemePackages);
  const [draft, setDraft] = useState<DraftState>(() => draftFromTemplateSeed(getDefaultTemplateSeedId(), fallbackThemePackages));
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
  const [previewMode, setPreviewMode] = useState<PreviewDockMode>("closed");

  const activeTemplateProfile = useMemo(
    () => resolveStorefrontTemplateProfile(draft.templateId, { templateSeedId: draft.templateId }),
    [draft.templateId],
  );
  const onboardingContext = useMemo(
    () => getOnboardingContextCopy(draft.templateId, draft.catalogMode, templateSeeds),
    [templateSeeds, draft.templateId, draft.catalogMode],
  );
  const availableCatalogModes = useMemo(() => {
    const allowed = onboardingContext.behavior.allowedCatalogModes;
    return allowed === "all" ? onboardingCatalogModes : allowed;
  }, [onboardingContext.behavior.allowedCatalogModes]);
  const showDeliveryFields = onboardingContext.behavior.showDeliveryFields;
  const showLeadContactFields = onboardingContext.behavior.showLeadContactFields;
  const showMapFields = onboardingContext.behavior.showMapFields;
  const showWhatsAppFields = onboardingContext.behavior.showWhatsAppFields;
  const steps = useMemo(() => {
    const allSteps = activeTemplateProfile.seedDefinition.onboarding.steps;
    if (!guideMode) {
      return allSteps;
    }
    return allSteps.filter((step) => step.id === "brand" || step.id === "content" || step.id === "launch");
  }, [activeTemplateProfile.seedDefinition.onboarding.steps, guideMode]);
  const requestedStepIndex = useMemo(() => {
    if (!requestedStepId) return 0;
    const index = steps.findIndex((step) => step.id === requestedStepId);
    return index >= 0 ? index : 0;
  }, [requestedStepId, steps]);
  const activeStep = steps[activeIndex] ?? steps[0];
  const previewStore = useMemo(
    () => buildPreviewStore(draft, activeStoreId ?? "preview-store", themePackages, templateSeeds),
    [draft, activeStoreId, templateSeeds, themePackages],
  );
  const contentSections = useMemo(
    () => getContentSectionCards(onboardingContext),
    [onboardingContext],
  );
  const optionalHomepageSections = useMemo(
    () => getOptionalTemplateHomepageSectionChoices(activeTemplateProfile.templateId),
    [activeTemplateProfile.templateId],
  );
  const enabledHomepageSections = useMemo(
    () => optionalHomepageSections.filter((section) => draft.homepageSectionVisibility[section.type] ?? true),
    [draft.homepageSectionVisibility, optionalHomepageSections],
  );
  const hiddenHomepageSections = useMemo(
    () => optionalHomepageSections.filter((section) => !(draft.homepageSectionVisibility[section.type] ?? true)),
    [draft.homepageSectionVisibility, optionalHomepageSections],
  );
  const blankBlockChoices = useMemo(() => {
    if (draft.onboardingMode !== "blank") {
      return [];
    }

    const compatibleBlocks = fallbackBlockRegistry.filter((block) => {
      if (!block.compatibleBusinessFamilies.includes(draft.blankBusinessFamily)) {
        return false;
      }

      return block.requiredCapabilities.every((capability) => getBlankCapabilities(draft.blankBusinessFamily).includes(capability));
    });

    return buildBlankBlockSuggestions(
      compatibleBlocks,
      draft.blankBusinessFamily,
      activeTemplateProfile.seedDefinition.recommendedBlockSet,
    );
  }, [activeTemplateProfile.seedDefinition.recommendedBlockSet, draft.blankBusinessFamily, draft.onboardingMode]);
  const orderedStarterBlocks = useMemo(
    () => getOrderedStarterBlockSelections(draft.blankBusinessFamily, draft.starterBlockSelections),
    [draft.blankBusinessFamily, draft.starterBlockSelections],
  );
  const selectedBlankBlockChoices = useMemo(() => {
    if (draft.onboardingMode !== "blank") {
      return [];
    }

    const byType = new Map(blankBlockChoices.map((block) => [block.value, block]));
    return orderedStarterBlocks
      .map((blockType) => byType.get(blockType as any))
      .filter((block): block is BlankBlockSuggestion => Boolean(block));
  }, [blankBlockChoices, draft.onboardingMode, orderedStarterBlocks]);
  const blankBuilderChecklist = useMemo(
    () => buildBlankBuilderChecklist(draft, orderedStarterBlocks),
    [draft, orderedStarterBlocks],
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
    return resolveStorefrontTemplateProfile(previewModalTemplateId, { templateSeedId: previewModalTemplateId });
  }, [previewModalTemplateId]);

  const previewModalDraft = useMemo(() => {
    if (!previewModalTemplateId) return null;
    return draftFromTemplateSeed(previewModalTemplateId, themePackages);
  }, [previewModalTemplateId, themePackages]);

  const previewModalStore = useMemo(() => {
    if (!previewModalDraft) return null;
    return buildPreviewStore(previewModalDraft, "preview-modal-store", themePackages, templateSeeds);
  }, [previewModalDraft, themePackages, templateSeeds]);

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
  const templateEditingEnabled = getFeatureEnabled(entitlements?.featureMap, "cms_pages", true);
  const themePresetsEnabled = getFeatureEnabled(entitlements?.featureMap, "theme_presets", true);
  const launchAction = useMemo(
    () => getPrimaryCatalogAction(draft.templateId, draft.catalogMode),
    [draft.templateId, draft.catalogMode],
  );

  useEffect(() => {
    if (requestedStoreId && requestedStoreId !== contextStoreId) {
      setActiveStoreId(requestedStoreId);
    }
  }, [contextStoreId, requestedStoreId, setActiveStoreId]);

  useEffect(() => {
    setActiveIndex(requestedStepIndex);
    setSlugAvailable(true);
    setSlugChecking(false);
    setSaving(false);
    setInitialSetupCompleted(false);
    setCompletionState(null);
    setTemplateSeeds(fallbackStorefrontTemplateSeeds);
    setThemePackages(fallbackThemePackages);
    setDraft(draftFromTemplateSeed(getDefaultTemplateSeedId(), fallbackThemePackages));
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
          setDraft(draftFromTemplateSeed(getDefaultTemplateSeedId(), fallbackThemePackages));
          setLoading(false);
        }
        return;
      }

      if (active) {
        setLoading(true);
      }
      try {
        const [loadedThemePackages] = await Promise.all([
          loadThemePackages(supabase, activeStoreId),
        ]);
        if (!active) return;
        setTemplateSeeds(fallbackStorefrontTemplateSeeds);
        setThemePackages(loadedThemePackages);

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
          supabase.from("site_settings").select("key, value").eq("store_id", activeStoreId as string).in("key", ["payment_settings", "onboarding_status", "storefront_profile", "homepage_section_visibility", "contact_page", "delivery_settings", "whatsapp_support", "faq_entries", "catalog_seed_metadata"]),
          supabase
            .from("store_business_profiles")
            .select("template_id, business_family, catalog_mode")
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
        const homepageSectionVisibilitySetting = siteSettingsRows.find((entry) => entry.key === "homepage_section_visibility")?.value ?? {};
        const contactPageSetting = ((siteSettingsRows.find((entry) => entry.key === "contact_page")?.value ?? {}) as Partial<DraftState["contactPage"]>);
        const deliverySetting = ((siteSettingsRows.find((entry) => entry.key === "delivery_settings")?.value ?? {}) as Record<string, unknown>);
        const whatsappSupportSetting = ((siteSettingsRows.find((entry) => entry.key === "whatsapp_support")?.value ?? {}) as Partial<DraftState["whatsappSupport"]>);
        const faqEntriesSetting = (siteSettingsRows.find((entry) => entry.key === "faq_entries")?.value ?? []) as unknown;
        const catalogSeedMetadataSetting = siteSettingsRows.find((entry) => entry.key === "catalog_seed_metadata")?.value ?? null;
        const onboardingStatus = (siteSettingsRows.find((entry) => entry.key === "onboarding_status")?.value ?? {}) as {
          completed?: boolean;
          completed_at?: string | null;
          completed_via?: string | null;
        };
        const businessProfile = businessProfileResult?.data as {
          template_id?: string;
          business_family?: DraftState["businessFamily"];
          catalog_mode?: DraftState["catalogMode"];
        } | null;
        const templateProfile = resolveStorefrontTemplateProfile(
          storefrontProfileSetting?.template_id,
          {
            templateSeedId: typeof businessProfile?.template_id === "string"
              ? businessProfile.template_id
              : typeof storefrontProfileSetting?.template_id === "string"
                ? storefrontProfileSetting.template_id
                : store?.store_type ?? getDefaultTemplateSeedId(fallbackStorefrontTemplateSeeds),
            productVisibility: typeof storefrontProfileSetting?.product_visibility === "string"
              ? storefrontProfileSetting.product_visibility
              : null,
          },
        );
        const { templateSeed: safeTemplateSeed, seedDefinition: safeSeedDefinition } = getTemplateSeedDefaults(
          templateProfile.templateId,
          fallbackStorefrontTemplateSeeds,
        );
        const hasCompletedInitialSetup = Boolean(
          store?.is_published
          || (onboardingStatus?.completed && onboardingStatus?.completed_via === "publish")
          || (onboardingStatus?.completed_at && onboardingStatus?.completed_via === "publish"),
        );

        if (!active) return;
        setInitialSetupCompleted(hasCompletedInitialSetup);
        setCatalogSeedMetadata(isTemplateSeedMetadata(catalogSeedMetadataSetting) ? catalogSeedMetadataSetting as Record<string, unknown> : null);
        setDraft(draftFromTemplateSeed(templateProfile.templateId, loadedThemePackages, {
          storeName: store?.name || getTemplateSeedDraftStoreName(safeTemplateSeed),
          slug: store?.slug || createStoreSlug(store?.name || getTemplateSeedDraftStoreName(safeTemplateSeed)),
          customDomain: store?.custom_domain || "",
          description: store?.description || undefined,
          logoUrl: store?.logo_url || "",
          onboardingMode: storefrontProfileSetting?.onboarding_mode === "blank" ? "blank" : safeSeedDefinition.onboardingMode,
          blankBusinessFamily:
            storefrontProfileSetting?.onboarding_mode === "blank"
              && (storefrontProfileSetting?.blank_business_family === "commerce"
                || storefrontProfileSetting?.blank_business_family === "booking"
                || storefrontProfileSetting?.blank_business_family === "listing"
                || storefrontProfileSetting?.blank_business_family === "service")
              ? storefrontProfileSetting.blank_business_family
              : safeSeedDefinition.businessFamily,
          starterBlockSelections: Array.isArray(storefrontProfileSetting?.starter_block_selections)
            ? storefrontProfileSetting.starter_block_selections.filter((value): value is string => typeof value === "string")
            : undefined,
          starterVariantSelections:
            typeof storefrontProfileSetting?.starter_variant_selections === "object" && storefrontProfileSetting.starter_variant_selections
              ? Object.fromEntries(
                  Object.entries(storefrontProfileSetting.starter_variant_selections as Record<string, unknown>)
                    .filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"),
                )
              : undefined,
          businessFamily: businessProfile?.business_family || safeSeedDefinition.businessFamily,
          catalogMode: businessProfile?.catalog_mode || safeSeedDefinition.catalogMode,
          themePackageId: theme?.theme_package_id || theme?.preset_id || safeSeedDefinition.defaultTheme.presetId,
          themeMode: theme?.mode || undefined,
          headingFont: theme?.typography?.headingFont || undefined,
          bodyFont: theme?.typography?.bodyFont || undefined,
          borderRadius: theme?.components?.borderRadius || undefined,
          customCssVars: theme?.colors || {},
          payment: {
            ...getTemplatePaymentDefaultsFromCollection(safeTemplateSeed.id, fallbackStorefrontTemplateSeeds),
            ...payment,
            bkash_number: payment.bkash_number || "",
            nagad_number: payment.nagad_number || "",
          },
          contactPage: {
            ...getDefaultContactPage(safeTemplateSeed),
            ...contactPageSetting,
          },
          delivery: {
            ...getDefaultDeliverySettings(safeTemplateSeed),
            enabled: Boolean(deliverySetting.enabled),
            primaryZoneLabel: typeof deliverySetting.primary_zone_label === "string" ? deliverySetting.primary_zone_label : getDefaultDeliverySettings(safeTemplateSeed).primaryZoneLabel,
            secondaryZoneLabel: typeof deliverySetting.secondary_zone_label === "string" ? deliverySetting.secondary_zone_label : getDefaultDeliverySettings(safeTemplateSeed).secondaryZoneLabel,
            deliveryFee: typeof deliverySetting.delivery_fee === "number" ? deliverySetting.delivery_fee : getDefaultDeliverySettings(safeTemplateSeed).deliveryFee,
            deliveryFeeOutside: typeof deliverySetting.delivery_fee_outside === "number" ? deliverySetting.delivery_fee_outside : getDefaultDeliverySettings(safeTemplateSeed).deliveryFeeOutside,
            freeThreshold: typeof deliverySetting.free_threshold === "number" ? deliverySetting.free_threshold : getDefaultDeliverySettings(safeTemplateSeed).freeThreshold,
          },
          whatsappSupport: {
            ...getDefaultWhatsAppSupport(safeTemplateSeed),
            ...whatsappSupportSetting,
          },
          faqEntries: Array.isArray(faqEntriesSetting)
            ? faqEntriesSetting
                .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
                .map((entry) => ({
                  q: typeof entry.q === "string" ? entry.q : "",
                  a: typeof entry.a === "string" ? entry.a : "",
                }))
            : getDefaultFaqEntries(safeTemplateSeed),
          homepageSectionVisibility: normalizeHomepageSectionVisibility(
            templateProfile.templateId,
            homepageSectionVisibilitySetting,
          ),
          isPublished: store?.is_published ?? false,
        }, fallbackStorefrontTemplateSeeds));
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

  const updateBlankBusinessFamily = (businessFamily: DraftState["blankBusinessFamily"]) => {
    setDraft((current) => ({
      ...current,
      blankBusinessFamily: businessFamily,
      businessFamily,
      catalogMode: getBlankCatalogMode(businessFamily),
      starterBlockSelections: sortStarterBlockSelections(getBlankDefaultBlockSelections(businessFamily), businessFamily),
      starterVariantSelections: {},
    }));
  };

  const toggleStarterBlockSelection = (blockType: string) => {
    setDraft((current) => {
      const requiredDefaults = new Set(getBlankDefaultBlockSelections(current.blankBusinessFamily));
      if (requiredDefaults.has(blockType)) {
        return current;
      }

      const selections = current.starterBlockSelections.includes(blockType)
        ? current.starterBlockSelections.filter((value) => value !== blockType)
        : [...current.starterBlockSelections, blockType];

      const nextVariants = { ...current.starterVariantSelections };
      if (!selections.includes(blockType)) {
        delete nextVariants[blockType];
      }

        return {
          ...current,
          starterBlockSelections: sortStarterBlockSelections(selections, current.blankBusinessFamily),
          starterVariantSelections: nextVariants,
        };
      });
    };

  const restoreRecommendedStarterSelections = () => {
    setDraft((current) => {
      const nextSelections = sortStarterBlockSelections(
        [
          ...getBlankDefaultBlockSelections(current.blankBusinessFamily),
          ...current.starterBlockSelections,
        ],
        current.blankBusinessFamily,
      );

      return {
        ...current,
        starterBlockSelections: nextSelections,
      };
    });
  };

  const moveStarterBlockSelection = (blockType: string, direction: "up" | "down") => {
    setDraft((current) => {
      const requiredDefaults = new Set(getBlankDefaultBlockSelections(current.blankBusinessFamily));
      if (requiredDefaults.has(blockType)) {
        return current;
      }

      const optionalSelections = current.starterBlockSelections.filter((value) => !requiredDefaults.has(value));
      const currentIndex = optionalSelections.indexOf(blockType);

      if (currentIndex < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= optionalSelections.length) {
        return current;
      }

      const nextSelections = [...optionalSelections];
      [nextSelections[currentIndex], nextSelections[targetIndex]] = [nextSelections[targetIndex], nextSelections[currentIndex]];

      return {
        ...current,
        starterBlockSelections: [
          ...getBlankDefaultBlockSelections(current.blankBusinessFamily),
          ...nextSelections,
        ],
      };
    });
  };

  const updateStarterVariantSelection = (blockType: string, variantId: string) => {
    setDraft((current) => ({
      ...current,
      starterVariantSelections: {
        ...current.starterVariantSelections,
        [blockType]: variantId,
      },
    }));
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

  const updateHomepageSectionVisibility = (type: string, enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      homepageSectionVisibility: {
        ...current.homepageSectionVisibility,
        [type]: enabled,
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
        draft.templateId,
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

  const applyTemplateSeed = (templateId: string) => {
    setDraft((current) =>
      draftFromTemplateSeed(templateId, themePackages, {
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
        onboardingMode: getTemplateSeedDefaults(templateId, templateSeeds).seedDefinition.onboardingMode,
        blankBusinessFamily: current.blankBusinessFamily,
        starterBlockSelections: current.starterBlockSelections,
        starterVariantSelections: current.starterVariantSelections,
        payment: {
          ...getTemplatePaymentDefaultsFromCollection(templateId, templateSeeds),
          bkash_number: current.payment.bkash_number,
          nagad_number: current.payment.nagad_number,
        },
        contactPage: current.contactPage,
        delivery: current.delivery,
        whatsappSupport: current.whatsappSupport,
        faqEntries: current.faqEntries,
        homepageSectionVisibility: normalizeHomepageSectionVisibility(
          resolveStorefrontTemplateProfile(templateId, { templateSeedId: templateId }).templateId,
          current.homepageSectionVisibility,
        ),
        isPublished: current.isPublished,
      }, templateSeeds),
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

      const { templateSeed: selectedTemplateSeed, seedDefinition } = getTemplateSeedDefaults(draft.templateId, templateSeeds);
      const templateProfile = resolveStorefrontTemplateProfile(draft.templateId, {
        templateSeedId: selectedTemplateSeed.id,
        productVisibility: typeof (seedDefinition.defaultSiteSettings.storefront_profile as Record<string, unknown> | undefined)?.product_visibility === "string"
          ? (seedDefinition.defaultSiteSettings.storefront_profile as Record<string, string>).product_visibility
          : null,
      });
      const selectedThemePackage = resolveThemePackageById(draft.themePackageId, themePackages, seedDefinition.defaultTheme.presetId);
        const pages = buildPreviewStore(
          { ...draft, isPublished: publish },
          activeStoreId,
          themePackages,
          templateSeeds,
        ).pages;

      const { error: storeError } = await supabase.from("stores").update(
        {
          name: draft.storeName.trim() || getTemplateSeedDraftStoreName(selectedTemplateSeed),
          slug: draft.slug.trim() || createStoreSlug(draft.storeName.trim() || getTemplateSeedDraftStoreName(selectedTemplateSeed)),
          description: draft.description.trim() || seedDefinition.storeDescription,
          store_type: templateProfile.templateSeedId,
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
          name: draft.storeName.trim() || getTemplateSeedDraftStoreName(selectedTemplateSeed),
          slug: draft.slug.trim() || createStoreSlug(draft.storeName.trim() || getTemplateSeedDraftStoreName(selectedTemplateSeed)),
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
        templateSeed: selectedTemplateSeed,
        ownerId: user.id,
        themePackages,
      });

      if (persistResult.error) {
        toast.error(`Failed to save storefront setup: ${persistResult.error.message || "Unknown persistence error"}`);
        return;
      }

      await refreshStorefrontContentCache(supabase, activeStoreId);

      const siteSettingsRows = buildStorefrontTemplateSiteSettingsEntries(templateProfile.seedDefinition, {
        storefront_profile: {
          ...(((templateProfile.seedDefinition.defaultSiteSettings.storefront_profile as Record<string, unknown> | undefined) ?? {})),
          template_id: templateProfile.templateId,
          onboarding_mode: draft.onboardingMode,
          blank_business_family: draft.blankBusinessFamily,
          starter_block_selections: draft.starterBlockSelections,
          starter_variant_selections: draft.starterVariantSelections,
        } as Json,
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
        homepage_section_visibility: normalizeHomepageSectionVisibility(
          templateProfile.templateId,
          draft.homepageSectionVisibility,
        ) as unknown as Json,
        onboarding_status: {
          completed: publish,
          completed_at: publish ? new Date().toISOString() : null,
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
        toast.error("Failed to save template defaults.");
        return;
      }

      await supabase
        .from("store_business_profiles")
        .upsert(
          {
            store_id: activeStoreId,
            template_id: templateProfile.templateSeedId,
            business_family: templateProfile.businessFamily,
            catalog_mode: templateProfile.catalogMode,
            enabled_modules: templateProfile.seedDefinition.capabilities,
          },
          { onConflict: "store_id" },
        );

      setDraft((current) => ({ ...current, isPublished: publish }));
      setInitialSetupCompleted(publish);
      setCompletionState({
        published: publish,
        templateId: draft.templateId,
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
    const homepageSectionsHref = buildSiteSettingsPath("template_features", activeStoreId);
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

            {optionalHomepageSections.length > 0 ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Homepage section handoff</p>
                    <p className="text-sm text-muted-foreground">
                      Core sections are already live. Optional sections can still be adjusted later without reopening first-time setup.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {enabledHomepageSections.length > 0 ? enabledHomepageSections.map((section) => (
                        <Badge key={section.type} variant="secondary">{section.label} live</Badge>
                      )) : (
                        <Badge variant="outline">No optional sections live yet</Badge>
                      )}
                      {hiddenHomepageSections.length > 0 ? hiddenHomepageSections.map((section) => (
                        <Badge key={section.type} variant="outline">{section.label} off</Badge>
                      )) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Button type="button" asChild variant="outline" className="justify-start gap-2">
                      <a href={homepageSectionsHref}>
                        <Layers className="h-4 w-4" />
                        Open Homepage Sections
                      </a>
                    </Button>
                    <Button type="button" asChild variant="outline" className="justify-start gap-2">
                      <a href={pageBuilderHref}>
                        <LayoutTemplate className="h-4 w-4" />
                        Open Page Builder
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
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

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="mx-auto max-w-6xl">
      <div className="space-y-6">
        <div className="space-y-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {onboardingContext.labels.setupBadge}
          </Badge>
          <h1 className="font-heading text-3xl font-bold text-foreground">Launch your store</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {guideMode
              ? "Use this guided pass to finish the first impression: store name, logo, hero copy, hero media, and the key intro text that merchants can refine later."
              : "A template-first setup flow that keeps the commerce engine intact while making each storefront flexible, tenant-scoped, and easier to launch with the shared template system."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
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
            {activeStep.id === "template" ? (
              <div className="grid gap-6">
                {!templateEditingEnabled ? (
                  <div className="rounded-lg border border-dashed border-border bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 shrink-0" />
                    <span>
                      Template switching is disabled for this store package right now. The current storefront still works, but changing template-driven page defaults is locked.
                    </span>
                  </div>
                ) : null}
                <div className="grid gap-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
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

                  {draft.onboardingMode === "blank" ? (
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Blank builder setup</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Start from the shared storefront shell, choose the business mode, then decide which starter sections should be live on day one.
                        </p>
                      </div>

                      <div className="grid gap-2 md:grid-cols-4">
                        {([
                          { id: "commerce", label: "Commerce", description: "Catalog and checkout first." },
                          { id: "booking", label: "Booking", description: "Reservations and availability." },
                          { id: "listing", label: "Listing", description: "Browse and inquire." },
                          { id: "service", label: "Service", description: "Packages and consultation." },
                        ] as const).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => updateBlankBusinessFamily(option.id)}
                            className={cn(
                              "rounded-xl border p-3 text-left transition-colors",
                              draft.blankBusinessFamily === option.id
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background hover:border-primary/40",
                            )}
                          >
                            <p className="text-sm font-semibold text-foreground">{option.label}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                          </button>
                        ))}
                      </div>

                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                          Hero plus the main conversion section stay in the starter set by default. Everything else here is optional and can still be changed later from onboarding and the editor.
                        </div>

                        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                          Suggestions are sorted for this business mode first, so the most suitable starter sections show up before the more optional ones.
                        </div>

                        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div data-testid="blank-builder-selection-summary">
                            <p className="text-sm font-medium text-foreground">
                              <span data-testid="blank-builder-selection-count">{orderedStarterBlocks.length}</span>{" "}
                              starter sections selected
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Keep the strongest sections first, then layer in optional sections only when they help the homepage tell a clearer story.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={restoreRecommendedStarterSelections}
                          >
                            Restore recommended mix
                          </Button>
                        </div>

                        <MerchantPreviewChecklist items={blankBuilderChecklist} className="mb-0" />

                        {selectedBlankBlockChoices.length > 0 ? (
                          <div className="rounded-xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-semibold text-foreground">Selected homepage order</p>
                              <p className="text-xs leading-5 text-muted-foreground">
                                The first rows here appear earlier on the homepage. Core starter sections stay pinned at the top, while optional sections can be reordered.
                              </p>
                            </div>
                            <div className="mt-3 grid gap-2">
                              {selectedBlankBlockChoices.map((block, index) => {
                                const requiredDefaults = new Set(getBlankDefaultBlockSelections(draft.blankBusinessFamily));
                                const isRequired = requiredDefaults.has(block.value);
                                const selectedVariantId = draft.starterVariantSelections[block.value] || block.variantIds[0];
                                const movableBlocks = selectedBlankBlockChoices.filter((item) => !requiredDefaults.has(item.value));
                                const movableIndex = movableBlocks.findIndex((item) => item.value === block.value);

                                return (
                                  <div key={block.value} className="flex items-center gap-3 rounded-lg border border-border bg-background/80 p-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                      {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">{block.label}</p>
                                        {isRequired ? <Badge variant="secondary">Core</Badge> : null}
                                        {selectedVariantId ? (
                                          <Badge variant="outline" className="bg-background/70 text-[10px]">
                                            {formatVariantLabel(selectedVariantId)}
                                          </Badge>
                                        ) : null}
                                      </div>
                                      <p className="mt-1 text-xs text-muted-foreground">{block.reason}</p>
                                    </div>
                                    {!isRequired ? (
                                      <div className="flex shrink-0 flex-col gap-1">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => moveStarterBlockSelection(block.value, "up")}
                                          disabled={movableIndex <= 0}
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => moveStarterBlockSelection(block.value, "down")}
                                          disabled={movableIndex < 0 || movableIndex >= movableBlocks.length - 1}
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-3 lg:grid-cols-2">
                        {blankBlockChoices.map((block) => {
                          const requiredDefaults = new Set(getBlankDefaultBlockSelections(draft.blankBusinessFamily));
                          const isRequired = requiredDefaults.has(block.value);
                          const isSelected = isRequired || draft.starterBlockSelections.includes(block.value);
                          const selectedVariantId = draft.starterVariantSelections[block.value] || block.variantIds[0];

                          return (
                            <div
                              key={block.value}
                              data-testid={`blank-block-card-${block.value}`}
                              data-selected={isSelected ? "true" : "false"}
                              data-required={isRequired ? "true" : "false"}
                              className={cn(
                              "rounded-xl border p-4",
                              isSelected ? "border-primary/40 bg-primary/5" : "border-border bg-background",
                              )}
                            >
                              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px] sm:items-start">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">{block.label}</p>
                                    {isRequired ? <Badge variant="secondary">Default</Badge> : null}
                                    {!isRequired ? (
                                      <Badge variant="outline" className="bg-background/70 text-[10px]">
                                        {block.relevanceLabel}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{block.description}</p>
                                  <p className="mt-2 text-xs leading-5 text-primary/90">{block.reason}</p>
                                </div>
                                <div className="space-y-2">
                                  <BlankBuilderBlockPreview
                                    blockType={block.value}
                                    variantId={selectedVariantId}
                                    draft={draft}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isSelected ? "secondary" : "outline"}
                                    disabled={isRequired}
                                    onClick={() => toggleStarterBlockSelection(block.value)}
                                    data-testid={`blank-block-toggle-${block.value}`}
                                    className="w-full"
                                  >
                                    {isRequired ? "Included" : isSelected ? "Added" : "Add"}
                                  </Button>
                                </div>
                              </div>

                              {isSelected && block.variantIds.length > 0 ? (
                                <div className="mt-3 grid gap-2">
                                  <Label className="text-xs">Layout style</Label>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {block.variantIds.map((variantId) => {
                                      const variantSelected = selectedVariantId === variantId;

                                      return (
                                        <button
                                          key={variantId}
                                          type="button"
                                          onClick={() => updateStarterVariantSelection(block.value, variantId)}
                                          data-testid={`blank-block-variant-${block.value}-${variantId}`}
                                          className={cn(
                                            "rounded-lg border p-2 text-left transition-colors",
                                            variantSelected
                                              ? "border-primary bg-primary/10"
                                              : "border-border bg-background hover:border-primary/30",
                                          )}
                                        >
                                          <BlankBuilderBlockPreview blockType={block.value} variantId={variantId} draft={draft} />
                                          <div className="mt-2 flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-foreground">
                                              {formatVariantLabel(variantId)}
                                            </span>
                                            {variantSelected ? (
                                              <Badge variant="secondary" className="text-[10px]">Selected</Badge>
                                            ) : null}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

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
                        const isCurrentActive = draft.templateId === item.value;

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
                                    if (templateEditingEnabled) applyTemplateSeed(item.value);
                                  }}
                                  disabled={!templateEditingEnabled}
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
                          Showing <span className="font-semibold text-foreground">{(templatePage - 1) * TEMPLATES_PER_PAGE + 1}</span>â€“<span className="font-semibold text-foreground">{Math.min(templatePage * TEMPLATES_PER_PAGE, filteredTemplateOptions.length)}</span> of <span className="font-semibold text-foreground">{filteredTemplateOptions.length}</span> templates
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

                {/* Interactive Live Template Preview Modal */}
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
                        {previewModalProfile?.seedDefinition.name} Template
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
                            <Eye className="h-3.5 w-3.5 text-primary" /> Template Mobile Layout
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
                          if (previewModalTemplateId && templateEditingEnabled) {
                            applyTemplateSeed(previewModalTemplateId);
                            setPreviewModalTemplateId(null);
                            toast.success(`Applied ${previewModalProfile?.seedDefinition.name} template`);
                          }
                        }}
                        disabled={!templateEditingEnabled}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Apply Template
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
                {contentSection === "layout" ? (
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">Homepage launch sections</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Navbar, hero, the main catalog or booking area, and footer stay on by default. These switches only control the extra sections available for this template.
                      </p>
                    </div>
                    {optionalHomepageSections.length === 0 ? (
                      <div className="rounded-lg border border-border bg-card p-4">
                        <p className="text-sm font-semibold text-foreground">No optional sections for this template</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          This launch flow keeps the homepage focused on the required template sections.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {optionalHomepageSections.map((section) => {
                          const enabled = draft.homepageSectionVisibility[section.type] ?? true;
                          const editorLink = getHomepageSectionEditorLink(section.editTab, activeStoreId);

                          return (
                            <HomepageSectionChoiceCard
                              key={section.type}
                              section={section}
                              enabled={enabled}
                              statusLabels={{
                                enabled: "Enabled at launch",
                                disabled: "Off by default",
                              }}
                              actionLabels={{
                                enable: "Start with this live",
                                disable: "Keep this off",
                              }}
                              onEnabledChange={(checked) => updateHomepageSectionVisibility(section.type, checked)}
                              editHint="Even after launch, this section can be turned back on and its copy can be edited from the matching tool."
                              editLink={(
                                <Link href={editorLink.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                                  {editorLink.label}
                                  <HomepageSectionLinkArrow className={homepageSectionLinkIconClassName} />
                                </Link>
                              )}
                            />
                          );
                        })}
                      </div>
                    )}
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
                {draft.onboardingMode === "blank" ? (
                  <MerchantPreviewChecklist items={blankBuilderChecklist} className="mb-0" />
                ) : null}
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setActiveIndex((current) => Math.max(0, current - 1))} disabled={!canGoBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {canGoNext ? (
            <Button type="button" data-testid="onboarding-next-step" onClick={() => setActiveIndex((current) => Math.min(steps.length - 1, current + 1))} className="gap-2 sm:self-end">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
    </div>
    <div className="fixed bottom-24 right-3 z-40 flex flex-col gap-2 sm:bottom-6 sm:right-6">
      <Button
        type="button"
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setPreviewMode(previewMode === "half" ? "closed" : "half")}
        title="Open preview panel"
      >
        {previewMode === "half" ? <ChevronsLeft className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-12 w-12 rounded-full bg-background shadow-lg"
        onClick={() => setPreviewMode(previewMode === "fullscreen" ? "closed" : "fullscreen")}
        title="Open fullscreen preview"
      >
        {previewMode === "fullscreen" ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </Button>
    </div>

    {previewMode === "half" ? (
      <div className="fixed inset-y-0 right-0 z-50 w-full border-l border-border bg-background shadow-2xl sm:w-[min(50vw,720px)]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Live Preview</p>
              <p className="text-xs text-muted-foreground">{onboardingContext.labels.previewDescription}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" onClick={() => setPreviewMode("fullscreen")}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="outline" onClick={() => setPreviewMode("closed")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <StoreProvider store={previewStore}>
              <StoreThemeScope theme={previewStore.theme}>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="truncate text-sm font-semibold text-foreground">{draft.storeName}</p>
                    <p className="truncate text-xs text-muted-foreground">/{draft.slug}</p>
                  </div>
                  <StorefrontPreviewFrame viewport="mobile" title="Onboarding storefront preview">
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
                </div>
              </StoreThemeScope>
            </StoreProvider>
          </div>
        </div>
      </div>
    ) : null}

    <Dialog open={previewMode === "fullscreen"} onOpenChange={(open) => setPreviewMode(open ? "fullscreen" : "closed")}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 left-0 top-0 rounded-none border-0 p-0">
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle>Live Preview</DialogTitle>
              <p className="text-xs text-muted-foreground">{onboardingContext.labels.previewDescription}</p>
            </div>
            <Button type="button" size="icon" variant="outline" onClick={() => setPreviewMode("closed")}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4">
          <StoreProvider store={previewStore}>
            <StoreThemeScope theme={previewStore.theme}>
              <div className="mx-auto max-w-5xl space-y-3">
                <div className="rounded-xl border border-border bg-card px-4 py-3">
                  <p className="truncate text-sm font-semibold text-foreground">{draft.storeName}</p>
                  <p className="truncate text-xs text-muted-foreground">/{draft.slug}</p>
                </div>
                <StorefrontPreviewFrame viewport="desktop" title="Onboarding storefront preview">
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
              </div>
            </StoreThemeScope>
          </StoreProvider>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
