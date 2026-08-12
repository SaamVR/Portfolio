import type { StorefrontTemplateSeedDefinition } from "@/lib/cms/storefront-template-seeds";
import { getStorefrontTemplateDefinition, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export type OnboardingTemplateBehavior = {
  allowedCatalogModes: readonly StorefrontTemplateSeedDefinition["catalogMode"][] | "all";
  showDeliveryFields: boolean;
  showLeadContactFields: boolean;
  showMapFields: boolean;
  showWhatsAppFields: boolean;
  deliveryPreviewPoints: string[];
  leadPreviewPoints: string[];
  whatsappPreviewPoints: string[];
  deliverySectionTitle: string;
  deliverySectionDescription: string;
  leadSectionTitle: string;
  leadSectionDescription: string;
  whatsappSectionTitle: string;
  whatsappSectionDescription: string;
  paymentIntro: string;
  launchChecklist: string;
  contentIntro: string;
  catalogIntro: string;
  previewDescription: string;
  seedButton: string;
  setupBadge: string;
  templateHelper: string;
};

type OnboardingTemplateBehaviorFactory = (context: {
  templateSeed: StorefrontTemplateSeedDefinition;
  templateId: StorefrontTemplateId;
}) => OnboardingTemplateBehavior;

function createDefaultBehavior({ templateSeed, templateId }: { templateSeed: StorefrontTemplateSeedDefinition; templateId: StorefrontTemplateId }): OnboardingTemplateBehavior {
  const templateDefinition = getStorefrontTemplateDefinition(templateId);
  return {
    allowedCatalogModes: "all",
    showDeliveryFields: false,
    showLeadContactFields: false,
    showMapFields: false,
    showWhatsAppFields: false,
    deliveryPreviewPoints: [
      "Clarify where you serve and how pricing changes by area.",
      "Keep fees and thresholds easy for customers to understand.",
      "Use only the delivery rules that match this storefront.",
    ],
    leadPreviewPoints: [
      "Set the main contact promise visitors should see first.",
      "Explain how quickly the business usually responds.",
      "Keep lead capture copy aligned with the storefront goal.",
    ],
    whatsappPreviewPoints: [
      "Use WhatsApp only when direct messaging helps conversion.",
      "Set a clean starter message so customers know what to ask.",
      "Keep support wording aligned with this store type.",
    ],
    deliverySectionTitle: "Delivery setup",
    deliverySectionDescription: "Configure how delivery zones, fees, and thresholds should be guided during setup.",
    leadSectionTitle: "Lead and contact setup",
    leadSectionDescription: "Set the inquiry copy, contact promise, and response details that should guide buyers next.",
    whatsappSectionTitle: "WhatsApp support",
    whatsappSectionDescription: "Keep WhatsApp help copy relevant to this storefront so support stays close to conversion.",
    paymentIntro: "Set how storefront orders should be paid and how the merchant should handle checkout trust.",
    launchChecklist: "Saving now writes a store-local storefront snapshot, payment settings, theme data, and template metadata without mutating shared defaults in place.",
    contentIntro: `This starts from the selected ${templateDefinition.label} storefront template and stays scoped to this store.`,
    catalogIntro: `Use ${templateDefinition.label.toLowerCase()} catalog behavior so the storefront, checkout wording, and customer flow stay relevant for this merchant.`,
    previewDescription: `${templateDefinition.label} template with your current draft.`,
    seedButton: `Seed ${templateDefinition.label} Demo Data`,
    setupBadge: `${templateDefinition.label} template`,
    templateHelper: "This template seeds store-local pages, blocks, defaults, and storefront metadata for this merchant only.",
  };
}

const registry: Partial<Record<StorefrontTemplateId, Partial<OnboardingTemplateBehavior>>> = {
  food: {
    allowedCatalogModes: ["menu"],
    showDeliveryFields: true,
    showWhatsAppFields: true,
    deliveryPreviewPoints: [
      "Show delivery zones that feel familiar to local food buyers.",
      "Keep timing, fee expectations, and minimums easy to scan.",
      "Use this area to reduce hesitation before the first order.",
    ],
    whatsappPreviewPoints: [
      "Great for menu questions, spice level, and availability.",
      "Works well when customers often confirm details before paying.",
      "Keep the starter message focused on ordering help.",
    ],
    deliverySectionTitle: "Delivery and service zones",
    deliverySectionDescription: "Guide guests with delivery zones, fees, and timing details that make local ordering clearer.",
    whatsappSectionTitle: "Order support on WhatsApp",
    whatsappSectionDescription: "Keep WhatsApp close to menu ordering so customers can ask about delivery, spice level, or availability.",
    paymentIntro: "Set how food orders should be paid and how delivery confidence should be communicated.",
    launchChecklist: "Saving now writes store-local menu pages, payment settings, delivery messaging, theme data, and template metadata for this food storefront.",
  },
  service: {
    allowedCatalogModes: ["inquiry_only"],
    showLeadContactFields: true,
    showMapFields: true,
    showWhatsAppFields: true,
    leadPreviewPoints: [
      "Frame the service promise clearly before asking for contact.",
      "Set the right response-time expectation for new leads.",
      "Use contact copy that feels like a consultation, not a product order.",
    ],
    whatsappPreviewPoints: [
      "Useful for quick qualification and service questions.",
      "Good when appointments or discovery calls need fast follow-up.",
      "Keep the message focused on goals and next steps.",
    ],
    leadSectionTitle: "Service lead capture",
    leadSectionDescription: "Set the inquiry promise, contact details, and service-intake copy that should guide new leads.",
    whatsappSectionTitle: "Service support on WhatsApp",
    whatsappSectionDescription: "Use WhatsApp for quick questions, appointment follow-up, or assisted booking when this service storefront needs it.",
    paymentIntro: "Set how service requests should collect payments or move into manual follow-up.",
    launchChecklist: "Saving now writes store-local service pages, follow-up settings, theme data, and template metadata for this service storefront.",
  },
  booking: {
    allowedCatalogModes: ["inquiry_only"],
    showLeadContactFields: true,
    showMapFields: true,
    showWhatsAppFields: true,
    leadPreviewPoints: [
      "Tell guests how reservations begin and what happens next.",
      "Keep location and timing confidence visible early.",
      "Use wording that feels like reservation help, not generic support.",
    ],
    whatsappPreviewPoints: [
      "Useful for reservation timing, confirmation, and quick questions.",
      "Best when guests often message before they commit.",
      "Keep the message focused on booking help.",
    ],
    leadSectionTitle: "Reservation contact flow",
    leadSectionDescription: "Guide guests into booking requests with the right reservation copy, contact promise, and location details.",
    whatsappSectionTitle: "Guest support on WhatsApp",
    whatsappSectionDescription: "Use WhatsApp for reservation questions, timing updates, or quick support before guests commit.",
    paymentIntro: "Set how guests will confirm reservations and how the merchant will collect booking payments.",
    launchChecklist: "Saving now writes store-local reservation content, theme data, payment settings, and template metadata for this booking storefront.",
  },
  hotel: {
    allowedCatalogModes: ["inquiry_only"],
    showLeadContactFields: true,
    showMapFields: true,
    showWhatsAppFields: true,
    leadPreviewPoints: [
      "Explain how room questions and reservation requests are handled.",
      "Keep response-time and location confidence visible for guests.",
      "Use wording that supports hospitality, not generic ecommerce.",
    ],
    whatsappPreviewPoints: [
      "Useful for room availability and arrival planning questions.",
      "Helps guests ask before they commit to a stay.",
      "Keep the starter message focused on reservation support.",
    ],
    leadSectionTitle: "Guest inquiry flow",
    leadSectionDescription: "Guide guests into reservation requests with clear contact, location, and response-time details.",
    whatsappSectionTitle: "Guest support on WhatsApp",
    whatsappSectionDescription: "Keep WhatsApp ready for room questions, arrival planning, and assisted booking follow-up.",
    paymentIntro: "Set how guests will confirm reservations and how the merchant will collect booking payments.",
    launchChecklist: "Saving now writes store-local reservation content, theme data, payment settings, and template metadata for this booking storefront.",
  },
  "real-estate": {
    allowedCatalogModes: ["inquiry_only"],
    showLeadContactFields: true,
    showMapFields: true,
    showWhatsAppFields: true,
    leadPreviewPoints: [
      "Guide buyers or renters toward the right inquiry promise.",
      "Keep viewing-response expectations and office details easy to find.",
      "Use contact wording that feels agent-led and trustworthy.",
    ],
    whatsappPreviewPoints: [
      "Useful for listing questions and viewing coordination.",
      "Best when leads often want a fast human reply.",
      "Keep the message focused on listing or visit help.",
    ],
    leadSectionTitle: "Property lead intake",
    leadSectionDescription: "Guide visitors toward the right inquiry promise, agent contact details, and viewing-response expectations.",
    whatsappSectionTitle: "Property support on WhatsApp",
    whatsappSectionDescription: "Use WhatsApp for listing questions, viewing coordination, and faster lead follow-up.",
    paymentIntro: "Set how property leads should pay deposits or move into assisted follow-up if direct checkout is not the right fit.",
    launchChecklist: "Saving now writes store-local listing pages, contact flow settings, theme data, and template metadata for this property storefront.",
  },
  "inquiry-catalog": {
    allowedCatalogModes: ["inquiry_only"],
    showLeadContactFields: true,
    showWhatsAppFields: true,
    leadPreviewPoints: [
      "Clarify how buyers request pricing, branding, or MOQ details.",
      "Set expectations around quote response and follow-up.",
      "Keep the contact path aligned with wholesale buying.",
    ],
    whatsappPreviewPoints: [
      "Useful for MOQ, branding, and quote questions.",
      "Works best when buyers need a fast sales conversation.",
      "Keep the starter message focused on quote support.",
    ],
    leadSectionTitle: "Quote and inquiry setup",
    leadSectionDescription: "Clarify how buyers should request pricing, branding, or wholesale details from this catalog.",
    whatsappSectionTitle: "Quote support on WhatsApp",
    whatsappSectionDescription: "Use WhatsApp as a fast lane for quote questions, MOQ checks, and assisted sales follow-up.",
  },
  landing: {
    allowedCatalogModes: ["landing_only"],
    showLeadContactFields: true,
    showWhatsAppFields: true,
    leadPreviewPoints: [
      "Keep the CTA promise extremely clear and outcome-focused.",
      "Use response wording that reduces hesitation fast.",
      "Make the contact path feel like the natural next step.",
    ],
    whatsappPreviewPoints: [
      "Useful when the goal is fast direct contact.",
      "Great for campaigns or assisted lead capture.",
      "Keep the message focused on the offer or service.",
    ],
    leadSectionTitle: "Lead capture setup",
    leadSectionDescription: "Keep the landing-page response promise, CTA wording, and contact path focused on conversion.",
    whatsappSectionTitle: "Lead support on WhatsApp",
    whatsappSectionDescription: "Use WhatsApp when the landing page should push visitors into quick direct contact instead of catalog browsing.",
  },
  "single-product": {
    allowedCatalogModes: ["single_product"],
  },
};

export function resolveOnboardingTemplateBehavior(context: {
  templateSeed: StorefrontTemplateSeedDefinition;
  templateId: StorefrontTemplateId;
}): OnboardingTemplateBehavior {
  const base = createDefaultBehavior(context);
  const override = registry[context.templateId];
  return {
    ...base,
    ...override,
  };
}
