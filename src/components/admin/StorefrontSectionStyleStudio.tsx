import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, ArrowDown, ArrowUp, CheckCircle2, Copy, LayoutPanelTop, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/auth-context";
import { createRegistryDefaultBlock } from "@/lib/cms/block-registry";
import { storePageBlockSchema, type StorePage, type StorePageBlock } from "@/lib/cms/schema";
import {
  getBasicBlockCoach,
  getBasicLayoutVariantOptions,
  getSharedBlockSuggestionInfo,
} from "@/lib/cms/storefront-editor-registry";
import { resolveStorefrontTemplateId, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { refreshStorefrontContentCache } from "@/lib/storefront-cache-client";
import { getHomepageSectionEditorLink } from "@/lib/admin-paths";
import {
  getOptionalTemplateHomepageSectionChoices,
  normalizeHomepageSectionVisibility,
} from "@/lib/cms/template-homepage-sections";
import { cn } from "@/lib/utils";
import { MerchantPreviewChecklist, type PreviewChecklistItem } from "@/components/admin/MerchantPreviewChecklist";
import {
  HomepageSectionChoiceCard,
  HomepageSectionLinkArrow,
  homepageSectionLinkIconClassName,
} from "@/components/admin/HomepageSectionChoiceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type NavigationSettings = {
  primary_links?: Array<{ label?: string; url?: string; children?: Array<{ label?: string; url?: string }> }>;
  shop_label?: string;
  shop_feature_title?: string;
  shop_feature_subtitle?: string;
  shop_feature_image?: string;
  show_search?: boolean;
  show_theme_toggle?: boolean;
  show_account?: boolean;
  show_wishlist?: boolean;
  show_cart?: boolean;
  nav_layout?: "brand-left" | "centered" | "compact";
};

type SectionDraft = {
  layoutVariant?: string;
  props: Record<string, unknown>;
  isNew?: boolean;
};

type SnapshotPageRow = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  is_homepage: boolean | null;
};

type SnapshotBlockRow = {
  id: string;
  page_id: string;
  block_type: StorePageBlock["type"];
  props: Record<string, unknown> | null;
  sort_order: number | null;
  is_visible: boolean | null;
  entrance_animation: StorePageBlock["entranceAnimation"] | null;
  hover_effect: StorePageBlock["hoverEffect"] | null;
  effect_override: boolean | null;
  layout_variant: string | null;
  custom_html: string | null;
  custom_css: string | null;
};

type StudioData = {
  homepage: StorePage | null;
  templateId: StorefrontTemplateId;
  navigation: NavigationSettings;
  homepageSectionVisibility: Record<string, boolean>;
};

const ELIGIBLE_BLOCKS: StorePageBlock["type"][] = [
  "hero",
  "promo-banner",
  "category-showcase",
  "featured-products",
  "recommended-products",
  "comparison",
  "recently-viewed",
  "rich-text",
  "social-feed",
  "video-reel",
  "faq-accordion",
  "trust-badges",
  "testimonials",
];

const NAV_LAYOUT_OPTIONS: Array<{
  id: NonNullable<NavigationSettings["nav_layout"]>;
  label: string;
  description: string;
}> = [
  {
    id: "brand-left",
    label: "Brand Left",
    description: "Classic storefront header with a familiar shopping feel.",
  },
  {
    id: "centered",
    label: "Centered Brand",
    description: "A calmer, more editorial balance for fashion, beauty, and premium storefronts.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Tighter spacing for denser catalogs where shoppers should reach products quickly.",
  },
];

async function loadStorePagesSnapshot(storeId: string): Promise<StorePage[]> {
  const [{ data: pages, error: pageError }, { data: blocks, error: blockError }] = await Promise.all([
    supabase
      .from("store_pages")
      .select("id, slug, title, seo_title, seo_description, is_homepage")
      .eq("store_id", storeId)
      .order("is_homepage", { ascending: false }),
    supabase
      .from("store_page_blocks")
      .select("id, page_id, block_type, props, sort_order, is_visible, entrance_animation, hover_effect, effect_override, layout_variant, custom_html, custom_css")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true }),
  ]);

  if (pageError) throw pageError;
  if (blockError) throw blockError;

  const blocksByPageId = new Map<string, StorePageBlock[]>();
  for (const blockRow of (blocks ?? []) as SnapshotBlockRow[]) {
    const existing = blocksByPageId.get(blockRow.page_id) ?? [];
    existing.push({
      id: blockRow.id,
      type: blockRow.block_type,
      props: (typeof blockRow.props === "object" && blockRow.props ? blockRow.props : {}) as Record<string, unknown>,
      sortOrder: typeof blockRow.sort_order === "number" ? blockRow.sort_order : 0,
      isVisible: blockRow.is_visible ?? true,
      entranceAnimation: blockRow.entrance_animation ?? "none",
      hoverEffect: blockRow.hover_effect ?? "none",
      effectOverride: blockRow.effect_override ?? false,
      layoutVariant: blockRow.layout_variant ?? undefined,
      customHtml: blockRow.custom_html ?? undefined,
      customCss: blockRow.custom_css ?? undefined,
    } as StorePageBlock);
    blocksByPageId.set(blockRow.page_id, existing);
  }

  return ((pages ?? []) as SnapshotPageRow[]).map((pageRow) => ({
    id: pageRow.id,
    slug: pageRow.slug,
    title: pageRow.title,
    seoTitle: pageRow.seo_title ?? undefined,
    seoDescription: pageRow.seo_description ?? undefined,
    isHomepage: pageRow.is_homepage ?? false,
    blocks: (blocksByPageId.get(pageRow.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

function PreviewShell({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary";
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border p-2", tone === "primary" ? "border-primary/20 bg-primary/5" : "border-border bg-muted/20")}>
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

function BlockPreview({
  blockType,
  variantId,
  props,
}: {
  blockType: StorePageBlock["type"];
  variantId?: string;
  props?: Record<string, unknown>;
}) {
  const title = typeof props?.title === "string" && props.title.trim() ? props.title : getBlockLabel(blockType);
  const subtitle = typeof props?.subtitle === "string" && props.subtitle.trim()
    ? props.subtitle
    : typeof props?.tagline === "string" && props.tagline.trim()
      ? props.tagline
      : "";
  const ctaText = typeof props?.ctaText === "string" ? props.ctaText.trim() : "";
  const mediaUrl = typeof props?.mediaUrl === "string" ? props.mediaUrl.trim() : "";
  const imageCount = Array.isArray(props?.images) ? props.images.length : 0;
  const faqCount = Array.isArray(props?.faqs) ? props.faqs.length : 0;
  const badgeCount = Array.isArray(props?.badges) ? props.badges.length : 0;
  const reviewCount = Array.isArray(props?.reviews) ? props.reviews.length : 0;
  const specCount = Array.isArray(props?.specLabels) ? props.specLabels.length : 0;

  if (blockType === "hero") {
    if (variantId === "split") {
      return (
        <PreviewShell tone="primary">
          <div className="grid grid-cols-[1.1fr_0.9fr] gap-2">
            <div className="space-y-1.5 rounded-md bg-background p-2">
              <div className="h-2 w-10 rounded-full bg-primary/35" />
              <div className="line-clamp-2 text-[11px] font-semibold leading-4 text-foreground">{title}</div>
              <div className="line-clamp-2 text-[10px] leading-4 text-muted-foreground">{subtitle || "Balanced story with media and copy side by side."}</div>
              <div className="inline-flex h-5 max-w-full items-center rounded-full bg-primary/25 px-2 text-[10px] font-medium text-primary">
                {ctaText || "Shop now"}
              </div>
            </div>
            <div className="rounded-md bg-primary/15 p-2 text-[10px] text-primary/80">
              {mediaUrl ? "Media ready" : "Add media for stronger impact"}
            </div>
          </div>
        </PreviewShell>
      );
    }

    if (variantId === "centered") {
      return (
        <PreviewShell tone="primary">
          <div className="rounded-md bg-background px-3 py-4 text-center">
            <div className="mx-auto h-2 w-10 rounded-full bg-primary/35" />
            <div className="mx-auto mt-2 line-clamp-2 max-w-[90%] text-[11px] font-semibold leading-4 text-foreground">{title}</div>
            <div className="mx-auto mt-1 line-clamp-2 max-w-[80%] text-[10px] leading-4 text-muted-foreground">{subtitle || "Quiet centered message with one clear action."}</div>
            <div className="mx-auto mt-3 inline-flex h-5 items-center rounded-full bg-primary/25 px-2 text-[10px] font-medium text-primary">
              {ctaText || "Explore"}
            </div>
          </div>
        </PreviewShell>
      );
    }

    return (
      <PreviewShell tone="primary">
        <div className="rounded-md bg-background p-3">
          <div className="h-2 w-10 rounded-full bg-primary/35" />
          <div className="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-foreground">{title}</div>
          <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{subtitle || "Lead with your main promise and strongest next action."}</div>
          <div className="mt-3 inline-flex h-5 items-center rounded-full bg-primary/25 px-2 text-[10px] font-medium text-primary">
            {ctaText || "Shop now"}
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "featured-products") {
    const isSidebar = variantId === "3-col-sidebar-left" || variantId === "3-col-sidebar-right";
    const columnCount = variantId === "2-col" ? 2 : variantId === "4-col" ? 4 : 3;
    return (
      <PreviewShell>
        <div className={cn("grid gap-2", isSidebar ? "grid-cols-[0.4fr_1fr]" : "")}>
          {isSidebar && variantId === "3-col-sidebar-left" ? <div className="rounded-md bg-background/80" /> : null}
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
            {Array.from({ length: columnCount }).map((_, index) => (
              <div key={index} className="space-y-1 rounded-md bg-background p-1.5">
                <div className="aspect-[4/5] rounded bg-primary/10" />
                <div className="line-clamp-1 text-[10px] font-medium text-foreground">{title}</div>
                <div className="line-clamp-1 text-[9px] text-muted-foreground">{subtitle || `${normalizeFieldValue(props?.limit) || columnCount} items highlighted`}</div>
              </div>
            ))}
          </div>
          {isSidebar && variantId === "3-col-sidebar-right" ? <div className="rounded-md bg-background/80" /> : null}
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "category-showcase") {
    return (
      <PreviewShell>
        <div className={cn(variantId === "compact-list" ? "space-y-1.5" : "grid grid-cols-3 gap-1.5")}>
          {Array.from({ length: 3 }).map((_, index) => (
            variantId === "compact-list" ? (
              <div key={index} className="flex items-center gap-2 rounded-md bg-background p-1.5">
                <div className="h-7 w-7 rounded bg-primary/10" />
                <div className="line-clamp-1 flex-1 text-[10px] text-foreground">{title}</div>
              </div>
            ) : (
              <div key={index} className="rounded-md bg-background p-1.5">
                <div className="aspect-square rounded bg-primary/10" />
                <div className="mt-1 line-clamp-1 text-[9px] text-foreground">{title}</div>
              </div>
            )
          ))}
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "promo-banner") {
    return (
      <PreviewShell tone="primary">
        <div className="rounded-md bg-primary/15 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="h-2 w-8 rounded-full bg-primary/35" />
              <div className="line-clamp-2 text-[11px] font-semibold leading-4 text-foreground">{title}</div>
            </div>
            <div className="inline-flex h-5 items-center rounded-full bg-background/80 px-2 text-[10px] text-foreground">
              {ctaText || "Offer"}
            </div>
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "comparison") {
    return (
      <PreviewShell>
        <div className="space-y-2 rounded-md bg-background p-2">
          <div className="line-clamp-1 text-[11px] font-semibold text-foreground">{title}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-md border border-border bg-muted/20 p-1.5">
                <div className="h-8 rounded bg-primary/10" />
                <div className="mt-1 line-clamp-1 text-[9px] text-foreground">Option {index + 1}</div>
                <div className="mt-1 text-[8px] text-muted-foreground">{specCount || 4} spec points</div>
              </div>
            ))}
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "recommended-products" || blockType === "recently-viewed") {
    return (
      <PreviewShell>
        <div className="rounded-md bg-background p-2">
          <div className="line-clamp-1 text-[11px] font-semibold text-foreground">{title}</div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex-1 rounded-md bg-primary/10 p-1.5">
                <div className="aspect-square rounded bg-background/80" />
                <div className="mt-1 line-clamp-1 text-[9px] text-foreground">Product {index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "trust-badges") {
    return (
      <PreviewShell>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-md bg-background p-1.5 text-center">
              <div className="mx-auto h-5 w-5 rounded-full bg-primary/12" />
              <div className="mx-auto mt-1 line-clamp-1 text-[9px] text-foreground">{badgeCount > 0 ? `Badge ${index + 1}` : "Promise"}</div>
            </div>
          ))}
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "testimonials") {
    return (
      <PreviewShell>
        <div className="grid grid-cols-2 gap-1.5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-md bg-background p-2">
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((__, starIndex) => (
                  <div key={starIndex} className="h-2 w-2 rounded-full bg-primary/20" />
                ))}
              </div>
              <div className="mt-2 line-clamp-2 text-[9px] leading-4 text-foreground">{reviewCount > 0 ? `Review ${index + 1}` : "Customer proof goes here."}</div>
            </div>
          ))}
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "faq-accordion") {
    return (
      <PreviewShell>
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between rounded-md bg-background px-2 py-2">
              <div className="line-clamp-1 text-[9px] text-foreground">{faqCount > 0 ? `Question ${index + 1}` : "Shipping question"}</div>
              <div className="h-4 w-4 rounded-full bg-primary/12" />
            </div>
          ))}
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "social-feed") {
    return (
      <PreviewShell>
        <div className="rounded-md bg-background p-2">
          <div className="line-clamp-1 text-[11px] font-semibold text-foreground">{title}</div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="aspect-square rounded bg-primary/10 p-1 text-[8px] text-primary/80">
                {imageCount > 0 ? `Image ${index + 1}` : "Add photo"}
              </div>
            ))}
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (blockType === "video-reel") {
    return (
      <PreviewShell tone="primary">
        <div className="grid grid-cols-[0.8fr_1.2fr] gap-2 rounded-md bg-background p-2">
          <div className="rounded bg-primary/15 p-2 text-[9px] text-primary/80">{normalizeFieldValue(props?.videoUrl) ? "Video ready" : "Add video"}</div>
          <div>
            <div className="line-clamp-1 text-[11px] font-semibold text-foreground">{title}</div>
            <div className="mt-1 line-clamp-2 text-[9px] text-muted-foreground">{subtitle || "Use video when motion, texture, or scale matters."}</div>
            <div className="mt-2 inline-flex rounded-full bg-primary/20 px-2 py-1 text-[9px] text-primary">{ctaText || "Watch now"}</div>
          </div>
        </div>
      </PreviewShell>
    );
  }

  return (
    <PreviewShell>
      <div className="rounded-md bg-background p-2">
        <div className="line-clamp-1 text-[11px] font-semibold text-foreground">{title}</div>
        <div className="mt-2 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{subtitle || "Shared section preview"}</div>
      </div>
    </PreviewShell>
  );
}

function NavLayoutPreview({ layoutId }: { layoutId: NonNullable<NavigationSettings["nav_layout"]> }) {
  return (
    <PreviewShell tone="primary">
      <div className="rounded-md bg-background px-2 py-2">
        {layoutId === "centered" ? (
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="flex gap-1">
              <div className="h-2 w-8 rounded-full bg-muted-foreground/20" />
              <div className="h-2 w-8 rounded-full bg-muted-foreground/15" />
            </div>
            <div className="mx-auto h-3 w-14 rounded-full bg-primary/25" />
            <div className="ml-auto flex gap-1">
              <div className="h-5 w-5 rounded-full bg-muted" />
              <div className="h-5 w-5 rounded-full bg-muted" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="h-3 w-14 rounded-full bg-primary/25" />
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-7 rounded-full bg-muted-foreground/20" />
              <div className="h-2 w-7 rounded-full bg-muted-foreground/15" />
              {layoutId !== "compact" ? <div className="h-2 w-7 rounded-full bg-muted-foreground/15" /> : null}
            </div>
            <div className="flex gap-1">
              <div className="h-5 w-5 rounded-full bg-muted" />
              <div className="h-5 w-5 rounded-full bg-muted" />
            </div>
          </div>
        )}
      </div>
    </PreviewShell>
  );
}

function getBlockLabel(blockType: StorePageBlock["type"]) {
  switch (blockType) {
    case "hero":
      return "Hero";
    case "promo-banner":
      return "Promotional section";
    case "category-showcase":
      return "Category showcase";
    case "featured-products":
      return "Featured products";
    case "recommended-products":
      return "Recommended products";
    case "comparison":
      return "Comparison section";
    case "recently-viewed":
      return "Recently viewed";
    case "rich-text":
      return "Story section";
    case "social-feed":
      return "Social feed";
    case "video-reel":
      return "Video reel";
    case "faq-accordion":
      return "FAQs";
    case "trust-badges":
      return "Trust badges";
    case "testimonials":
      return "Testimonials";
    default:
      return blockType;
  }
}

function normalizeFieldValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : ""));
}

function normalizeFaqList(value: unknown): Array<{ q: string; a: string }> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    q: typeof item === "object" && item && typeof (item as { q?: unknown }).q === "string" ? (item as { q: string }).q : "",
    a: typeof item === "object" && item && typeof (item as { a?: unknown }).a === "string" ? (item as { a: string }).a : "",
  }));
}

function normalizeReviewList(value: unknown): Array<{ name: string; rating: number; comment: string }> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    name: typeof item === "object" && item && typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name : "",
    rating: typeof item === "object" && item && typeof (item as { rating?: unknown }).rating === "number" ? Math.min(5, Math.max(1, (item as { rating: number }).rating)) : 5,
    comment: typeof item === "object" && item && typeof (item as { comment?: unknown }).comment === "string" ? (item as { comment: string }).comment : "",
  }));
}

function normalizeBadgeList(value: unknown): Array<{ label: string; description: string; icon: string }> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    label: typeof item === "object" && item && typeof (item as { label?: unknown }).label === "string" ? (item as { label: string }).label : "",
    description: typeof item === "object" && item && typeof (item as { description?: unknown }).description === "string" ? (item as { description: string }).description : "",
    icon: typeof item === "object" && item && typeof (item as { icon?: unknown }).icon === "string" ? (item as { icon: string }).icon : "shield",
  }));
}

function getFieldLabel(field: string, blockType: StorePageBlock["type"]) {
  if (field === "title") return blockType === "hero" ? "Headline" : "Title";
  if (field === "subtitle") return "Supporting text";
  if (field === "tagline") return "Eyebrow";
  if (field === "source") return "Content source";
  if (field === "ctaText") return "Primary button";
  if (field === "ctaLink") return "Primary button link";
  if (field === "mediaUrl") return "Hero image or video URL";
  if (field === "videoUrl") return "Video URL";
  if (field === "eyebrow") return "Eyebrow";
  if (field === "body") return "Body text";
  if (field === "limit") return "Items to show";
  if (field === "faqs") return "FAQ entries";
  if (field === "badges") return "Trust badges";
  if (field === "reviews") return "Review entries";
  if (field === "images") return "Feed images";
  if (field === "specLabels") return "Comparison specs";
  return field;
}

function isLikelyUrl(value: string) {
  return /^(https?:\/\/|\/)/i.test(value.trim());
}

function getRecommendedPlacement(blockType: StorePageBlock["type"]) {
  switch (blockType) {
    case "hero":
      return "Keep first";
    case "promo-banner":
      return "Best near the top";
    case "category-showcase":
      return "Usually before product grids";
    case "featured-products":
      return "Core merch section";
    case "recommended-products":
    case "recently-viewed":
      return "Works later on the page";
    case "comparison":
      return "Best after product discovery";
    case "rich-text":
      return "Good between commerce sections";
    case "social-feed":
    case "testimonials":
      return "Great for mid or late page proof";
    case "video-reel":
      return "Use near story-driven sections";
    case "faq-accordion":
    case "trust-badges":
      return "Often strongest near the bottom";
    default:
      return "Place where it supports the buying flow";
  }
}

function getBlockPriority(blockType: StorePageBlock["type"]) {
  const ordered: StorePageBlock["type"][] = [
    "hero",
    "promo-banner",
    "category-showcase",
    "featured-products",
    "recommended-products",
    "comparison",
    "recently-viewed",
    "rich-text",
    "video-reel",
    "social-feed",
    "testimonials",
    "faq-accordion",
    "trust-badges",
  ];

  const index = ordered.indexOf(blockType);
  return index >= 0 ? index : ordered.length;
}

function resolveSuggestedInsertionIndex(blocks: StorePageBlock[], blockType: StorePageBlock["type"]) {
  const nextPriority = getBlockPriority(blockType);
  const index = blocks.findIndex((block) => getBlockPriority(block.type) > nextPriority);
  return index >= 0 ? index : blocks.length;
}

function validateDraftBlock(block: StorePageBlock, draft: SectionDraft) {
  const props = draft.props ?? {};
  if (draft.isNew && block.type === "hero" && !String(props.title ?? "").trim()) {
    return "Add a hero headline before saving this new hero section.";
  }
  if (draft.isNew && block.type === "promo-banner" && !String(props.title ?? "").trim()) {
    return "Add the promo title before saving this new promotional section.";
  }
  if (draft.isNew && block.type === "rich-text" && !String(props.title ?? "").trim()) {
    return "Add a heading before saving this new story section.";
  }
  if ((block.type === "hero") && ["full-bleed", "editorial", "split"].includes(draft.layoutVariant ?? "") && !String(props.mediaUrl ?? "").trim()) {
    return "This hero style needs a media image or video URL before saving.";
  }
  if (typeof props.mediaUrl === "string" && props.mediaUrl.trim() && !isLikelyUrl(props.mediaUrl)) {
    return "Hero media should use a valid image or video URL.";
  }
  if (typeof props.videoUrl === "string" && props.videoUrl.trim() && !isLikelyUrl(props.videoUrl)) {
    return "Video reel needs a valid video URL before saving.";
  }
  if (block.type === "video-reel" && !String(props.videoUrl ?? "").trim()) {
    return "Add a video URL before saving this video reel section.";
  }
  if (block.type === "promo-banner" && !String(props.title ?? "").trim()) {
    return "Add a clear promo title before saving this promotional section.";
  }
  if (block.type === "social-feed" && (!Array.isArray(props.images) || props.images.length === 0)) {
    return "Add at least one feed image before saving this social feed section.";
  }
  if (Array.isArray(props.images) && props.images.some((image) => typeof image !== "string" || !image.trim() || !isLikelyUrl(image))) {
    return "Each social feed image should use a valid URL.";
  }
  if (typeof props.ctaText === "string" && props.ctaText.trim() && !String(props.ctaLink ?? "").trim()) {
    return "Add a matching link for the call-to-action button before saving.";
  }
  if (typeof props.ctaLink === "string" && props.ctaLink.trim() && !isLikelyUrl(props.ctaLink)) {
    return "Call-to-action links should use a valid URL or storefront path.";
  }
  if (typeof props.ctaLink === "string" && props.ctaLink.trim() && !String(props.ctaText ?? "").trim()) {
    return "Add button text for the link before saving.";
  }
  if (typeof props.secondaryCtaText === "string" && props.secondaryCtaText.trim() && !String(props.secondaryCtaLink ?? "").trim()) {
    return "Add a matching link for the secondary hero button before saving.";
  }
  if (typeof props.secondaryCtaLink === "string" && props.secondaryCtaLink.trim() && !String(props.secondaryCtaText ?? "").trim()) {
    return "Add text for the secondary hero button before saving.";
  }
  if (typeof props.secondaryCtaLink === "string" && props.secondaryCtaLink.trim() && !isLikelyUrl(props.secondaryCtaLink)) {
    return "Secondary hero button links should use a valid URL or storefront path.";
  }
  if (block.type === "comparison") {
    const specLabels = normalizeStringList(props.specLabels).map((label) => label.trim()).filter(Boolean);
    if (specLabels.length < 2) {
      return "Add at least two comparison spec labels before saving this comparison section.";
    }
  }
  if (block.type === "video-reel" && !String(props.title ?? "").trim()) {
    return "Add a short video headline before saving this video reel section.";
  }
  if (block.type === "faq-accordion" && (!Array.isArray(props.faqs) || props.faqs.length === 0)) {
    return "Add at least one FAQ entry before saving this FAQ section.";
  }
  if (block.type === "faq-accordion" && normalizeFaqList(props.faqs).some((entry) => !entry.q.trim() || !entry.a.trim())) {
    return "Each FAQ entry should include both a question and an answer before saving.";
  }
  if (block.type === "trust-badges" && (!Array.isArray(props.badges) || props.badges.length === 0)) {
    return "Add at least one trust badge before saving this trust section.";
  }
  if (block.type === "trust-badges" && normalizeBadgeList(props.badges).some((badge) => !badge.label.trim() || !badge.description.trim())) {
    return "Each trust badge should include both a label and a short description before saving.";
  }
  if (block.type === "testimonials" && (!Array.isArray(props.reviews) || props.reviews.length === 0)) {
    return "Add at least one review before saving this testimonial section.";
  }
  if (block.type === "testimonials" && normalizeReviewList(props.reviews).some((review) => !review.name.trim() || !review.comment.trim())) {
    return "Each testimonial should include both a customer name and review text before saving.";
  }
  return null;
}

function buildStyleStudioChecklist(
  templateId: StorefrontTemplateId,
  blocks: StorePageBlock[],
  navigation: NavigationSettings | null,
  visibility: Record<string, boolean>,
): PreviewChecklistItem[] {
  const visibleBlocks = blocks.filter((block) => (block.isVisible ?? true) !== false);
  const heroBlock = visibleBlocks.find((block) => block.type === "hero");
  const promoBlock = visibleBlocks.find((block) => block.type === "promo-banner");
  const optionalChoices = getOptionalTemplateHomepageSectionChoices(templateId);
  const activeOptionalCount = optionalChoices.filter((choice) => visibility[choice.type] ?? true).length;
  const hasProofBlock = visibleBlocks.some((block) => ["social-feed", "testimonials", "trust-badges", "faq-accordion"].includes(block.type));
  const navLayout = navigation?.nav_layout ?? "brand-left";

  return [
    {
      label: "Homepage opens with a strong first section",
      done: Boolean(heroBlock && String(heroBlock.props?.title ?? "").trim()),
      hint: "A clear hero headline makes the rest of the page easier to understand.",
    },
    {
      label: "Chosen header style matches the storefront tone",
      done: Boolean(navLayout),
      hint: "Header style is already selected here and stays reusable across templates.",
    },
    {
      label: "Optional homepage sections feel intentional",
      done: activeOptionalCount > 0 || optionalChoices.length === 0,
      hint: optionalChoices.length === 0
        ? "This template leans on a tighter homepage structure by design."
        : activeOptionalCount > 0
          ? "Good. At least one supporting section is helping the homepage tell a fuller story."
          : "This can stay minimal, but consider turning on one supporting section if the storefront needs more context.",
    },
    {
      label: "Proof or reassurance appears somewhere on the page",
      done: hasProofBlock,
      hint: "FAQ, testimonials, trust badges, or social proof help reduce hesitation before purchase.",
    },
    {
      label: "Promotional blocks that are on have real content",
      done: !promoBlock || Boolean(String(promoBlock.props?.title ?? "").trim()),
      hint: "Promotional space should carry a real message, not just occupy visual space.",
    },
  ];
}

export function StorefrontSectionStyleStudio() {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, SectionDraft>>({});
  const [navigationDraft, setNavigationDraft] = useState<NavigationSettings | null>(null);
  const [visibilityDraft, setVisibilityDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery<StudioData>({
    queryKey: ["storefront-section-style-studio", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) throw new Error("Store context missing.");

      const [{ data: storeMeta, error: storeError }, { data: businessProfile }, { data: siteSettings }] = await Promise.all([
        supabase.from("stores").select("id, store_type").eq("id", activeStoreId).maybeSingle(),
        supabase.from("store_business_profiles").select("template_id").eq("store_id", activeStoreId).maybeSingle(),
        supabase.from("site_settings").select("key, value").eq("store_id", activeStoreId).in("key", ["navigation", "storefront_profile", "homepage_section_visibility"]),
      ]);
      if (storeError) throw storeError;

      const pages = await loadStorePagesSnapshot(activeStoreId);
      const homepage = pages.find((page) => page.isHomepage) ?? pages[0] ?? null;
      const settingsMap = (siteSettings ?? []).reduce<Record<string, unknown>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      const storefrontProfile = typeof settingsMap.storefront_profile === "object" && settingsMap.storefront_profile
        ? settingsMap.storefront_profile as Record<string, unknown>
        : {};

      return {
        homepage,
        templateId: resolveStorefrontTemplateId(storefrontProfile.template_id, {
          templateSeedId: (businessProfile as { template_id?: string | null } | null)?.template_id
            ?? (storeMeta as { store_type?: string | null } | null)?.store_type
            ?? "general-catalog",
          productVisibility: typeof storefrontProfile.product_visibility === "string" ? storefrontProfile.product_visibility : null,
        }),
        navigation: (typeof settingsMap.navigation === "object" && settingsMap.navigation ? settingsMap.navigation : {}) as NavigationSettings,
        homepageSectionVisibility: normalizeHomepageSectionVisibility(
          resolveStorefrontTemplateId(storefrontProfile.template_id, {
            templateSeedId: (businessProfile as { template_id?: string | null } | null)?.template_id
              ?? (storeMeta as { store_type?: string | null } | null)?.store_type
              ?? "general-catalog",
            productVisibility: typeof storefrontProfile.product_visibility === "string" ? storefrontProfile.product_visibility : null,
          }),
          settingsMap.homepage_section_visibility,
        ),
      };
    },
    enabled: Boolean(activeStoreId),
  });

  useEffect(() => {
    if (!data?.homepage) return;
    const nextDrafts: Record<string, SectionDraft> = {};
    for (const block of data.homepage.blocks.filter((item) => ELIGIBLE_BLOCKS.includes(item.type))) {
      nextDrafts[block.id] = {
        layoutVariant: block.layoutVariant,
        props: { ...block.props },
      };
    }
    setSectionDrafts(nextDrafts);
    setNavigationDraft({
      ...data.navigation,
      nav_layout: data.navigation.nav_layout ?? "brand-left",
    });
    setVisibilityDraft(data.homepageSectionVisibility);
  }, [data]);

  const homepageBlocks = useMemo(
    () => (data?.homepage?.blocks ?? []).filter((block) => ELIGIBLE_BLOCKS.includes(block.type)),
    [data],
  );
  const optionalSectionChoices = useMemo(
    () => getOptionalTemplateHomepageSectionChoices(data?.templateId ?? "general-catalog"),
    [data?.templateId],
  );

  const missingBlocks = useMemo(() => {
    const existingTypes = new Set(homepageBlocks.map((block) => block.type));
    const templatePriority = optionalSectionChoices.map((choice) => choice.type);
    return ELIGIBLE_BLOCKS
      .filter((type) => !existingTypes.has(type))
      .sort((left, right) => {
        const leftIndex = templatePriority.indexOf(left);
        const rightIndex = templatePriority.indexOf(right);
        if (leftIndex >= 0 || rightIndex >= 0) {
          if (leftIndex < 0) return 1;
          if (rightIndex < 0) return -1;
          if (leftIndex !== rightIndex) return leftIndex - rightIndex;
        }

        return getBlockPriority(left) - getBlockPriority(right);
      });
  }, [homepageBlocks, optionalSectionChoices]);
  const styleChecklist = useMemo(
    () => buildStyleStudioChecklist(data?.templateId ?? "general-catalog", homepageBlocks, navigationDraft, visibilityDraft),
    [data?.templateId, homepageBlocks, navigationDraft, visibilityDraft],
  );

  const updateBlockProps = (
    blockId: string,
    fallbackProps: Record<string, unknown>,
    updater: (currentProps: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    setSectionDrafts((prev) => ({
      ...prev,
      [blockId]: {
        ...(prev[blockId] ?? { props: fallbackProps }),
        props: updater((prev[blockId]?.props ?? fallbackProps) as Record<string, unknown>),
      },
    }));
  };

  const moveBlock = (blockId: string, direction: "up" | "down") => {
    if (!activeStoreId) return;
    queryClient.setQueryData<StudioData>(["storefront-section-style-studio", activeStoreId], (current) => {
      if (!current?.homepage) return current;
      const blocks = [...current.homepage.blocks];
      const index = blocks.findIndex((block) => block.id === blockId);
      if (index < 0) return current;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= blocks.length) return current;
      const [moved] = blocks.splice(index, 1);
      blocks.splice(targetIndex, 0, moved);
      return {
        ...current,
        homepage: {
          ...current.homepage,
          blocks: blocks.map((block, nextIndex) => ({
            ...block,
            sortOrder: nextIndex,
          })),
        },
      };
    });
  };

  const toggleBlockVisibility = (blockId: string) => {
    if (!activeStoreId) return;
    const targetBlock = homepageBlocks.find((block) => block.id === blockId);
    queryClient.setQueryData<StudioData>(["storefront-section-style-studio", activeStoreId], (current) => {
      if (!current?.homepage) return current;
      return {
        ...current,
        homepage: {
          ...current.homepage,
          blocks: current.homepage.blocks.map((block) =>
            block.id === blockId
              ? {
                  ...block,
                  isVisible: !(block.isVisible ?? true),
                  visible: !(block.isVisible ?? true),
                }
              : block,
          ),
        },
      };
    });

    if (targetBlock && optionalSectionChoices.some((choice) => choice.type === targetBlock.type)) {
      setVisibilityDraft((prev) => ({
        ...prev,
        [targetBlock.type]: !(targetBlock.isVisible ?? true),
      }));
    }
  };

  const updateSectionVisibility = (blockType: StorePageBlock["type"], enabled: boolean) => {
    setVisibilityDraft((prev) => ({
      ...prev,
      [blockType]: enabled,
    }));

    if (!activeStoreId) return;

    queryClient.setQueryData<StudioData>(["storefront-section-style-studio", activeStoreId], (current) => {
      if (!current?.homepage) return current;
      return {
        ...current,
        homepage: {
          ...current.homepage,
          blocks: current.homepage.blocks.map((block) =>
            block.type === blockType
              ? {
                  ...block,
                  isVisible: enabled,
                  visible: enabled,
                }
              : block,
          ),
        },
      };
    });
  };

  const duplicateBlock = (blockId: string) => {
    if (!activeStoreId) return;
    const duplicateId = crypto.randomUUID();

    queryClient.setQueryData<StudioData>(["storefront-section-style-studio", activeStoreId], (current) => {
      if (!current?.homepage) return current;
      const blocks = [...current.homepage.blocks];
      const index = blocks.findIndex((block) => block.id === blockId);
      if (index < 0) return current;
      const sourceBlock = blocks[index];
      const duplicate: StorePageBlock = {
        ...structuredClone(sourceBlock),
        id: duplicateId,
      };
      blocks.splice(index + 1, 0, duplicate);
      return {
        ...current,
        homepage: {
          ...current.homepage,
          blocks: blocks.map((block, nextIndex) => ({
            ...block,
            sortOrder: nextIndex,
          })),
        },
      };
    });

    setSectionDrafts((prev) => ({
      ...prev,
      [duplicateId]: prev[blockId]
        ? {
            ...structuredClone(prev[blockId]),
            isNew: true,
          }
        : {
            props: {},
            isNew: true,
          },
    }));
  };

  const handleAddBlock = (blockType: StorePageBlock["type"]) => {
    if (!data?.homepage || !activeStoreId) return;
    const nextBlock = createRegistryDefaultBlock(blockType, data.homepage.blocks.length);
    const firstVariant = getBasicLayoutVariantOptions(data.templateId, blockType)[0]?.id;
    const hydratedBlock: StorePageBlock = {
      ...nextBlock,
      layoutVariant: firstVariant ?? nextBlock.layoutVariant,
    };
    queryClient.setQueryData<StudioData>(["storefront-section-style-studio", activeStoreId], (current) =>
      current
          ? {
              ...current,
              homepage: current.homepage
                ? (() => {
                    const blocks = [...current.homepage.blocks];
                    const insertAt = resolveSuggestedInsertionIndex(blocks, blockType);
                    blocks.splice(insertAt, 0, hydratedBlock);
                    return {
                      ...current.homepage,
                      blocks: blocks.map((block, index) => ({
                        ...block,
                        sortOrder: index,
                      })),
                    };
                  })()
                : current.homepage,
            }
          : current,
    );
    setSectionDrafts((prev) => ({
      ...prev,
      [hydratedBlock.id]: {
        props: { ...hydratedBlock.props },
        layoutVariant: hydratedBlock.layoutVariant,
        isNew: true,
      },
    }));
  };

  const restoreRecommendedOrder = () => {
    if (!activeStoreId) return;
    queryClient.setQueryData<StudioData>(["storefront-section-style-studio", activeStoreId], (current) => {
      if (!current?.homepage) return current;
      const sorted = [...current.homepage.blocks].sort((left, right) => {
        const priorityDelta = getBlockPriority(left.type) - getBlockPriority(right.type);
        if (priorityDelta !== 0) return priorityDelta;
        return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
      });

      return {
        ...current,
        homepage: {
          ...current.homepage,
          blocks: sorted.map((block, index) => ({
            ...block,
            sortOrder: index,
          })),
        },
      };
    });
  };

  const saveChanges = async () => {
    if (!activeStoreId || !data?.homepage || !navigationDraft) return;
    const normalizedVisibility = normalizeHomepageSectionVisibility(data.templateId, visibilityDraft);
    const optionalSectionSet = new Set(optionalSectionChoices.map((choice) => choice.type));
    const homepageBlocksToSave: StorePageBlock[] = data.homepage.blocks.map((block, index) => {
      const visibilityEnabled = optionalSectionSet.has(block.type)
        ? normalizedVisibility[block.type] ?? true
        : (block.visible ?? block.isVisible ?? true);

      return storePageBlockSchema.parse({
        ...block,
        sortOrder: index,
        props: sectionDrafts[block.id]?.props ?? block.props,
        layoutVariant: sectionDrafts[block.id]?.layoutVariant ?? block.layoutVariant,
        isVisible: visibilityEnabled,
        visible: visibilityEnabled,
      });
    });

    for (const block of homepageBlocksToSave) {
      const issue = validateDraftBlock(block, sectionDrafts[block.id] ?? { props: block.props, layoutVariant: block.layoutVariant });
      if (issue) {
        toast.error(issue);
        return;
      }
    }

    setSaving(true);
    try {
      const [{ error: blockError }, { error: navigationError }, { error: visibilityError }] = await Promise.all([
        supabase.from("store_page_blocks").upsert(
          homepageBlocksToSave.map((block, index) => ({
            id: block.id,
            page_id: data.homepage!.id,
            store_id: activeStoreId,
            block_type: block.type,
            props: block.props as Json,
            sort_order: index,
            is_visible: block.isVisible ?? true,
            entrance_animation: block.entranceAnimation ?? null,
            hover_effect: block.hoverEffect ?? null,
            effect_override: block.effectOverride ?? null,
            layout_variant: block.layoutVariant ?? null,
            custom_html: block.customHtml ?? null,
            custom_css: block.customCss ?? null,
          })),
          { onConflict: "id" },
        ),
        supabase.from("site_settings").upsert(
          {
            store_id: activeStoreId,
            key: "navigation",
            value: navigationDraft,
          },
          { onConflict: "store_id,key" },
        ),
        supabase.from("site_settings").upsert(
          {
            store_id: activeStoreId,
            key: "homepage_section_visibility",
            value: normalizedVisibility as Json,
          },
          { onConflict: "store_id,key" },
        ),
      ]);

      if (blockError) throw blockError;
      if (navigationError) throw navigationError;
      if (visibilityError) throw visibilityError;

      await refreshStorefrontContentCache(supabase, activeStoreId);
      toast.success("Storefront styles updated.");
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ["site_settings", activeStoreId] });
    } catch (error: any) {
      toast.error(error?.message || "Failed to save storefront styles.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading storefront styles...
        </CardContent>
      </Card>
    );
  }

  if (!data?.homepage || !navigationDraft) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          We could not load the homepage blocks for this store yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-to-r from-primary/5 via-background to-background">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Shared style studio
            </Badge>
            <Badge variant="outline">{homepageBlocks.length} homepage sections</Badge>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">Global section styles for this storefront</CardTitle>
            <CardDescription>
              Reuse shared hero, promo, category, product, and support sections across templates while keeping the merchant flow guided.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={restoreRecommendedOrder}>
              Restore recommended order
            </Button>
          </div>
        </CardHeader>
      </Card>

      <MerchantPreviewChecklist items={styleChecklist} className="mb-0" />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutPanelTop className="h-4 w-4 text-primary" />
            Header and navigation style
          </CardTitle>
          <CardDescription>
            Choose how the shared storefront header should feel before shoppers hit the hero.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {NAV_LAYOUT_OPTIONS.map((option) => {
            const selected = (navigationDraft.nav_layout ?? "brand-left") === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setNavigationDraft((prev) => ({ ...(prev ?? {}), nav_layout: option.id }))}
                className={cn("rounded-xl border p-3 text-left transition-colors", selected ? "border-primary bg-primary/8" : "border-border bg-card hover:border-primary/30")}
              >
                <NavLayoutPreview layoutId={option.id} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {selected ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> : null}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {optionalSectionChoices.length > 0 ? (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Homepage section visibility</CardTitle>
            <CardDescription>
              Keep core sections on by default, then decide which shared supporting sections should stay live for this template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              These section switches now follow the same shared section system as the style studio. Merchants can turn sections on or off here, then adjust their content from the linked editing surface.
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {optionalSectionChoices.map((section) => {
                const enabled = visibilityDraft[section.type] ?? true;
                const editorLink = getHomepageSectionEditorLink(section.editTab, activeStoreId);

                return (
                  <HomepageSectionChoiceCard
                    key={section.type}
                    section={section}
                    enabled={enabled}
                    statusLabels={{
                      enabled: "Visible now",
                      disabled: "Hidden now",
                    }}
                    actionLabels={{
                      enable: "Show now",
                      disable: "Hide now",
                    }}
                    onEnabledChange={(checked) => updateSectionVisibility(section.type, checked)}
                    editHint="Need to refine the copy or layout too? Jump straight into the matching editing surface."
                    editLink={(
                      <a href={editorLink.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                        {editorLink.label}
                        <HomepageSectionLinkArrow className={homepageSectionLinkIconClassName} />
                      </a>
                    )}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {missingBlocks.length > 0 ? (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Suggested sections you can add next</CardTitle>
            <CardDescription>
              These are shared blocks, so merchants can add them here without switching templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {missingBlocks.map((blockType) => (
              <div key={blockType} className="rounded-xl border border-border bg-muted/20 p-3">
                {(() => {
                  const suggestion = getSharedBlockSuggestionInfo(data.templateId, blockType);
                  return (
                    <div className="mb-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={suggestion.recommended ? "secondary" : "outline"} className="text-[10px]">
                          {suggestion.headline}
                        </Badge>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
                      {suggestion.caveat ? <p className="text-[11px] leading-5 text-primary/80">{suggestion.caveat}</p> : null}
                    </div>
                  );
                })()}
                <BlockPreview
                  blockType={blockType}
                  variantId={getBasicLayoutVariantOptions(data.templateId, blockType)[0]?.id}
                  props={createRegistryDefaultBlock(blockType, 0).props}
                />
                <p className="mt-3 text-sm font-semibold text-foreground">{getBlockLabel(blockType)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{getRecommendedPlacement(blockType)}</p>
                <Button type="button" variant="outline" className="mt-3 w-full gap-2" onClick={() => handleAddBlock(blockType)}>
                  <Plus className="h-4 w-4" />
                  Add section
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {homepageBlocks.map((block) => {
          const draft = sectionDrafts[block.id] ?? { props: block.props, layoutVariant: block.layoutVariant };
          const coach = getBasicBlockCoach(data.templateId, block.type);
          const suggestion = getSharedBlockSuggestionInfo(data.templateId, block.type);
          const variants = getBasicLayoutVariantOptions(data.templateId, block.type);
          const priorityFields = Array.from(new Set([...(coach.priorityFields ?? []), ...(draft.isNew ? ["ctaLink"] : [])])).filter(Boolean);
          const blockIndex = homepageBlocks.findIndex((entry) => entry.id === block.id);
          const arrayFields = priorityFields.filter((field) => ["faqs", "badges", "reviews", "images", "specLabels"].includes(field));
          const editableFields = priorityFields.filter((field) => !arrayFields.includes(field));

            return (
              <Card key={block.id} className="border-border">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{getBlockLabel(block.type)}</CardTitle>
                      <CardDescription>{coach.tip}</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={suggestion.recommended ? "secondary" : "outline"}>
                        {suggestion.recommended ? "Template fit" : "Optional fit"}
                      </Badge>
                      <Badge variant="outline">Position {blockIndex + 1}</Badge>
                      <Badge variant={block.isVisible ?? true ? "secondary" : "outline"}>
                        {block.isVisible ?? true ? "Visible" : "Hidden"}
                      </Badge>
                      {draft.isNew ? <Badge variant="secondary">New</Badge> : null}
                    </div>
                  </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[11px]">{getRecommendedPlacement(block.type)}</Badge>
                        <span className="text-xs text-muted-foreground">{suggestion.reason}</span>
                      </div>
                      <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => toggleBlockVisibility(block.id)} className="gap-1">
                        {(block.isVisible ?? true) ? "Hide" : "Show"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => duplicateBlock(block.id)} className="gap-1">
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={blockIndex === 0} onClick={() => moveBlock(block.id, "up")} className="gap-1">
                        <ArrowUp className="h-3.5 w-3.5" />
                        Move up
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={blockIndex === homepageBlocks.length - 1} onClick={() => moveBlock(block.id, "down")} className="gap-1">
                      <ArrowDown className="h-3.5 w-3.5" />
                      Move down
                    </Button>
                  </div>
                </div>
                <BlockPreview blockType={block.type} variantId={draft.layoutVariant} props={draft.props} />
              </CardHeader>
              <CardContent className="space-y-4">
                {variants.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Style options</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {variants.map((variant) => {
                        const selected = draft.layoutVariant === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSectionDrafts((prev) => ({
                              ...prev,
                              [block.id]: {
                                ...(prev[block.id] ?? { props: block.props }),
                                layoutVariant: variant.id,
                              },
                            }))}
                            className={cn("rounded-lg border p-2 text-left transition-colors", selected ? "border-primary bg-primary/8" : "border-border bg-background hover:border-primary/30")}
                          >
                            <BlockPreview blockType={block.type} variantId={variant.id} props={draft.props} />
                            <div className="mt-2 flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-foreground">{variant.label}</p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{variant.previewSummary ?? variant.guidance}</p>
                              </div>
                              {selected ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {priorityFields.length > 0 ? (
                  <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-3">
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{coach.priorityLabel ?? "Content to review"}</p>
                        <p className="text-xs text-muted-foreground">If this section needs more context, fill it here before saving.</p>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {editableFields.map((field) => (
                        <div key={field} className="grid gap-2">
                          <Label htmlFor={`${block.id}-${field}`}>{getFieldLabel(field, block.type)}</Label>
                          {field === "body" || field === "subtitle" ? (
                            <Textarea
                              id={`${block.id}-${field}`}
                              value={normalizeFieldValue(draft.props[field])}
                              onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => ({
                                ...currentProps,
                                [field]: event.target.value,
                              }))}
                              rows={field === "body" ? 4 : 3}
                            />
                          ) : field === "source" ? (
                            <Input
                              id={`${block.id}-${field}`}
                              value={normalizeFieldValue(draft.props[field])}
                              placeholder="featured-or-all, featured, all, newest, category, or type"
                              onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => ({
                                ...currentProps,
                                [field]: event.target.value,
                              }))}
                            />
                          ) : (
                            <Input
                              id={`${block.id}-${field}`}
                              type={field === "limit" ? "number" : "text"}
                              min={field === "limit" ? 1 : undefined}
                              value={normalizeFieldValue(draft.props[field])}
                              onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => ({
                                ...currentProps,
                                [field]: field === "limit" ? Number(event.target.value || 0) || 0 : event.target.value,
                              }))}
                            />
                          )}
                        </div>
                      ))}
                      {arrayFields.length > 0 ? (
                        <div className="space-y-4 rounded-lg border border-border bg-background/80 p-3">
                          {arrayFields.includes("images") ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-foreground">Feed images</p>
                                  <p className="text-xs text-muted-foreground">Use direct image URLs for the visual grid.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                    ...currentProps,
                                    images: [...normalizeStringList(currentProps.images), ""],
                                  }))}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add image
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {normalizeStringList(draft.props.images).map((image, index) => (
                                  <div key={`image-${index}`} className="flex items-center gap-2">
                                    <Input
                                      value={image}
                                      placeholder="https://..."
                                      onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                        const nextImages = normalizeStringList(currentProps.images);
                                        nextImages[index] = event.target.value;
                                        return {
                                          ...currentProps,
                                          images: nextImages,
                                        };
                                      })}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 text-muted-foreground"
                                      onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                        ...currentProps,
                                        images: normalizeStringList(currentProps.images).filter((_, itemIndex) => itemIndex !== index),
                                      }))}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {arrayFields.includes("specLabels") ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-foreground">Comparison specs</p>
                                  <p className="text-xs text-muted-foreground">These labels shape the side-by-side comparison row.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                    ...currentProps,
                                    specLabels: [...normalizeStringList(currentProps.specLabels), ""],
                                  }))}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add spec
                                </Button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {normalizeStringList(draft.props.specLabels).map((label, index) => (
                                  <div key={`spec-${index}`} className="flex items-center gap-2">
                                    <Input
                                      value={label}
                                      placeholder="Battery life"
                                      onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                        const nextSpecs = normalizeStringList(currentProps.specLabels);
                                        nextSpecs[index] = event.target.value;
                                        return {
                                          ...currentProps,
                                          specLabels: nextSpecs,
                                        };
                                      })}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 text-muted-foreground"
                                      onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                        ...currentProps,
                                        specLabels: normalizeStringList(currentProps.specLabels).filter((_, itemIndex) => itemIndex !== index),
                                      }))}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {arrayFields.includes("faqs") ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-foreground">FAQ entries</p>
                                  <p className="text-xs text-muted-foreground">Answer the questions that block purchase confidence.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                    ...currentProps,
                                    faqs: [...normalizeFaqList(currentProps.faqs), { q: "", a: "" }],
                                  }))}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add FAQ
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {normalizeFaqList(draft.props.faqs).map((entry, index) => (
                                  <div key={`faq-${index}`} className="rounded-lg border border-border p-3">
                                    <div className="grid gap-2">
                                      <Label>Question</Label>
                                      <Input
                                        value={entry.q}
                                        onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                          const nextFaqs = normalizeFaqList(currentProps.faqs);
                                          nextFaqs[index] = { ...nextFaqs[index], q: event.target.value };
                                          return {
                                            ...currentProps,
                                            faqs: nextFaqs,
                                          };
                                        })}
                                      />
                                      <Label>Answer</Label>
                                      <Textarea
                                        value={entry.a}
                                        rows={3}
                                        onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                          const nextFaqs = normalizeFaqList(currentProps.faqs);
                                          nextFaqs[index] = { ...nextFaqs[index], a: event.target.value };
                                          return {
                                            ...currentProps,
                                            faqs: nextFaqs,
                                          };
                                        })}
                                      />
                                      <div className="flex justify-end">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="gap-1 text-muted-foreground"
                                          onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                            ...currentProps,
                                            faqs: normalizeFaqList(currentProps.faqs).filter((_, itemIndex) => itemIndex !== index),
                                          }))}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {arrayFields.includes("reviews") ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-foreground">Testimonials</p>
                                  <p className="text-xs text-muted-foreground">Use concrete customer proof instead of vague praise.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                    ...currentProps,
                                    reviews: [...normalizeReviewList(currentProps.reviews), { name: "", rating: 5, comment: "" }],
                                  }))}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add review
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {normalizeReviewList(draft.props.reviews).map((review, index) => (
                                  <div key={`review-${index}`} className="rounded-lg border border-border p-3">
                                    <div className="grid gap-3">
                                      <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                                        <div className="grid gap-2">
                                          <Label>Name</Label>
                                          <Input
                                            value={review.name}
                                            onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                              const nextReviews = normalizeReviewList(currentProps.reviews);
                                              nextReviews[index] = { ...nextReviews[index], name: event.target.value };
                                              return {
                                                ...currentProps,
                                                reviews: nextReviews,
                                              };
                                            })}
                                          />
                                        </div>
                                        <div className="grid gap-2">
                                          <Label>Rating</Label>
                                          <Input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={review.rating}
                                            onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                              const nextReviews = normalizeReviewList(currentProps.reviews);
                                              nextReviews[index] = {
                                                ...nextReviews[index],
                                                rating: Math.min(5, Math.max(1, Number(event.target.value || 5) || 5)),
                                              };
                                              return {
                                                ...currentProps,
                                                reviews: nextReviews,
                                              };
                                            })}
                                          />
                                        </div>
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Review</Label>
                                        <Textarea
                                          value={review.comment}
                                          rows={3}
                                          onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                            const nextReviews = normalizeReviewList(currentProps.reviews);
                                            nextReviews[index] = { ...nextReviews[index], comment: event.target.value };
                                            return {
                                              ...currentProps,
                                              reviews: nextReviews,
                                            };
                                          })}
                                        />
                                      </div>
                                      <div className="flex justify-end">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="gap-1 text-muted-foreground"
                                          onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                            ...currentProps,
                                            reviews: normalizeReviewList(currentProps.reviews).filter((_, itemIndex) => itemIndex !== index),
                                          }))}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {arrayFields.includes("badges") ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-foreground">Trust badges</p>
                                  <p className="text-xs text-muted-foreground">Use simple confidence markers for delivery, support, payment, or authenticity.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                    ...currentProps,
                                    badges: [...normalizeBadgeList(currentProps.badges), { label: "", description: "", icon: "shield" }],
                                  }))}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add badge
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {normalizeBadgeList(draft.props.badges).map((badge, index) => (
                                  <div key={`badge-${index}`} className="rounded-lg border border-border p-3">
                                    <div className="grid gap-3">
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                          <Label>Label</Label>
                                          <Input
                                            value={badge.label}
                                            onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                              const nextBadges = normalizeBadgeList(currentProps.badges);
                                              nextBadges[index] = { ...nextBadges[index], label: event.target.value };
                                              return {
                                                ...currentProps,
                                                badges: nextBadges,
                                              };
                                            })}
                                          />
                                        </div>
                                        <div className="grid gap-2">
                                          <Label>Icon</Label>
                                          <Input
                                            value={badge.icon}
                                            placeholder="truck, payment, returns, support, shield"
                                            onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                              const nextBadges = normalizeBadgeList(currentProps.badges);
                                              nextBadges[index] = { ...nextBadges[index], icon: event.target.value };
                                              return {
                                                ...currentProps,
                                                badges: nextBadges,
                                              };
                                            })}
                                          />
                                        </div>
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Description</Label>
                                        <Textarea
                                          value={badge.description}
                                          rows={2}
                                          onChange={(event) => updateBlockProps(block.id, block.props, (currentProps) => {
                                            const nextBadges = normalizeBadgeList(currentProps.badges);
                                            nextBadges[index] = { ...nextBadges[index], description: event.target.value };
                                            return {
                                              ...currentProps,
                                              badges: nextBadges,
                                            };
                                          })}
                                        />
                                      </div>
                                      <div className="flex justify-end">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="gap-1 text-muted-foreground"
                                          onClick={() => updateBlockProps(block.id, block.props, (currentProps) => ({
                                            ...currentProps,
                                            badges: normalizeBadgeList(currentProps.badges).filter((_, itemIndex) => itemIndex !== index),
                                          }))}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Save storefront styles</p>
          <p className="text-xs text-muted-foreground">This keeps the shared section system aligned across the live storefront and future template reuse.</p>
        </div>
        <Button type="button" onClick={() => void saveChanges()} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Save storefront styles
        </Button>
      </div>
    </div>
  );
}
