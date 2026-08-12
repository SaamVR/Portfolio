import type { Store } from "@/lib/cms/schema";
import {
  getStorefrontTemplateDefinition,
  resolveStorefrontTemplateProfile,
  type ResolvedStorefrontTemplateProfile,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { supportsTransactionalCheckout } from "@/lib/cms/storefront-compat";
import { getStorefrontOrderLabelOverride } from "@/lib/cms/storefront-order-registry";

type OrderItemLike = {
  size?: string | null;
};

type StorefrontProfileRecord = Record<string, unknown>;

export type StorefrontOrderExperience = {
  templateId: StorefrontTemplateId;
  businessFamily: ResolvedStorefrontTemplateProfile["businessFamily"];
  catalogMode: ResolvedStorefrontTemplateProfile["catalogMode"];
  checkoutMode: string;
  isTransactional: boolean;
  isDigitalOnly: boolean;
  labels: {
    cartTitle: string;
    cartEmptyTitle: string;
    cartEmptyDescription: string;
    browseLabel: string;
    continueBrowsingLabel: string;
    summaryTitle: string;
    subtotalLabel: string;
    totalLabel: string;
    deliveryLabel: string;
    freeDeliveryLabel: string;
    includedFulfillmentLabel: string;
    freeDeliveryHint: string;
    checkoutTitle: string;
    checkoutBackLabel: string;
    detailsTitle: string;
    customerNameLabel: string;
    phoneLabel: string;
    addressLabel: string;
    cityLabel: string;
    paymentTitle: string;
    couponTitle: string;
    placeOrderLabel: string;
    orderPlacedTitle: string;
    orderPlacedDescription: string;
    postOrderStatusLabel: string;
    continueActionLabel: string;
    trackActionLabel: string;
    accountActionLabel: string;
    trackTitle: string;
    trackDescription: string;
    trackHelper: string;
    optionLabel: string;
    quantityLabel: string;
    deliveryEstimateLabel: string;
    paymentSummaryLabel: string;
    orderListEmptyTitle: string;
    orderListEmptyDescription: string;
    reorderLabel: string;
    reviewPromptLabel: string;
    merchantNotificationTitle: string;
    addressSummaryLabel: string;
  };
};

function getStorefrontProfile(store?: Pick<Store, "siteSettings"> | null): StorefrontProfileRecord {
  if (typeof store?.siteSettings?.storefront_profile === "object" && store.siteSettings?.storefront_profile) {
    return store.siteSettings.storefront_profile as StorefrontProfileRecord;
  }

  return {};
}

function isDigitalVariant(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith("digital::");
}

function isDigitalOnly(items: OrderItemLike[] | undefined) {
  return Array.isArray(items) && items.length > 0 && items.every((item) => isDigitalVariant(item.size));
}

function getOrderExperienceCopy(
  profile: ResolvedStorefrontTemplateProfile,
  isDigitalCart: boolean,
): StorefrontOrderExperience["labels"] {
  const template = getStorefrontTemplateDefinition(profile.templateId);
  const cartLabel = template.presentation.navigationLabels.cart;
  const shopLabel = template.presentation.navigationLabels.shop;
  const addToCartLabel = template.presentation.ctaLabels.addToCart;

  const base = {
    cartTitle: cartLabel,
    cartEmptyTitle: `${cartLabel} is empty`,
    cartEmptyDescription: `Browse the ${shopLabel.toLowerCase()} and save a few items to get started.`,
    browseLabel: `Browse ${shopLabel}`,
    continueBrowsingLabel: `Continue ${shopLabel.toLowerCase()}`,
    summaryTitle: "Order Summary",
    subtotalLabel: "Subtotal",
    totalLabel: "Total",
    deliveryLabel: isDigitalCart ? "Digital delivery" : "Delivery",
    freeDeliveryLabel: "Free",
    includedFulfillmentLabel: "Included",
    freeDeliveryHint: "Add a little more to unlock free delivery.",
    checkoutTitle: "Checkout",
    checkoutBackLabel: `Back to ${cartLabel}`,
    detailsTitle: isDigitalCart ? "Customer Details" : "Delivery Details",
    customerNameLabel: "Full Name",
    phoneLabel: "Phone Number",
    addressLabel: isDigitalCart ? "Email / Delivery Note" : "Delivery Address",
    cityLabel: isDigitalCart ? "Region" : "City",
    paymentTitle: "Payment Method",
    couponTitle: "Discount Code",
    placeOrderLabel: addToCartLabel,
    orderPlacedTitle: "Order Confirmed",
    orderPlacedDescription: "Your order has been placed successfully.",
    postOrderStatusLabel: "Estimated delivery",
    continueActionLabel: `Continue ${shopLabel}`,
    trackActionLabel: "Track Order",
    accountActionLabel: "View Orders",
    trackTitle: "Track Your Order",
    trackDescription: "Enter the order number and phone number used at checkout to see the latest status.",
    trackHelper: "Double-check the order number and phone number from your confirmation message, then try again.",
    optionLabel: isDigitalCart ? "License" : "Option",
    quantityLabel: "Qty",
    deliveryEstimateLabel: isDigitalCart ? "Access after confirmation" : "2-5 business days",
    paymentSummaryLabel: "Payment",
    orderListEmptyTitle: "No orders yet",
    orderListEmptyDescription: "Orders you place here will appear in this account.",
    reorderLabel: "Reorder",
    reviewPromptLabel: "Write a Review",
    merchantNotificationTitle: "NEW ORDER RECEIVED",
    addressSummaryLabel: isDigitalCart ? "Delivery / access notes" : "Delivery Address",
  } satisfies StorefrontOrderExperience["labels"];

  return {
    ...base,
    ...getStorefrontOrderLabelOverride(profile.templateId, { isDigitalCart }),
  };
}

export function resolveStorefrontOrderExperience(
  store?: Pick<Store, "siteSettings"> | null,
  items?: OrderItemLike[],
): StorefrontOrderExperience {
  const storefrontProfile = getStorefrontProfile(store);
  const profile = resolveStorefrontTemplateProfile(storefrontProfile.template_id, {
    templateSeedId: typeof storefrontProfile.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const checkoutMode = typeof storefrontProfile.checkout_mode === "string" ? storefrontProfile.checkout_mode : "standard";
  const digitalOnly = isDigitalOnly(items);

  return {
    templateId: profile.templateId,
    businessFamily: profile.businessFamily,
    catalogMode: profile.catalogMode,
    checkoutMode,
    isTransactional: supportsTransactionalCheckout(profile.businessFamily, profile.catalogMode),
    isDigitalOnly: digitalOnly,
    labels: getOrderExperienceCopy(profile, digitalOnly),
  };
}

export function resolveStorefrontOrderExperienceFromProfile(
  storefrontProfile: StorefrontProfileRecord | null | undefined,
  items?: OrderItemLike[],
): StorefrontOrderExperience {
  const profile = resolveStorefrontTemplateProfile(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const checkoutMode = typeof storefrontProfile?.checkout_mode === "string" ? storefrontProfile.checkout_mode : "standard";
  const digitalOnly = isDigitalOnly(items);

  return {
    templateId: profile.templateId,
    businessFamily: profile.businessFamily,
    catalogMode: profile.catalogMode,
    checkoutMode,
    isTransactional: supportsTransactionalCheckout(profile.businessFamily, profile.catalogMode),
    isDigitalOnly: digitalOnly,
    labels: getOrderExperienceCopy(profile, digitalOnly),
  };
}
