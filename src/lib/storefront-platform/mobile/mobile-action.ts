import { resolveStorefrontNavigationExperience } from "@/lib/cms/storefront-navigation-experience";
import { resolveStorefrontOrderExperienceFromProfile } from "@/lib/cms/storefront-order-experience";
import { PRIMARY_TOUCH_TARGET_PX } from "@/lib/storefront-platform/mobile/mobile-viewport";

export type StorefrontMobileActionKind = "cart" | "buy" | "book" | "contact" | "digital";
export type StorefrontMobileActionChannel = "internal" | "whatsapp";

export type StorefrontMobilePrimaryAction = {
  kind: StorefrontMobileActionKind;
  channel: StorefrontMobileActionChannel;
  label: string;
  href: string;
  touchTargetPx: typeof PRIMARY_TOUCH_TARGET_PX;
  safeAreaAware: true;
};

type WhatsAppSupport = { enabled?: boolean; number?: string | null; message?: string | null };

type MobileActionPaths = {
  cart?: string;
  checkout?: string;
  catalog?: string;
  contact?: string;
  product?: string | null;
  digital?: string;
};

function whatsappHref(support?: WhatsAppSupport | null) {
  if (!support?.enabled) return null;
  const digits = support.number?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const message = support.message?.trim();
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function resolveStorefrontMobilePrimaryAction({
  storefrontProfile,
  whatsappSupport,
  paths = {},
}: {
  storefrontProfile?: Record<string, unknown> | null;
  whatsappSupport?: WhatsAppSupport | null;
  paths?: MobileActionPaths;
}): StorefrontMobilePrimaryAction {
  const navigation = resolveStorefrontNavigationExperience(storefrontProfile);
  const order = resolveStorefrontOrderExperienceFromProfile(storefrontProfile);
  const directMessage = whatsappHref(whatsappSupport);
  const contactFirst = order.businessFamily === "service"
    || order.businessFamily === "listing"
    || order.catalogMode === "inquiry_only"
    || order.checkoutMode === "inquiry"
    || order.checkoutMode === "whatsapp";

  const base = { touchTargetPx: PRIMARY_TOUCH_TARGET_PX, safeAreaAware: true } as const;

  if (order.catalogMode === "digital_download") {
    return { ...base, kind: "digital", channel: "internal", label: navigation.primaryActionLabel,
      href: paths.digital ?? paths.product ?? paths.catalog ?? "/shop" };
  }

  if (order.businessFamily === "booking") {
    return { ...base, kind: "book", channel: directMessage ? "whatsapp" : "internal", label: navigation.primaryActionLabel,
      href: directMessage ?? paths.contact ?? "/contact" };
  }

  if (contactFirst) {
    return { ...base, kind: "contact", channel: directMessage ? "whatsapp" : "internal", label: navigation.primaryActionLabel,
      href: directMessage ?? paths.contact ?? "/contact" };
  }

  if (order.catalogMode === "single_product") {
    return { ...base, kind: "buy", channel: "internal", label: navigation.primaryActionLabel,
      href: paths.checkout ?? paths.product ?? "/checkout" };
  }

  return { ...base, kind: "cart", channel: "internal", label: navigation.cartLabel, href: paths.cart ?? "/cart" };
}
