import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";

type SharedBlockPresetMap = Partial<Record<StorePageBlock["type"], Record<string, unknown>>>;

const templateBlockPresets: Partial<Record<StorefrontTemplateId, SharedBlockPresetMap>> = {
  beauty: {
    "promo-banner": {
      title: "Routine spotlight",
      subtitle: "Highlight a limited offer, launch, or bundle with a softer editorial tone.",
    },
    "faq-accordion": {
      title: "Questions before you commit",
    },
    "trust-badges": {
      title: "Why shoppers feel confident here",
    },
    "recommended-products": {
      title: "Complete the routine",
      tagline: "Pairs well together",
    },
    "recently-viewed": {
      title: "Pick up where you left off",
    },
    testimonials: {
      title: "Why customers come back",
      subtitle: "Real feedback on texture, feel, and repeat results.",
    },
  },
  electronics: {
    "promo-banner": {
      title: "Current deal to notice",
      subtitle: "Use this strip for launches, stock pushes, and time-sensitive value.",
    },
    comparison: {
      title: "Compare before you choose",
      tagline: "Spec snapshot",
    },
    "faq-accordion": {
      title: "Questions before checkout",
    },
    "trust-badges": {
      title: "Buying confidence",
    },
    "recommended-products": {
      title: "More worth comparing",
      tagline: "Shortlist builders",
    },
    "recently-viewed": {
      title: "Recently viewed devices",
    },
    testimonials: {
      title: "What buyers noticed",
      subtitle: "Practical feedback on performance, delivery, and reliability.",
    },
  },
  food: {
    "promo-banner": {
      title: "Today’s highlight",
      subtitle: "Use this space for a combo, seasonal item, or delivery push.",
    },
    "faq-accordion": {
      title: "Questions before ordering",
    },
    "trust-badges": {
      title: "Order with confidence",
    },
    "recommended-products": {
      title: "Add something popular",
      tagline: "Good with your order",
    },
    "recently-viewed": {
      title: "Back to what you were eyeing",
    },
    testimonials: {
      title: "What guests mention most",
      subtitle: "Specific feedback around taste, freshness, and service speed.",
    },
  },
  hotel: {
    "faq-accordion": {
      title: "Questions before booking",
    },
    "trust-badges": {
      title: "Stay with confidence",
    },
    testimonials: {
      title: "Guest experiences",
      subtitle: "What people remember after their stay.",
    },
    "recommended-products": {
      title: "Other stays to consider",
      tagline: "Guest favorites",
    },
    "recently-viewed": {
      title: "Rooms you viewed recently",
    },
  },
  "real-estate": {
    "promo-banner": {
      title: "Featured opportunity",
      subtitle: "Use this to pull attention toward a neighborhood, launch, or viewing push.",
    },
    comparison: {
      title: "Compare shortlist options",
      tagline: "At-a-glance differences",
    },
    "faq-accordion": {
      title: "Questions before reaching out",
    },
    "recommended-products": {
      title: "Similar listings to explore",
      tagline: "More in this market",
    },
    "trust-badges": {
      title: "Why buyers feel confident",
    },
    "recently-viewed": {
      title: "Listings you looked at recently",
    },
    testimonials: {
      title: "Client experiences",
      subtitle: "Proof around trust, clarity, and responsiveness.",
    },
  },
  service: {
    "promo-banner": {
      title: "Current offer",
      subtitle: "Use this for packages, limited availability, or a consultation push.",
    },
    "recommended-products": {
      title: "Other services that fit",
      tagline: "Common next steps",
    },
    "faq-accordion": {
      title: "Questions before you reach out",
    },
    "trust-badges": {
      title: "Why clients feel safe starting here",
    },
    testimonials: {
      title: "Client outcomes",
      subtitle: "Use specific proof around responsiveness, process, and delivered results.",
    },
  },
  booking: {
    "promo-banner": {
      title: "Current availability highlight",
      subtitle: "Point people toward a timely slot, package, or seasonal offer.",
    },
    "recommended-products": {
      title: "Other options to book",
      tagline: "Worth considering",
    },
    "faq-accordion": {
      title: "Questions before booking",
    },
    "trust-badges": {
      title: "Booking confidence",
    },
    testimonials: {
      title: "What guests say after booking",
      subtitle: "Focus on ease, support, and the actual experience.",
    },
  },
  subscriptions: {
    "faq-accordion": {
      title: "Questions before subscribing",
    },
    "recommended-products": {
      title: "Plans you may also want",
      tagline: "Compare the fit",
    },
    "trust-badges": {
      title: "Subscription confidence",
    },
    testimonials: {
      title: "Why members stay",
      subtitle: "Ground this section in activation, clarity, and ongoing value.",
    },
  },
  "digital-downloads": {
    "faq-accordion": {
      title: "Questions before purchase",
    },
    "recommended-products": {
      title: "More downloads to explore",
      tagline: "Popular add-ons",
    },
    "recently-viewed": {
      title: "Assets you checked recently",
    },
    "trust-badges": {
      title: "Download confidence",
    },
    testimonials: {
      title: "What customers say after download",
      subtitle: "Best when it mentions file quality, clarity, and ease of use.",
    },
  },
  "general-catalog": {
    "promo-banner": {
      title: "Current highlight",
      subtitle: "Use this space for a seasonal push, shipping note, or featured collection.",
    },
    comparison: {
      title: "Compare key options",
      tagline: "Helpful side-by-side context",
    },
    "faq-accordion": {
      title: "Questions before buying",
    },
    "recommended-products": {
      title: "More to explore",
      tagline: "Recommended next",
    },
    "recently-viewed": {
      title: "Recently viewed items",
    },
    "trust-badges": {
      title: "Why shoppers can trust this store",
    },
    testimonials: {
      title: "What customers mention most",
      subtitle: "Use credible proof around quality, delivery, and support.",
    },
  },
};

export function getSharedBlockPresetProps(
  templateId: StorefrontTemplateId,
  blockType: StorePageBlock["type"],
): Record<string, unknown> {
  return templateBlockPresets[templateId]?.[blockType] ?? {};
}
