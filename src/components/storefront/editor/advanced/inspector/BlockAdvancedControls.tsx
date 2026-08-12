"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PropertyRow } from "@/components/storefront/editor/shared/PropertyRow";
import { TextField } from "@/components/storefront/editor/shared/TextField";
import { NumberStepper } from "@/components/storefront/editor/shared/NumberStepper";
import { ColorField } from "@/components/storefront/editor/shared/ColorField";
import { MediaField } from "@/components/storefront/editor/shared/MediaField";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";

const PROMO_BG_STYLES = [
  "gradient",
  "dark",
  "accent",
  "luxury-gold",
  "indigo",
  "rose",
  "aurora",
  "luxury-dark",
  "confetti",
  "mesh-gradient",
] as const;

const PROMO_ALIGNMENTS = ["left", "center", "right"] as const;
const PROMO_PADDING_SIZES = ["compact", "cozy", "large"] as const;
const PROMO_THEME_DEFAULT_VALUE = "__theme-default";

export interface BlockAdvancedControlsProps {
  selectedBlock: StorePageBlock;
  updateSelectedBlockProps: (props: Record<string, unknown>) => void;
  storeId?: string;
  allPages?: StorePage[];
}

export function BlockAdvancedControls({
  selectedBlock,
  updateSelectedBlockProps,
  storeId,
}: BlockAdvancedControlsProps) {
  const props = (selectedBlock.props || {}) as Record<string, unknown>;

  const updateArrayItem = (key: string, index: number, patch: Record<string, unknown>) => {
    const current = Array.isArray(props[key]) ? ([...props[key] as Record<string, unknown>[]]) : [];
    current[index] = { ...current[index], ...patch };
    updateSelectedBlockProps({ [key]: current });
  };

  const removeArrayItem = (key: string, index: number) => {
    const current = Array.isArray(props[key]) ? ([...props[key] as Record<string, unknown>[]]) : [];
    updateSelectedBlockProps({ [key]: current.filter((_, idx) => idx !== index) });
  };

  const addArrayItem = (key: string, item: Record<string, unknown>) => {
    const current = Array.isArray(props[key]) ? ([...props[key] as Record<string, unknown>[]]) : [];
    updateSelectedBlockProps({ [key]: [...current, item] });
  };

  switch (selectedBlock.type) {
    case "hero":
      return (
        <div className="space-y-4">
          <TextField
            label="Anchor ID"
            value={String(props.anchorId ?? "")}
            onChange={(val) => updateSelectedBlockProps({ anchorId: val })}
            placeholder="e.g. hero-section"
          />

          <PropertyRow label="Media Type" help="Choose hero media display type">
            <Select
              value={String(props.mediaType ?? "image")}
              onValueChange={(val) => updateSelectedBlockProps({ mediaType: val })}
            >
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image" className="text-xs">Image</SelectItem>
                <SelectItem value="video" className="text-xs">Video</SelectItem>
              </SelectContent>
            </Select>
          </PropertyRow>

          <PropertyRow label="Image Fit" help="Control background image sizing">
            <Select
              value={String(props.mediaFit ?? "cover")}
              onValueChange={(val) => updateSelectedBlockProps({ mediaFit: val })}
            >
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover" className="text-xs">Fill frame (Cover)</SelectItem>
                <SelectItem value="contain" className="text-xs">Fit whole image (Contain)</SelectItem>
              </SelectContent>
            </Select>
          </PropertyRow>

          <NumberStepper
            label="Overlay Opacity"
            value={Number(props.overlayOpacity ?? 0)}
            min={0}
            max={100}
            unit="%"
            onChange={(val) => updateSelectedBlockProps({ overlayOpacity: val })}
          />

          <MediaField
            label="Hero Media"
            value={String(props.mediaUrl ?? "")}
            onChange={(url) => updateSelectedBlockProps({ mediaUrl: url })}
            storeId={storeId}
            folder="cms/hero"
            accept="image/*,video/*"
            resourceType="auto"
            aspectRatio="banner"
          />

          <ColorField
            label="Overlay Color"
            value={String(props.overlayColor ?? "#000000")}
            onChange={(hex) => updateSelectedBlockProps({ overlayColor: hex })}
          />
        </div>
      );

    case "promo-banner": {
      const promoBgStyle =
        typeof props.bgStyle === "string" ? props.bgStyle : undefined;
      const usesCustomPromoTheme = Boolean(promoBgStyle);
      const clearPromoThemePatch = {
        bgStyle: undefined,
        enableGlow: undefined,
        enableParticles: undefined,
        enableOrbs: undefined,
        cardOpacity: undefined,
      };

      return (
        <div className="space-y-4">
          <PropertyRow
            label="Background Style"
            help="Default follows the current site theme. Choose a custom style only when this promo needs to intentionally break from the storefront theme."
          >
            <Select
              value={promoBgStyle ?? PROMO_THEME_DEFAULT_VALUE}
              onValueChange={(val) =>
                updateSelectedBlockProps(
                  val === PROMO_THEME_DEFAULT_VALUE
                    ? clearPromoThemePatch
                    : { bgStyle: val },
                )
              }
            >
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PROMO_THEME_DEFAULT_VALUE} className="text-xs">
                  Follow site theme
                </SelectItem>
                {PROMO_BG_STYLES.map((style) => (
                  <SelectItem key={style} value={style} className="text-xs capitalize">
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>

          <PropertyRow label="Text Alignment">
            <Select
              value={String(props.textAlignment ?? "center")}
              onValueChange={(val) => updateSelectedBlockProps({ textAlignment: val })}
            >
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMO_ALIGNMENTS.map((align) => (
                  <SelectItem key={align} value={align} className="text-xs capitalize">
                    {align}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>

          <PropertyRow label="Padding Size">
            <Select
              value={String(props.paddingSize ?? "cozy")}
              onValueChange={(val) => updateSelectedBlockProps({ paddingSize: val })}
            >
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMO_PADDING_SIZES.map((size) => (
                  <SelectItem key={size} value={size} className="text-xs capitalize">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>

          {usesCustomPromoTheme ? (
            <>
              <NumberStepper
                label="Card Opacity"
                value={Number(props.cardOpacity ?? 0)}
                min={0}
                max={100}
                unit="%"
                onChange={(val) => updateSelectedBlockProps({ cardOpacity: val })}
              />

              <PropertyRow label="Enable Glow Effects">
                <Switch
                  checked={Boolean(props.enableGlow ?? false)}
                  onCheckedChange={(checked) => updateSelectedBlockProps({ enableGlow: checked })}
                />
              </PropertyRow>

              <PropertyRow label="Enable Background Particles">
                <Switch
                  checked={Boolean(props.enableParticles ?? false)}
                  onCheckedChange={(checked) => updateSelectedBlockProps({ enableParticles: checked })}
                />
              </PropertyRow>

              <PropertyRow label="Enable Floating Orbs">
                <Switch
                  checked={Boolean(props.enableOrbs ?? false)}
                  onCheckedChange={(checked) => updateSelectedBlockProps({ enableOrbs: checked })}
                />
              </PropertyRow>
            </>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              Promo colors, borders, and card treatment are following the active site theme.
            </div>
          )}
        </div>
      );
    }

    case "featured-products":
    case "recommended-products":
      return (
        <div className="space-y-4">
          <NumberStepper
            label="Product Limit"
            value={Number(props.limit ?? 6)}
            min={1}
            max={48}
            onChange={(val) => updateSelectedBlockProps({ limit: val })}
          />
        </div>
      );

    case "countdown":
      return (
        <div className="space-y-4">
          <TextField
            label="End Date"
            value={String(props.endDate ?? "")}
            onChange={(val) => updateSelectedBlockProps({ endDate: val })}
            placeholder="2026-12-31T23:59:59"
          />
          <TextField
            label="Background Gradient"
            value={String(props.bgGradient ?? "")}
            onChange={(val) => updateSelectedBlockProps({ bgGradient: val })}
            placeholder="from-emerald-500 to-teal-600"
          />
        </div>
      );

    case "rich-text":
      return (
        <div className="space-y-4">
          <PropertyRow label="Text Alignment">
            <Select
              value={String(props.align ?? "center")}
              onValueChange={(val) => updateSelectedBlockProps({ align: val })}
            >
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left" className="text-xs">Left</SelectItem>
                <SelectItem value="center" className="text-xs">Center</SelectItem>
              </SelectContent>
            </Select>
          </PropertyRow>
        </div>
      );

    case "social-feed": {
      const images = Array.isArray(props.images) ? (props.images as string[]) : [];

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Social Feed Images ({images.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => updateSelectedBlockProps({ images: [...images, ""] })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Image
            </Button>
          </div>

          <div className="space-y-3">
            {images.map((img, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Image {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => updateSelectedBlockProps({ images: images.filter((_, i) => i !== idx) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <MediaField
                  label=""
                  value={img}
                  onChange={(url) => {
                    const next = [...images];
                    next[idx] = url;
                    updateSelectedBlockProps({ images: next });
                  }}
                  storeId={storeId}
                  folder="social-feed"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "video-reel":
      return (
        <div className="space-y-4">
          <MediaField
            label="Video Reel Upload"
            value={String(props.videoUrl ?? "")}
            onChange={(url) => updateSelectedBlockProps({ videoUrl: url })}
            storeId={storeId}
            folder="video-reel"
            accept="video/*"
            resourceType="video"
            aspectRatio="video"
          />
        </div>
      );

    case "faq-accordion": {
      const faqs = Array.isArray(props.faqs) ? (props.faqs as Array<{ q: string; a: string }>) : [];

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              FAQs ({faqs.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => addArrayItem("faqs", { q: "", a: "" })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add FAQ
            </Button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">FAQ #{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => removeArrayItem("faqs", idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <TextField
                  label="Question"
                  value={faq.q ?? ""}
                  onChange={(val) => updateArrayItem("faqs", idx, { q: val })}
                />
                <TextField
                  label="Answer"
                  value={faq.a ?? ""}
                  multiline
                  rows={2}
                  onChange={(val) => updateArrayItem("faqs", idx, { a: val })}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "trust-badges": {
      const badges = Array.isArray(props.badges) ? (props.badges as Array<{ label: string; description?: string; icon?: string }>) : [];

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Trust Badges ({badges.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => addArrayItem("badges", { label: "", description: "", icon: "shield" })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Badge
            </Button>
          </div>

          <div className="space-y-3">
            {badges.map((badge, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Badge #{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => removeArrayItem("badges", idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <TextField
                  label="Label"
                  value={badge.label ?? ""}
                  onChange={(val) => updateArrayItem("badges", idx, { label: val })}
                />
                <TextField
                  label="Description"
                  value={badge.description ?? ""}
                  multiline
                  rows={2}
                  onChange={(val) => updateArrayItem("badges", idx, { description: val })}
                />
                <PropertyRow label="Icon">
                  <Select
                    value={badge.icon ?? "shield"}
                    onValueChange={(val) => updateArrayItem("badges", idx, { icon: val })}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shield" className="text-xs">Shield</SelectItem>
                      <SelectItem value="truck" className="text-xs">Truck</SelectItem>
                      <SelectItem value="payment" className="text-xs">Payment</SelectItem>
                      <SelectItem value="returns" className="text-xs">Returns</SelectItem>
                      <SelectItem value="support" className="text-xs">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </PropertyRow>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "testimonials": {
      const reviews = Array.isArray(props.reviews) ? (props.reviews as Array<{ name: string; rating?: number; comment: string }>) : [];

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Reviews ({reviews.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => addArrayItem("reviews", { name: "", rating: 5, comment: "" })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Review
            </Button>
          </div>

          <div className="space-y-3">
            {reviews.map((rev, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Review #{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => removeArrayItem("reviews", idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <TextField
                  label="Author Name"
                  value={rev.name ?? ""}
                  onChange={(val) => updateArrayItem("reviews", idx, { name: val })}
                />
                <NumberStepper
                  label="Star Rating"
                  value={Number(rev.rating ?? 5)}
                  min={1}
                  max={5}
                  onChange={(val) => updateArrayItem("reviews", idx, { rating: val })}
                />
                <TextField
                  label="Comment"
                  value={rev.comment ?? ""}
                  multiline
                  rows={2}
                  onChange={(val) => updateArrayItem("reviews", idx, { comment: val })}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
