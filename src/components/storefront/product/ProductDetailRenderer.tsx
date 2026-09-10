"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { CalendarDays, Clock3, Download, FileText, Heart, MapPin, Minus, MonitorSmartphone, MoveRight, Phone, Plus, Ruler, ShieldCheck, ShoppingBag, Sparkles, Star, Users } from "lucide-react";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductReviews from "@/components/ProductReviews";
import RelatedProducts from "@/components/RelatedProducts";
import SizeGuide from "@/components/SizeGuide";
import SocialShare from "@/components/SocialShare";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { LicenseSelector } from "@/components/storefront/digital-downloads/LicenseSelector";
import { SubscriptionDurationSelector } from "@/components/storefront/subscriptions/SubscriptionDurationSelector";
import { SubscriptionPlanSelector } from "@/components/storefront/subscriptions/SubscriptionPlanSelector";
import { encodeDigitalCartVariant } from "@/lib/digital-cart";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { productUrl, storefrontPath } from "@/lib/slug";
import { saveBuyNowPayload } from "@/lib/storefront-buy-now";
import { resolveAllowGuestCheckoutForStore } from "@/lib/storefront-customer-access";
import { buildStorefrontInquiryHref } from "@/lib/cms/storefront-inquiry-context";
import { cn } from "@/lib/utils";
import {
  getDigitalCompatibility,
  getDigitalFileSize,
  getDigitalFormats,
  getDigitalLicenses,
  getIncludedFileCount,
  getInstantDownloadInfo,
} from "@/components/storefront/digital-downloads/digital-download-utils";
import {
  getDisplayableProductType,
  getPrimaryProductOptionValue,
  getRenderableMetricOptionGroups,
  getRenderableColorOptions,
  getRenderableSizeOptions,
  getStructuredSpecEntries,
  shouldShowColorOptions,
  shouldShowSizeGuide,
  shouldShowSizeOptions,
  type ProductDetailVariant,
} from "@/lib/cms/storefront-product-presentation";

type DetailLayoutMode = "media" | "story" | "specs";

type DetailSection = {
  title: string;
  body: string;
  items?: Array<{ icon?: React.ReactNode; label: string; value: string }>;
};

function getString(specs: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function getNumber(specs: Record<string, unknown>, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function getStringArray(specs: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = specs[key];
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
  }
  return [];
}

function getOptionalNumber(specs: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function withValue<T extends { value: string }>(items: T[]) {
  return items.filter((item) => item.value.trim());
}

function ProductBadge({ badge }: { badge?: string | null }) {
  if (!badge) return null;
  return <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{badge}</span>;
}

function ProductPrice({
  price,
  originalPrice,
  suffix,
}: {
  price: number;
  originalPrice?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-end gap-3">
      <p className="font-heading text-3xl font-bold text-primary">BDT {price.toLocaleString()}</p>
      {suffix ? <p className="pb-1 text-sm text-muted-foreground">{suffix}</p> : null}
      {typeof originalPrice === "number" && originalPrice > price ? (
        <p className="pb-1 text-sm text-muted-foreground line-through">BDT {originalPrice.toLocaleString()}</p>
      ) : null}
    </div>
  );
}

function ProductRating({ value, label }: { value?: number | null; label?: string }) {
  const rating = value ?? 4.8;
  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-0.5 text-[#f2b21d]">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className={cn("h-4 w-4", index < Math.round(rating) ? "fill-current" : "fill-transparent text-border")} />
        ))}
      </div>
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      {label ? <span>{label}</span> : null}
    </div>
  );
}

function ProductMetaList({
  items,
}: {
  items: Array<{ icon?: React.ReactNode; label: string; value: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card/40 p-4">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="flex items-start gap-3 text-sm">
          {item.icon ? <span className="mt-0.5 text-primary">{item.icon}</span> : null}
          <div>
            <p className="font-medium text-foreground">{item.label}</p>
            <p className="text-muted-foreground">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductMetaTable({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card/30">
        <div className="divide-y divide-border/70">
          {items.map((item) => (
            <div key={`${item.label}-${item.value}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-sm leading-7 text-muted-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductDescription({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
      <p className="leading-8 text-muted-foreground">{body}</p>
    </section>
  );
}

function ProductSections({
  sections,
}: {
  sections: DetailSection[];
}) {
  const visibleSections = sections.filter((section) => section.body.trim() || (section.items?.length ?? 0) > 0);
  if (visibleSections.length === 0) return null;

  return (
    <>
      {visibleSections.map((section) => (
        <section key={section.title} className="space-y-4">
          {section.body.trim() ? <ProductDescription title={section.title} body={section.body} /> : <h2 className="font-heading text-2xl font-bold text-foreground">{section.title}</h2>}
          {section.items?.length ? <ProductMetaList items={section.items} /> : null}
        </section>
      ))}
    </>
  );
}

function ProductPolicies({
  lines,
}: {
  lines: string[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl font-bold text-foreground">Policies & support</h2>
      <div className="space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm text-muted-foreground">{line}</p>
        ))}
      </div>
    </section>
  );
}

function ProductVariantSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {value ? <span className="text-xs font-medium text-muted-foreground">{value}</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              value === option
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductOptionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-background/65 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function StickyMobileAction({
  label,
  price,
  onClick,
  wishlisted,
  onToggleWishlist,
}: {
  label: string;
  price: number;
  onClick: () => void;
  wishlisted: boolean;
  onToggleWishlist: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-sm font-bold text-primary">BDT {price.toLocaleString()}</p>
        </div>
        <button
          type="button"
          onClick={onToggleWishlist}
          className={cn("flex h-11 w-11 items-center justify-center rounded-full border", wishlisted ? "border-primary/20 bg-primary/10 text-primary" : "border-border text-muted-foreground")}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

function buildSubscriptionPlanOptions(product: Product, specs: Record<string, unknown>) {
  const variantGroups = Array.isArray(specs.variants) ? specs.variants as Array<{ name?: string; values?: Array<{ label?: string }> }> : [];
  const planGroup = variantGroups.find((item) => item.name?.toLowerCase() === "plan");
  const seeded = (planGroup?.values ?? []).map((item) => item.label?.trim()).filter((value): value is string => Boolean(value));
  if (seeded.length > 0) {
    return seeded.map((label) => ({ id: label.toLowerCase().replace(/\s+/g, "-"), label, description: "Store-managed plan option" }));
  }
  const sizes = product.sizes.filter(Boolean);
  if (sizes.length > 0) {
    return sizes.slice(0, 4).map((label) => ({ id: label.toLowerCase(), label, description: "Available plan option" }));
  }
  return ["Individual", "Family", "Shared"].map((label) => ({ id: label.toLowerCase(), label, description: "Subscription access type" }));
}

function buildSubscriptionDurationOptions(product: Product, specs: Record<string, unknown>) {
  const variantGroups = Array.isArray(specs.variants) ? specs.variants as Array<{ name?: string; values?: Array<{ label?: string; price_delta?: number }> }> : [];
  const durationGroup = variantGroups.find((item) => item.name?.toLowerCase() === "duration");
  const seeded = (durationGroup?.values ?? [])
    .map((item) => item.label?.trim() ? ({
      id: item.label!.toLowerCase().includes("year") ? "yearly" as const : "monthly" as const,
      label: item.label!.trim(),
      price: product.price + Math.max(0, Math.round(Number(item.price_delta ?? 0))),
      hint: "Store-managed duration option",
    }) : null)
    .filter((item): item is { id: "monthly" | "yearly"; label: string; price: number; hint: string } => Boolean(item));
  if (seeded.length > 0) return seeded;
  return [
    { id: "monthly" as const, label: "Monthly", price: product.price, hint: "Flexible access" },
    { id: "yearly" as const, label: "Yearly", price: product.originalPrice && product.originalPrice > product.price ? product.originalPrice : Math.round(product.price * 10), hint: "Longer-term savings" },
  ];
}

function ProductDetailsShell({
  product,
  children,
  side,
  mode = "media",
}: {
  product: Product;
  children: React.ReactNode;
  side: React.ReactNode;
  mode?: DetailLayoutMode;
}) {
  const leadSpan = mode === "media" ? "lg:col-span-8" : mode === "story" ? "lg:col-span-6" : "lg:col-span-5";
  const sideSpan = mode === "media" ? "lg:col-span-4" : mode === "story" ? "lg:col-span-6" : "lg:col-span-7";
  const detailCardClass = mode === "story"
    ? "space-y-8 rounded-3xl border border-border/80 bg-card/40 p-6 md:p-8"
    : mode === "specs"
      ? "space-y-8"
      : "space-y-8 rounded-3xl border border-border/80 bg-card/40 p-6 md:p-8";

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-start">
        <div className={cn("space-y-10", leadSpan)}>
          <ProductImageGallery images={product.images} alt={product.name} />
          <div className={detailCardClass}>
            {children}
          </div>
        </div>
        <div className={sideSpan}>
          <div className="sticky top-24 space-y-6 rounded-3xl border border-border bg-card/80 p-6 md:p-8 shadow-sm backdrop-blur-sm">
            {side}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericProductDetailsContent({
  product,
  variant,
}: {
  product: Product;
  variant: ProductDetailVariant;
}) {
  const currentStore = useOptionalStore();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { trackEvent } = useStorefrontAnalytics();
  const navigate = useNavigate();
  const { specs } = useStoreProductPresentation(product);
  const [quantity, setQuantity] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState("");
  const [selectedCheckOut, setSelectedCheckOut] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [roomCount, setRoomCount] = useState(1);

  const digitalLicenses = useMemo(() => getDigitalLicenses(product), [product]);
  const [selectedLicenseId, setSelectedLicenseId] = useState(digitalLicenses[0]?.id ?? "personal");
  const selectedLicense = digitalLicenses.find((license) => license.id === selectedLicenseId) ?? digitalLicenses[0];
  const subscriptionPlans = useMemo(() => buildSubscriptionPlanOptions(product, specs), [product, specs]);
  const subscriptionDurations = useMemo(() => buildSubscriptionDurationOptions(product, specs), [product, specs]);
  const [selectedPlanId, setSelectedPlanId] = useState(subscriptionPlans[0]?.id ?? "individual");
  const [selectedDurationId, setSelectedDurationId] = useState<"monthly" | "yearly">(subscriptionDurations[0]?.id ?? "monthly");
  const selectedPlan = subscriptionPlans.find((item) => item.id === selectedPlanId) ?? subscriptionPlans[0];
  const selectedDuration = subscriptionDurations.find((item) => item.id === selectedDurationId) ?? subscriptionDurations[0];
  const colorOptions = useMemo(() => getRenderableColorOptions(product, specs, variant), [product, specs, variant]);
  const sizeOptions = useMemo(() => getRenderableSizeOptions(product, specs, variant), [product, specs, variant]);
  const metricOptionGroups = useMemo(() => getRenderableMetricOptionGroups(product, specs, variant), [product, specs, variant]);
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "");
  const [selectedColor, setSelectedColor] = useState(colorOptions[0] || "");
  const [selectedMetricOptions, setSelectedMetricOptions] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(metricOptionGroups.map((group) => [group.key, [group.options[0] ?? ""]])),
  );
  const showColorSelector = shouldShowColorOptions(product, specs, variant);
  const showSizeSelector = shouldShowSizeOptions(product, specs, variant);
  const showSizeGuideButton = shouldShowSizeGuide(product, specs, variant);
  const customMetricItems = metricOptionGroups.map((group) => ({
    label: group.label,
    value: group.options.join(", "),
  }));
  const optionSummaryItems = withValue([
    ...(sizeOptions.length > 0 ? [{ icon: <Ruler className="h-4 w-4" />, label: getString(specs, ["size_label", "size_title"], "Sizes"), value: sizeOptions.join(", ") }] : []),
    ...(colorOptions.length > 0 ? [{ icon: <Sparkles className="h-4 w-4" />, label: getString(specs, ["color_label", "color_title"], "Colors"), value: colorOptions.join(", ") }] : []),
    ...customMetricItems.map((item) => ({ icon: <ShieldCheck className="h-4 w-4" />, label: item.label, value: item.value })),
  ]);
  const totalPrice = variant === "subscription"
    ? (selectedDuration?.price ?? product.price)
    : variant === "digital"
      ? (selectedLicense?.price ?? product.price)
      : product.price * quantity;
  const contactBaseHref = storefrontPath("/contact", currentStore?.slug);
  const generalInquiryHref = buildStorefrontInquiryHref(contactBaseHref, {
    intent: variant === "inquiry" ? "quote" : "service_booking",
    itemId: product.id,
    itemName: product.name,
  });
  const hotelAvailabilityHref = buildStorefrontInquiryHref(contactBaseHref, {
    intent: "hotel_availability",
    itemId: product.id,
    itemName: product.name,
    checkIn: selectedCheckIn,
    checkOut: selectedCheckOut,
    guests: guestCount,
    rooms: roomCount,
  });
  const propertyContactHref = buildStorefrontInquiryHref(contactBaseHref, {
    intent: "property_contact",
    itemId: product.id,
    itemName: product.name,
  });
  const propertyVisitHref = buildStorefrontInquiryHref(contactBaseHref, {
    intent: "property_visit",
    itemId: product.id,
    itemName: product.name,
  });
  const contactActionHref = variant === "hotel_room"
    ? hotelAvailabilityHref
    : variant === "property"
      ? propertyContactHref
      : generalInquiryHref;
  const contactActionLabel = variant === "property"
    ? "Contact Agent"
    : variant === "hotel_room"
      ? "Check Availability"
      : variant === "inquiry"
        ? "Request Quote"
        : variant === "service" || variant === "booking"
          ? "Book Now"
          : "Contact";
  const allowGuestCheckout = resolveAllowGuestCheckoutForStore(currentStore);
  const wishlisted = isInWishlist(product.id);
  const technicalSpecItems = getStructuredSpecEntries(specs, ["technical_specs", "specifications"]);
  const featureItems = getStringArray(specs, ["features", "benefits", "included_items"]).map((value, index) => ({
    label: `Feature ${index + 1}`,
    value,
  }));
  const trackedViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedViewRef.current === product.id) return;
    trackedViewRef.current = product.id;
    const timeout = window.setTimeout(() => {
      trackEvent({
        eventName: "view_item",
        eventCategory: "commerce",
        productId: product.id,
        value: product.price,
        metadata: {
          productName: product.name,
          category: product.category,
          productType: product.type,
        },
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [product.category, product.id, product.name, product.price, product.type, trackEvent]);

  useEffect(() => {
    setSelectedSize(sizeOptions[0] || "");
  }, [product.id, sizeOptions]);

  useEffect(() => {
    setSelectedColor(colorOptions[0] || "");
  }, [colorOptions, product.id]);

  useEffect(() => {
    setSelectedMetricOptions(Object.fromEntries(metricOptionGroups.map((group) => [group.key, [group.options[0] ?? ""]])));
  }, [metricOptionGroups, product.id]);

  const addToCartLabel = variant === "food"
    ? "Add"
    : variant === "beauty"
      ? "Add to Bag"
      : variant === "subscription"
        ? "Subscribe Now"
        : variant === "digital"
          ? "Purchase"
          : "Add to Cart";
  const supportsBuyNow = !["inquiry", "service", "booking", "hotel_room", "property"].includes(variant);

  const buildCartSelection = () => {
    if (variant === "subscription") {
      return [{
        productId: product.id,
        name: product.name,
        price: selectedDuration?.price ?? product.price,
        image: product.image,
        size: `${selectedPlan?.label || "Individual"} • ${selectedDuration?.label || "Monthly"}`,
        quantity: 1,
        storeId: currentStore?.id,
      }];
    }

    if (variant === "digital") {
      return [{
        productId: product.id,
        name: product.name,
        price: selectedLicense?.price ?? product.price,
        image: product.image,
        size: encodeDigitalCartVariant({
          license: selectedLicense?.label || "Personal",
          formats: getDigitalFormats(product),
        }),
        quantity: 1,
        storeId: currentStore?.id,
      }];
    }

    const cartSelection = [
      selectedSize,
      selectedColor,
      ...metricOptionGroups.flatMap((group) => selectedMetricOptions[group.key] ?? []),
    ].filter(Boolean).join(" • ") || getPrimaryProductOptionValue(product, specs, variant);

    return Array.from({ length: quantity }, () => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: cartSelection,
      quantity: 1,
      storeId: currentStore?.id,
    }));
  };

  const primaryAction = () => {
    if (variant === "subscription") {
      addItem({
        productId: product.id,
        name: product.name,
        price: selectedDuration?.price ?? product.price,
        image: product.image,
        size: `${selectedPlan?.label || "Individual"} • ${selectedDuration?.label || "Monthly"}`,
        storeId: currentStore?.id,
      });
      return;
    }

    if (variant === "digital") {
      addItem({
        productId: product.id,
        name: product.name,
        price: selectedLicense?.price ?? product.price,
        image: product.image,
        size: encodeDigitalCartVariant({
          license: selectedLicense?.label || "Personal",
          formats: getDigitalFormats(product),
        }),
        storeId: currentStore?.id,
      });
      return;
    }

    const cartSelection = [
      selectedSize,
      selectedColor,
      ...metricOptionGroups.flatMap((group) => selectedMetricOptions[group.key] ?? []),
    ].filter(Boolean).join(" • ") || getPrimaryProductOptionValue(product, specs, variant);

    for (let index = 0; index < quantity; index += 1) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: cartSelection,
        storeId: currentStore?.id,
      });
    }
  };

  const handleBuyNow = () => {
    const items = buildCartSelection();
    if (items.length === 0) return;

    saveBuyNowPayload(items, currentStore?.id);
    const checkoutPath = storefrontPath("/checkout?buy_now=1", currentStore?.slug);

    if (!allowGuestCheckout) {
      navigate(storefrontPath(`/auth?next=${encodeURIComponent(checkoutPath)}`, currentStore?.slug));
      return;
    }

    navigate(checkoutPath);
  };

  const metaItems = (() => {
    switch (variant) {
      case "electronics":
        return withValue([
          { icon: <ShieldCheck className="h-4 w-4" />, label: "Warranty", value: getString(specs, ["warranty", "warranty_period"], "Merchant warranty information") },
          { icon: <Sparkles className="h-4 w-4" />, label: "Compatibility", value: getString(specs, ["compatibility", "supported_devices"], "") },
        ]);
      case "food":
        return withValue([
          { icon: <Clock3 className="h-4 w-4" />, label: "Preparation time", value: getString(specs, ["prep_time", "preparation_time"], "") },
          { icon: <FileText className="h-4 w-4" />, label: "Ingredients", value: getString(specs, ["ingredients"], "") },
        ]);
      case "crafts":
        return withValue([
          { icon: <MapPin className="h-4 w-4" />, label: "Origin", value: getString(specs, ["origin", "region", "artisan"], "") },
          { icon: <ShieldCheck className="h-4 w-4" />, label: "Material", value: getString(specs, ["material"], getDisplayableProductType(product.type) || "Merchant-listed material") },
        ]);
      case "inquiry":
        return withValue([
          { icon: <ShoppingBag className="h-4 w-4" />, label: "MOQ", value: getOptionalNumber(specs, ["moq"]) !== null ? `${getOptionalNumber(specs, ["moq"])} units` : "" },
          { icon: <Sparkles className="h-4 w-4" />, label: "Branding", value: getString(specs, ["branding_options"], "") },
        ]);
      case "service":
      case "booking":
        return withValue([
          { icon: <Clock3 className="h-4 w-4" />, label: "Duration", value: getString(specs, ["duration", "duration_minutes"], "") },
          { icon: <Users className="h-4 w-4" />, label: "Availability", value: getString(specs, ["availability", "staff_availability"], "") },
        ]);
      case "subscription":
        return withValue([
          { icon: <MonitorSmartphone className="h-4 w-4" />, label: "Supported devices", value: getString(specs, ["supported_devices"], "Web and mobile supported") },
          { icon: <ShieldCheck className="h-4 w-4" />, label: "Region", value: getString(specs, ["region"], "Region restrictions may apply") },
        ]);
      case "digital":
        return withValue([
          { icon: <Download className="h-4 w-4" />, label: "Formats", value: getDigitalFormats(product).join(", ") },
          { icon: <MonitorSmartphone className="h-4 w-4" />, label: "Software", value: getDigitalCompatibility(product).join(", ") },
        ]);
      case "hotel_room":
        return withValue([
          { icon: <Users className="h-4 w-4" />, label: "Occupancy", value: getOptionalNumber(specs, ["capacity", "guest_capacity", "guests"]) !== null ? `${getOptionalNumber(specs, ["capacity", "guest_capacity", "guests"])} guests` : "" },
          { icon: <Ruler className="h-4 w-4" />, label: "Room size", value: getString(specs, ["room_size", "room_size_sqm", "room_size_sqft"], "") },
        ]);
      case "property":
        return withValue([
          { icon: <MapPin className="h-4 w-4" />, label: "Address", value: getString(specs, ["address", "location", "city"], "") },
          { icon: <Ruler className="h-4 w-4" />, label: "Area", value: getString(specs, ["property_area", "area_sqft", "sqft"], "") },
        ]);
      default: {
        const displayType = getDisplayableProductType(product.type);
        return [
          { icon: <Sparkles className="h-4 w-4" />, label: "Category", value: product.category || "Product" },
          ...(displayType ? [{ icon: <ShieldCheck className="h-4 w-4" />, label: "Type", value: displayType }] : []),
        ];
      }
    }
  })();

  const policies = (() => {
    switch (variant) {
      case "digital":
        return [
          "Secure download access is granted after confirmed payment.",
          "Public permanent file URLs are not exposed through this storefront.",
          "License scope and update access should be confirmed in the merchant policy pages.",
        ];
      case "subscription":
        return [
          "Subscription activation timing depends on the merchant's delivery workflow.",
          "Renewal and cancellation rules should be listed in store policies or FAQs.",
          "Region and device support may vary by plan.",
        ];
      case "hotel_room":
        return [
          "Check-in, cancellation, and refund rules should be confirmed with the property.",
          "Breakfast, refundable rates, and package inclusions can vary by room.",
          "Availability is confirmed through the merchant's live booking or contact flow.",
        ];
      case "property":
        return [
          "Viewing availability, document requirements, and pricing confirmation stay merchant-scoped.",
          "Ask the agent about financing or rent-estimate support if offered.",
          "Property status may change after publication and should be confirmed directly.",
        ];
      default:
        return [
          "Delivery options are shown at checkout.",
          "Checkout methods depend on this store's configuration.",
          "Returns, support, and after-sales policies remain merchant-specific.",
        ];
    }
  })();

  const layoutMode: DetailLayoutMode = (() => {
    switch (variant) {
      case "fashion":
      case "beauty":
      case "crafts":
      case "single_product":
      case "food":
        return "media";
      case "service":
      case "booking":
      case "subscription":
        return "story";
      case "electronics":
      case "inquiry":
      case "digital":
      case "hotel_room":
      case "property":
        return "specs";
      default:
        return technicalSpecItems.length >= 3 ? "specs" : "media";
    }
  })();

  const primarySpecTableItems = (() => {
    switch (variant) {
      case "electronics":
        return withValue([
          { label: "Warranty", value: getString(specs, ["warranty", "warranty_period"], "Merchant warranty information") },
          { label: "Compatibility", value: getString(specs, ["compatibility", "supported_devices"], "") },
          ...technicalSpecItems,
        ]);
      case "inquiry":
        return withValue([
          { label: "MOQ", value: getOptionalNumber(specs, ["moq"]) !== null ? `${getOptionalNumber(specs, ["moq"])} units` : "" },
          { label: "Branding options", value: getString(specs, ["branding_options"], "") },
          { label: "Lead time", value: getString(specs, ["lead_time", "production_lead_time"], "") },
          ...technicalSpecItems,
        ]);
      case "digital":
        return [
          { label: "Formats", value: getDigitalFormats(product).join(", ") || "Merchant-managed file formats" },
          { label: "Software compatibility", value: getDigitalCompatibility(product).join(", ") || "Compatibility shared by merchant" },
          { label: "File size", value: getDigitalFileSize(product) },
          { label: "Included files", value: `${getIncludedFileCount(product)} files` },
          { label: "Access", value: getInstantDownloadInfo(product) },
        ];
      case "hotel_room":
        return withValue([
          { label: "Occupancy", value: getOptionalNumber(specs, ["capacity", "guest_capacity", "guests"]) !== null ? `${getOptionalNumber(specs, ["capacity", "guest_capacity", "guests"])} guests` : "" },
          { label: "Room size", value: getString(specs, ["room_size", "room_size_sqm", "room_size_sqft"], "") },
          { label: "Bed type", value: getString(specs, ["bed_type"], "") },
          { label: "Amenities", value: getStringArray(specs, ["amenities", "features"]).join(", ") },
        ]);
      case "property":
        return withValue([
          { label: "Address", value: getString(specs, ["address", "location", "city"], "") },
          { label: "Listing type", value: getString(specs, ["listing_type"], "") },
          { label: "Area", value: getString(specs, ["property_area", "area_sqft", "sqft"], "") },
          { label: "Bedrooms", value: getOptionalNumber(specs, ["beds", "bedrooms"]) !== null ? String(getOptionalNumber(specs, ["beds", "bedrooms"])) : "" },
          { label: "Bathrooms", value: getOptionalNumber(specs, ["baths", "bathrooms"]) !== null ? String(getOptionalNumber(specs, ["baths", "bathrooms"])) : "" },
        ]);
      default:
        return withValue([
          ...customMetricItems,
          ...technicalSpecItems,
        ]);
    }
  })().filter((item) => item.value.trim());

  const detailSections = (() => {
    switch (variant) {
      case "fashion":
        return [{
          title: "Fit, fabric, and feel",
          body: product.description,
          items: optionSummaryItems,
        }];
      case "beauty":
        return [{
          title: "Benefits and suitability",
          body: product.description,
          items: [
              { icon: <Sparkles className="h-4 w-4" />, label: "Skin concerns", value: getString(specs, ["skin_concerns", "concerns"], getDisplayableProductType(product.category) || "Merchant-specified concerns") },
              { icon: <ShieldCheck className="h-4 w-4" />, label: "How to use", value: getString(specs, ["how_to_use"], "Use as directed by the merchant.") },
              ...customMetricItems.map((item) => ({ icon: <Ruler className="h-4 w-4" />, label: item.label, value: item.value })),
            ],
        }];
      case "electronics":
        return [
          { title: "Technical overview", body: product.description },
          {
            title: "What is included",
            body: "",
            items: [
              { icon: <FileText className="h-4 w-4" />, label: "Box contents", value: getString(specs, ["box_contents"], "See merchant listing for included accessories") },
              ...featureItems.map((item) => ({ icon: <Sparkles className="h-4 w-4" />, label: item.label, value: item.value })),
              ...customMetricItems.map((item) => ({ icon: <ShieldCheck className="h-4 w-4" />, label: item.label, value: item.value })),
            ],
          },
        ];
      case "food":
        return [{
          title: "Ingredients and flavor",
          body: product.description,
          items: [
              ...metaItems,
              { icon: <ShieldCheck className="h-4 w-4" />, label: "Allergy info", value: getString(specs, ["allergy_info"], "Contact the merchant for allergy guidance") },
            ],
        }];
      case "crafts":
        return [{
          title: "Craft story",
          body: product.description,
          items: [
              ...metaItems,
              ...customMetricItems.map((item) => ({ icon: <Sparkles className="h-4 w-4" />, label: item.label, value: item.value })),
              { icon: <ShieldCheck className="h-4 w-4" />, label: "Care", value: getString(specs, ["care_instructions"], "Follow merchant care instructions for this handmade piece") },
            ],
        }];
      case "inquiry":
        return [{ title: "Specifications and wholesale details", body: product.description }];
      case "service":
      case "booking":
        return [{
          title: "What's included",
          body: product.description,
          items: [
              ...metaItems,
              ...customMetricItems.map((item) => ({ icon: <ShieldCheck className="h-4 w-4" />, label: item.label, value: item.value })),
              { icon: <CalendarDays className="h-4 w-4" />, label: "Packages", value: getString(specs, ["packages", "included_items"], "Packages and scope confirmed with the merchant") },
            ],
        }];
      case "subscription":
        return [
          {
            title: "Included features",
            body: product.description,
            items: [
              ...metaItems,
              { icon: <Clock3 className="h-4 w-4" />, label: "Activation", value: getString(specs, ["activation_time"], "Merchant-managed activation after checkout") },
              { icon: <FileText className="h-4 w-4" />, label: "Renewal", value: getString(specs, ["renewal_policy"], "See store policies for renewal and cancellation details") },
            ],
          },
        ];
      case "digital":
        return [{ title: "Download details", body: product.description }];
      case "hotel_room":
        return [
          { title: "Room details", body: product.description },
          {
            title: "Stay policies",
            body: "",
            items: [
              { icon: <CalendarDays className="h-4 w-4" />, label: "Cancellation", value: getString(specs, ["cancellation_policy"], "Contact the property for cancellation details") },
            ],
          },
        ];
      case "property":
        return [{ title: "Property overview", body: product.description }];
      case "single_product":
        return [{
          title: "Feature story",
          body: product.description,
          items: [
              { icon: <Sparkles className="h-4 w-4" />, label: "Launch status", value: getString(specs, ["launch_status"], "Limited release") },
              { icon: <Clock3 className="h-4 w-4" />, label: "Urgency", value: getString(specs, ["countdown", "preorder"], "Available while the launch window remains open") },
            ],
        }];
      default:
        return [{
          title: "Description",
          body: product.description,
          items: [...metaItems, ...customMetricItems.map((item) => ({ icon: <ShieldCheck className="h-4 w-4" />, label: item.label, value: item.value }))],
        }];
    }
  })();

  const side = (
    <>
      <div className="space-y-5">
        {getDisplayableProductType(product.category) || getDisplayableProductType(product.type) ? (
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {getDisplayableProductType(product.category) || getDisplayableProductType(product.type)}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{product.name}</h1>
            <div className="flex items-center gap-3">
              <ProductBadge badge={product.badge} />
              <ProductRating label={variant === "property" ? "listing" : undefined} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleItem(product.id)}
            className={cn("flex h-11 w-11 items-center justify-center rounded-full border", wishlisted ? "border-primary/20 bg-primary/10 text-primary" : "border-border text-muted-foreground")}
          >
            <Heart className={cn("h-5 w-5", wishlisted && "fill-current")} />
          </button>
        </div>
        <ProductPrice
          price={variant === "subscription" ? (selectedDuration?.price ?? product.price) : variant === "digital" ? (selectedLicense?.price ?? product.price) : product.price}
          originalPrice={product.originalPrice}
          suffix={variant === "hotel_room" ? "per night" : variant === "property" ? (getString(specs, ["listing_type"], "").toLowerCase().includes("rent") ? "per month" : "sale price") : undefined}
        />
      </div>

      {showColorSelector || showSizeSelector || metricOptionGroups.length > 0 ? (
        <ProductOptionPanel
          title="Choose your options"
          description={metricOptionGroups.length > 0 ? "Variant choices and store-specific product attributes are grouped here for a cleaner setup before checkout." : "Select the available product options before adding to cart."}
        >
          {showColorSelector ? <ProductVariantSelector label={getString(specs, ["color_label", "color_title"], "Color")} options={colorOptions} value={selectedColor} onChange={setSelectedColor} /> : null}
          {showSizeSelector ? <ProductVariantSelector label={getString(specs, ["size_label", "size_title"], "Size / Option")} options={sizeOptions} value={selectedSize} onChange={setSelectedSize} /> : null}
          {metricOptionGroups.map((group) => (
            <ProductVariantSelector
              key={group.key}
              label={getString(specs, [`${group.key}_label`, `${group.key}_title`], group.label)}
              options={group.options}
              value={selectedMetricOptions[group.key]?.[0] ?? ""}
              onChange={(value) => setSelectedMetricOptions((current) => ({ ...current, [group.key]: [value] }))}
            />
          ))}
        </ProductOptionPanel>
      ) : null}

      {variant === "subscription" ? (
        <>
          <SubscriptionPlanSelector plans={subscriptionPlans} value={selectedPlanId} onChange={setSelectedPlanId} />
          <SubscriptionDurationSelector durations={subscriptionDurations} value={selectedDurationId} onChange={setSelectedDurationId} />
        </>
      ) : null}

      {variant === "digital" ? (
        <LicenseSelector licenses={digitalLicenses} value={selectedLicenseId} onChange={setSelectedLicenseId} />
      ) : null}

      {variant === "hotel_room" ? (
        <div className="grid gap-3 rounded-2xl border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-2 block font-medium text-foreground">Check-in</span>
              <input type="date" value={selectedCheckIn} onChange={(event) => setSelectedCheckIn(event.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-foreground">Check-out</span>
              <input type="date" value={selectedCheckOut} onChange={(event) => setSelectedCheckOut(event.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-2 block font-medium text-foreground">Guests</span>
              <select value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-foreground">Rooms</span>
              <select value={roomCount} onChange={(event) => setRoomCount(Number(event.target.value))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {variant === "property" ? (
        <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
          <p>Schedule a visit or contact the agent to confirm listing status, address access, and pricing details.</p>
        </div>
      ) : null}

      {variant !== "subscription" && variant !== "digital" && variant !== "service" && variant !== "booking" && variant !== "hotel_room" && variant !== "property" && variant !== "inquiry" ? (
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-foreground">Qty</p>
          <div className="flex items-center rounded-md border border-border">
            <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="flex h-11 w-11 items-center justify-center text-muted-foreground"
              aria-label="Decrease quantity">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-semibold text-foreground">{quantity}</span>
            <button type="button" onClick={() => setQuantity((current) => Math.min(10, current + 1))} className="flex h-11 w-11 items-center justify-center text-muted-foreground"
              aria-label="Increase quantity">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {variant === "inquiry" ? (
          <Link href={generalInquiryHref} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Request Quote
          </Link>
        ) : variant === "service" || variant === "booking" ? (
          <Link href={generalInquiryHref} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Book Now
          </Link>
        ) : variant === "hotel_room" ? (
          <Link href={hotelAvailabilityHref} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Check Availability
          </Link>
        ) : variant === "property" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={propertyContactHref} className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Contact Agent
            </Link>
            <Link href={propertyVisitHref} className="inline-flex h-12 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-foreground">
              Schedule Visit
            </Link>
          </div>
        ) : (
          <div className={cn("grid gap-3", supportsBuyNow ? "sm:grid-cols-2" : "")}>
            <button type="button" onClick={primaryAction} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
              {addToCartLabel} - BDT {totalPrice.toLocaleString()}
            </button>
            {supportsBuyNow ? (
              <button type="button" onClick={handleBuyNow} className="inline-flex h-12 w-full items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                Buy Now
              </button>
            ) : null}
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          <SocialShare url={absoluteStoreUrl(currentStore ?? undefined, productUrl(product.id, product.name, currentStore?.slug))} title={product.name} />
        </div>
        {!allowGuestCheckout && ["generic", "fashion", "beauty", "electronics", "food", "crafts", "subscription", "digital", "single_product"].includes(variant) ? (
          <p className="text-xs text-muted-foreground">
            This store requires customer login before checkout. Shoppers can add items first and sign in when they continue to buy.
          </p>
        ) : null}
      </div>

      {showSizeGuideButton ? (
        <button type="button" onClick={() => setSizeGuideOpen(true)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Ruler className="h-4 w-4" />
          Size Guide
        </button>
      ) : null}

      <ProductMetaList items={metaItems} />
      <SizeGuide open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />
      <StickyMobileAction
        label={supportsBuyNow ? "Buy Now" : contactActionLabel}
        price={variant === "property" || variant === "hotel_room" ? product.price : totalPrice}
        onClick={variant === "property" || variant === "hotel_room" || variant === "service" || variant === "booking" || variant === "inquiry" ? () => { window.location.href = contactActionHref; } : supportsBuyNow ? handleBuyNow : primaryAction}
        wishlisted={wishlisted}
        onToggleWishlist={() => toggleItem(product.id)}
      />
    </>
  );

  return (
    <>
      <ProductDetailsShell product={product} side={side} mode={layoutMode}>
        {layoutMode === "specs" && primarySpecTableItems.length > 0 ? (
          <ProductMetaTable title="Key details" items={primarySpecTableItems} />
        ) : null}
        <ProductSections sections={detailSections} />
        {layoutMode !== "specs" && technicalSpecItems.length > 0 ? (
          <ProductMetaTable title="Specifications" items={technicalSpecItems} />
        ) : null}
        <ProductPolicies lines={policies} />
      </ProductDetailsShell>
      <ProductReviews productId={product.id} />
      <RelatedProducts currentProduct={product} />
    </>
  );
}

type ProductDetailRendererComponent = ({ product }: { product: Product }) => React.ReactNode;

const productDetailRegistry: Record<ProductDetailVariant, ProductDetailRendererComponent> = {
  generic: ({ product }) => <GenericProductDetailsContent product={product} variant="generic" />,
  fashion: ({ product }) => <GenericProductDetailsContent product={product} variant="fashion" />,
  beauty: ({ product }) => <GenericProductDetailsContent product={product} variant="beauty" />,
  electronics: ({ product }) => <GenericProductDetailsContent product={product} variant="electronics" />,
  food: ({ product }) => <GenericProductDetailsContent product={product} variant="food" />,
  crafts: ({ product }) => <GenericProductDetailsContent product={product} variant="crafts" />,
  inquiry: ({ product }) => <GenericProductDetailsContent product={product} variant="inquiry" />,
  service: ({ product }) => <GenericProductDetailsContent product={product} variant="service" />,
  booking: ({ product }) => <GenericProductDetailsContent product={product} variant="booking" />,
  subscription: ({ product }) => <GenericProductDetailsContent product={product} variant="subscription" />,
  digital: ({ product }) => <GenericProductDetailsContent product={product} variant="digital" />,
  hotel_room: ({ product }) => <GenericProductDetailsContent product={product} variant="hotel_room" />,
  property: ({ product }) => <GenericProductDetailsContent product={product} variant="property" />,
  single_product: ({ product }) => <GenericProductDetailsContent product={product} variant="single_product" />,
};

export function ContextAwareProductDetails({ product }: { product: Product }) {
  const { detailVariant } = useStoreProductPresentation(product);
  const Renderer = productDetailRegistry[detailVariant] ?? productDetailRegistry.generic;
  return <Renderer product={product} />;
}