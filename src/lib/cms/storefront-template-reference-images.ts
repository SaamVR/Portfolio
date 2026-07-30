import beautyReference from "../../../docs/storefront-references/beauty.png";
import bookingReference from "../../../docs/storefront-references/bookings.png";
import craftsReference from "../../../docs/storefront-references/crafts.png";
import digitalReference from "../../../docs/storefront-references/digital.png";
import fashionReference from "../../../docs/storefront-references/fashion.png";
import foodReference from "../../../docs/storefront-references/food.png";
import electronicsReference from "../../../docs/storefront-references/gadgets.png";
import generalReference from "../../../docs/storefront-references/general.png";
import hotelReference from "../../../docs/storefront-references/hotels.png";
import inquiryReference from "../../../docs/storefront-references/inquiry with proucts.png";
import landingReference from "../../../docs/storefront-references/landings.png";
import realEstateReference from "../../../docs/storefront-references/real.png";
import serviceReference from "../../../docs/storefront-references/services.png";
import singleProductReference from "../../../docs/storefront-references/single-product.png";
import subscriptionsReference from "../../../docs/storefront-references/subscription.png";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";

const storefrontTemplateReferenceImages: Record<StorefrontTemplateId, string> = {
  fashion: fashionReference.src,
  beauty: beautyReference.src,
  electronics: electronicsReference.src,
  food: foodReference.src,
  crafts: craftsReference.src,
  "single-product": singleProductReference.src,
  "inquiry-catalog": inquiryReference.src,
  subscriptions: subscriptionsReference.src,
  "digital-downloads": digitalReference.src,
  service: serviceReference.src,
  "general-catalog": generalReference.src,
  landing: landingReference.src,
  booking: bookingReference.src,
  hotel: hotelReference.src,
  "real-estate": realEstateReference.src,
};

export function getStorefrontTemplateReferenceImage(templateId: StorefrontTemplateId) {
  return storefrontTemplateReferenceImages[templateId];
}
