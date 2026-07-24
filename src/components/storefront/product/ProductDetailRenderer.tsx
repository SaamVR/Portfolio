"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, Download, FileText, Heart, MapPin, Minus, MonitorSmartphone, MoveRight, Phone, Plus, Ruler, ShieldCheck, ShoppingBag, Sparkles, Star, Users } from "lucide-react";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductReviews from "@/components/ProductReviews";
import RelatedProducts from "@/components/RelatedProducts";
import SizeGuide from "@/components/SizeGuide";
import SocialShare from "@/components/SocialShare";
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
  getRenderableColorOptions,
  getRenderableSizeOptions,
  shouldShowColorOptions,
  shouldShowSizeGuide,
  shouldShowSizeOptions,
  type ProductDetailVariant,
} from "@/lib/cms/storefront-product-presentation";

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
      <p className="text-sm font-semibold text-foreground">{label}</p>
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
          className={cn("flex h-10 w-10 items-center justify-center rounded-full border", wishlisted ? "border-primary/20 bg-primary/10 text-primary" : "border-border text-muted-foreground")}
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
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
}: {
  product: Product;
  children: React.ReactNode;
  side: React.ReactNode;
}) {
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-start">
        <div className="space-y-10 lg:col-span-7">
          <ProductImageGallery images={product.images} alt={product.name} />
          <div className="space-y-8 rounded-3xl border border-border/80 bg-card/40 p-6 md:p-8">
            {children}
          </div>
        </div>
        <div className="lg:col-span-5">
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
  const { specs } = useStoreProductPresentation(product);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || "");
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || "");
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
  const showColorSelector = shouldShowColorOptions(product, specs, variant);
  const showSizeSelector = shouldShowSizeOptions(product, specs, variant);
  const showSizeGuideButton = shouldShowSizeGuide(product, specs, variant);
  const totalPrice = variant === "subscription"
    ? (selectedDuration?.price ?? product.price)
    : variant === "digital"
      ? (selectedLicense?.price ?? product.price)
      : product.price * quantity;
  const contactHref = storefrontPath("/contact", currentStore?.slug);
  const wishlisted = isInWishlist(product.id);

  const addToCartLabel = variant === "food"
    ? "Add"
    : variant === "beauty"
      ? "Add to Bag"
      : variant === "subscription"
        ? "Subscribe Now"
        : variant === "digital"
          ? "Purchase"
          : "Add to Cart";

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

    for (let index = 0; index < quantity; index += 1) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: selectedSize || selectedColor || sizeOptions[0] || colorOptions[0] || "Default",
        storeId: currentStore?.id,
      });
    }
  };

  const metaItems = (() => {
    switch (variant) {
      case "electronics":
        return [
          { icon: <ShieldCheck className="h-4 w-4" />, label: "Warranty", value: getString(specs, ["warranty", "warranty_period"], "Merchant warranty information") },
          { icon: <Sparkles className="h-4 w-4" />, label: "Compatibility", value: getString(specs, ["compatibility", "supported_devices"], getDisplayableProductType(product.type) || product.category) },
        ];
      case "food":
        return [
          { icon: <Clock3 className="h-4 w-4" />, label: "Preparation time", value: getString(specs, ["prep_time", "preparation_time"], "25-35 minutes") },
          { icon: <FileText className="h-4 w-4" />, label: "Ingredients", value: getString(specs, ["ingredients"], product.description.split(".")[0] || "Merchant-managed recipe details") },
        ];
      case "crafts":
        return [
          { icon: <MapPin className="h-4 w-4" />, label: "Origin", value: getString(specs, ["origin", "region", "artisan"], product.category || "Artisan made") },
          { icon: <ShieldCheck className="h-4 w-4" />, label: "Material", value: getString(specs, ["material"], getDisplayableProductType(product.type) || "Merchant-listed material") },
        ];
      case "inquiry":
        return [
          { icon: <ShoppingBag className="h-4 w-4" />, label: "MOQ", value: `${getNumber(specs, ["moq"], Math.max(12, Math.min(product.stock || 24, 100)))} units` },
          { icon: <Sparkles className="h-4 w-4" />, label: "Branding", value: getString(specs, ["branding_options"], "Ask the merchant about available branding options") },
        ];
      case "service":
      case "booking":
        return [
          { icon: <Clock3 className="h-4 w-4" />, label: "Duration", value: getString(specs, ["duration", "duration_minutes"], `${Math.max(product.sizes.length * 15, 45)} minutes`) },
          { icon: <Users className="h-4 w-4" />, label: "Availability", value: getString(specs, ["availability", "staff_availability"], "Merchant-managed availability") },
        ];
      case "subscription":
        return [
          { icon: <MonitorSmartphone className="h-4 w-4" />, label: "Supported devices", value: getString(specs, ["supported_devices"], "Web and mobile supported") },
          { icon: <ShieldCheck className="h-4 w-4" />, label: "Region", value: getString(specs, ["region"], "Region restrictions may apply") },
        ];
      case "digital":
        return [
          { icon: <Download className="h-4 w-4" />, label: "Formats", value: getDigitalFormats(product).join(", ") },
          { icon: <MonitorSmartphone className="h-4 w-4" />, label: "Software", value: getDigitalCompatibility(product).join(", ") },
        ];
      case "hotel_room":
        return [
          { icon: <Users className="h-4 w-4" />, label: "Occupancy", value: `${getNumber(specs, ["capacity", "guest_capacity", "guests"], Math.max(2, product.sizes.length || 2))} guests` },
          { icon: <Ruler className="h-4 w-4" />, label: "Room size", value: getString(specs, ["room_size_sqm", "room_size_sqft"], "Spacious room layout") },
        ];
      case "property":
        return [
          { icon: <MapPin className="h-4 w-4" />, label: "Address", value: getString(specs, ["address", "location", "city"], "Location shared by merchant") },
          { icon: <Ruler className="h-4 w-4" />, label: "Area", value: `${getNumber(specs, ["area_sqft", "sqft"], Math.max(product.stock || 950, 750)).toLocaleString()} sqft` },
        ];
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

  const detailBody = (() => {
    switch (variant) {
      case "fashion":
        return (
          <>
            <ProductDescription title="Fit, fabric, and feel" body={product.description} />
            <ProductMetaList items={[
              ...(sizeOptions.length > 0 ? [{ icon: <Ruler className="h-4 w-4" />, label: "Sizes", value: sizeOptions.join(", ") }] : []),
              ...(colorOptions.length > 0 ? [{ icon: <Sparkles className="h-4 w-4" />, label: "Colors", value: colorOptions.join(", ") }] : []),
            ]} />
          </>
        );
      case "beauty":
        return (
          <>
            <ProductDescription title="Benefits and suitability" body={product.description} />
            <ProductMetaList items={[
              { icon: <Sparkles className="h-4 w-4" />, label: "Skin concerns", value: getString(specs, ["skin_concerns", "concerns"], getDisplayableProductType(product.category) || "Merchant-specified concerns") },
              { icon: <ShieldCheck className="h-4 w-4" />, label: "How to use", value: getString(specs, ["how_to_use"], "Use as directed by the merchant.") },
            ]} />
          </>
        );
      case "electronics":
        return (
          <>
            <ProductDescription title="Technical overview" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <FileText className="h-4 w-4" />, label: "Box contents", value: getString(specs, ["box_contents"], "See merchant listing for included accessories") },
            ]} />
          </>
        );
      case "food":
        return (
          <>
            <ProductDescription title="Ingredients and flavor" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <ShieldCheck className="h-4 w-4" />, label: "Allergy info", value: getString(specs, ["allergy_info"], "Contact the merchant for allergy guidance") },
            ]} />
          </>
        );
      case "crafts":
        return (
          <>
            <ProductDescription title="Craft story" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <ShieldCheck className="h-4 w-4" />, label: "Care", value: getString(specs, ["care_instructions"], "Follow merchant care instructions for this handmade piece") },
            ]} />
          </>
        );
      case "inquiry":
        return (
          <>
            <ProductDescription title="Specifications and wholesale details" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <Clock3 className="h-4 w-4" />, label: "Lead time", value: getString(specs, ["lead_time", "production_lead_time"], "Production lead time shared by merchant") },
            ]} />
          </>
        );
      case "service":
      case "booking":
        return (
          <>
            <ProductDescription title="What's included" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <CalendarDays className="h-4 w-4" />, label: "Packages", value: getString(specs, ["packages", "included_items"], "Packages and scope confirmed with the merchant") },
            ]} />
          </>
        );
      case "subscription":
        return (
          <>
            <ProductDescription title="Included features" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <Clock3 className="h-4 w-4" />, label: "Activation", value: getString(specs, ["activation_time"], "Merchant-managed activation after checkout") },
              { icon: <FileText className="h-4 w-4" />, label: "Renewal", value: getString(specs, ["renewal_policy"], "See store policies for renewal and cancellation details") },
            ]} />
          </>
        );
      case "digital":
        return (
          <>
            <ProductDescription title="Download details" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <Download className="h-4 w-4" />, label: "File size", value: getDigitalFileSize(product) },
              { icon: <FileText className="h-4 w-4" />, label: "Included files", value: `${getIncludedFileCount(product)} files` },
            ]} />
          </>
        );
      case "hotel_room":
        return (
          <>
            <ProductDescription title="Room details" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <ShieldCheck className="h-4 w-4" />, label: "Amenities", value: getStringArray(specs, ["amenities", "features"]).join(", ") || "Merchant-listed room amenities" },
              { icon: <CalendarDays className="h-4 w-4" />, label: "Cancellation", value: getString(specs, ["cancellation_policy"], "Contact the property for cancellation details") },
            ]} />
          </>
        );
      case "property":
        return (
          <>
            <ProductDescription title="Property overview" body={product.description} />
            <ProductMetaList items={[
              ...metaItems,
              { icon: <Users className="h-4 w-4" />, label: "Bedrooms", value: String(getNumber(specs, ["beds", "bedrooms"], Math.max(1, product.sizes.length || 3))) },
              { icon: <Users className="h-4 w-4" />, label: "Bathrooms", value: String(getNumber(specs, ["baths", "bathrooms"], Math.max(1, product.colors.length || 2))) },
            ]} />
          </>
        );
      case "single_product":
        return (
          <>
            <ProductDescription title="Feature story" body={product.description} />
            <ProductMetaList items={[
              { icon: <Sparkles className="h-4 w-4" />, label: "Launch status", value: getString(specs, ["launch_status"], "Limited release") },
              { icon: <Clock3 className="h-4 w-4" />, label: "Urgency", value: getString(specs, ["countdown", "preorder"], "Available while the launch window remains open") },
            ]} />
          </>
        );
      default:
        return (
          <>
            <ProductDescription title="Description" body={product.description} />
            <ProductMetaList items={metaItems} />
          </>
        );
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

      {showColorSelector || showSizeSelector ? (
        <>
          {showColorSelector ? <ProductVariantSelector label={getString(specs, ["color_label", "color_title"], "Color")} options={colorOptions} value={selectedColor} onChange={setSelectedColor} /> : null}
          {showSizeSelector ? <ProductVariantSelector label={getString(specs, ["size_label", "size_title"], "Size / Option")} options={sizeOptions} value={selectedSize} onChange={setSelectedSize} /> : null}
        </>
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
            <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="flex h-10 w-10 items-center justify-center text-muted-foreground">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-semibold text-foreground">{quantity}</span>
            <button type="button" onClick={() => setQuantity((current) => Math.min(10, current + 1))} className="flex h-10 w-10 items-center justify-center text-muted-foreground">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {variant === "inquiry" ? (
          <Link href={contactHref} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Request Quote
          </Link>
        ) : variant === "service" || variant === "booking" ? (
          <Link href={contactHref} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Book Now
          </Link>
        ) : variant === "hotel_room" ? (
          <Link href={contactHref} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Check Availability
          </Link>
        ) : variant === "property" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={contactHref} className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Contact Agent
            </Link>
            <Link href={contactHref} className="inline-flex h-12 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-foreground">
              Schedule Visit
            </Link>
          </div>
        ) : (
          <button type="button" onClick={primaryAction} className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            {addToCartLabel} - BDT {totalPrice.toLocaleString()}
          </button>
        )}
        <div className="text-sm text-muted-foreground">
          <SocialShare url={absoluteStoreUrl(currentStore ?? undefined, productUrl(product.id, product.name, currentStore?.slug))} title={product.name} />
        </div>
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
        label={variant === "property" ? "Contact Agent" : addToCartLabel}
        price={variant === "property" || variant === "hotel_room" ? product.price : totalPrice}
        onClick={variant === "property" || variant === "hotel_room" || variant === "service" || variant === "booking" || variant === "inquiry" ? () => { window.location.href = contactHref; } : primaryAction}
        wishlisted={wishlisted}
        onToggleWishlist={() => toggleItem(product.id)}
      />
    </>
  );

  return (
    <>
      <ProductDetailsShell product={product} side={side}>
        {detailBody}
        <ProductPolicies lines={policies} />
      </ProductDetailsShell>
      <ProductReviews productId={product.id} />
      <RelatedProducts currentProduct={product} />
    </>
  );
}

type ProductDetailRendererComponent = ({ product }: { product: Product }) => React.ReactNode;

export const productDetailRegistry: Record<ProductDetailVariant, ProductDetailRendererComponent> = {
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
