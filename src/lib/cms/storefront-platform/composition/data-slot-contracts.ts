import {
  COMPOSITION_LIMITS,
  compositionBindingFields,
  compositionDataSlotIds,
  compositionDataSourceModes,
  type CompositionBindingField,
  type CompositionDataSlotId,
  type CompositionDataSourceMode,
} from "@/lib/cms/storefront-platform/composition/contracts";

export type CompositionSlotCardinality = "one" | "many";
export type CompositionSlotEmptyBehavior = "hide-slot" | "render-fallback-content";

export interface CompositionDataSlotContract {
  id: CompositionDataSlotId;
  label: string;
  description: string;
  cardinality: CompositionSlotCardinality;
  maxItems: number;
  allowedSources: readonly CompositionDataSourceMode[];
  fields: readonly CompositionBindingField[];
  requiredCapabilities: readonly string[];
  emptyBehavior: CompositionSlotEmptyBehavior;
  version: 1;
}

const catalogFields: readonly CompositionBindingField[] = ["title", "name", "priceLabel", "imageUrl", "imageAlt", "href", "label"];

export const compositionDataSlotRegistry: readonly CompositionDataSlotContract[] = [
  {
    id: "products",
    label: "Products",
    description: "Normalized product collection for reusable merchandising compositions.",
    cardinality: "many",
    maxItems: COMPOSITION_LIMITS.maxDataSlotItems,
    allowedSources: ["default", "featured-or-all", "featured", "all", "newest", "category", "type", "manual"],
    fields: catalogFields,
    requiredCapabilities: ["catalog"],
    emptyBehavior: "hide-slot",
    version: 1,
  },
  {
    id: "featured-products",
    label: "Featured products",
    description: "Product collection biased toward merchant-featured or campaign products.",
    cardinality: "many",
    maxItems: COMPOSITION_LIMITS.maxDataSlotItems,
    allowedSources: ["default", "featured-or-all", "featured", "newest", "category", "type", "manual"],
    fields: catalogFields,
    requiredCapabilities: ["catalog"],
    emptyBehavior: "hide-slot",
    version: 1,
  },
  {
    id: "categories",
    label: "Categories",
    description: "Normalized category or product-type navigation collection.",
    cardinality: "many",
    maxItems: COMPOSITION_LIMITS.maxDataSlotItems,
    allowedSources: ["default", "auto", "type", "manual"],
    fields: ["title", "label", "imageUrl", "imageAlt", "href"],
    requiredCapabilities: ["catalog"],
    emptyBehavior: "hide-slot",
    version: 1,
  },
  {
    id: "content",
    label: "Content",
    description: "Normalized merchant-authored content or rich-text-compatible source.",
    cardinality: "one",
    maxItems: 1,
    allowedSources: ["default", "manual"],
    fields: ["title", "subtitle", "body", "imageUrl", "imageAlt", "href"],
    requiredCapabilities: [],
    emptyBehavior: "render-fallback-content",
    version: 1,
  },
  {
    id: "testimonials",
    label: "Testimonials",
    description: "Normalized testimonial/review source without prescribing how reviews are fetched.",
    cardinality: "many",
    maxItems: 12,
    allowedSources: ["default", "manual", "live"],
    fields: ["name", "body", "rating", "imageUrl", "imageAlt"],
    requiredCapabilities: [],
    emptyBehavior: "hide-slot",
    version: 1,
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Normalized question-and-answer source for FAQ-compatible compositions.",
    cardinality: "many",
    maxItems: COMPOSITION_LIMITS.maxDataSlotItems,
    allowedSources: ["default", "manual", "live"],
    fields: ["question", "answer"],
    requiredCapabilities: [],
    emptyBehavior: "hide-slot",
    version: 1,
  },
] as const;

export interface CompositionDataSlotRequest {
  nodeId: string;
  slot: CompositionDataSlotId;
  source: CompositionDataSourceMode;
  limit: number;
  filters?: {
    category?: string;
    productType?: string;
  };
}

export type CompositionDataScalar = string | number | null;
export type CompositionDataSlotItem = Partial<Record<CompositionBindingField, CompositionDataScalar>>;

export interface CompositionDataSlotPayload {
  slot: CompositionDataSlotId;
  items: CompositionDataSlotItem[];
}

export function isCompositionDataSlotId(value: unknown): value is CompositionDataSlotId {
  return typeof value === "string" && compositionDataSlotIds.includes(value as CompositionDataSlotId);
}

export function isCompositionDataSourceMode(value: unknown): value is CompositionDataSourceMode {
  return typeof value === "string" && compositionDataSourceModes.includes(value as CompositionDataSourceMode);
}

export function getCompositionDataSlotContract(slot: CompositionDataSlotId): CompositionDataSlotContract {
  const contract = compositionDataSlotRegistry.find((item) => item.id === slot);
  if (!contract) throw new Error(`Unknown composition data slot: ${slot}`);
  return contract;
}

export function validateCompositionDataSlotSelection(
  slot: unknown,
  source: unknown = "default",
  limit: unknown = 6,
): { success: true; slot: CompositionDataSlotId; source: CompositionDataSourceMode; limit: number } | { success: false; message: string } {
  if (!isCompositionDataSlotId(slot)) {
    return { success: false, message: `Unknown composition data slot: ${String(slot)}` };
  }
  if (!isCompositionDataSourceMode(source)) {
    return { success: false, message: `Unknown composition data source mode: ${String(source)}` };
  }

  const contract = getCompositionDataSlotContract(slot);
  if (!contract.allowedSources.includes(source)) {
    return { success: false, message: `Source ${source} is not allowed for ${slot}` };
  }
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > contract.maxItems) {
    return { success: false, message: `Limit for ${slot} must be an integer from 1 to ${contract.maxItems}` };
  }

  return { success: true, slot, source, limit };
}

export function buildCompositionDataSlotRequest(input: CompositionDataSlotRequest): CompositionDataSlotRequest {
  const validation = validateCompositionDataSlotSelection(input.slot, input.source, input.limit);
  if (!validation.success) throw new Error(validation.message);

  return {
    nodeId: input.nodeId,
    slot: validation.slot,
    source: validation.source,
    limit: validation.limit,
    ...(input.filters && Object.keys(input.filters).length > 0 ? { filters: { ...input.filters } } : {}),
  };
}

function isSafeHref(value: string) {
  return value.startsWith("/")
    || value.startsWith("#")
    || value.startsWith("https://")
    || value.startsWith("mailto:")
    || value.startsWith("tel:");
}

function isSafeImageUrl(value: string) {
  return value.startsWith("/") || value.startsWith("https://");
}

export function validateCompositionDataSlotPayload(
  payload: CompositionDataSlotPayload,
): { success: true } | { success: false; message: string } {
  if (!isCompositionDataSlotId(payload.slot)) {
    return { success: false, message: `Unknown composition data slot: ${String(payload.slot)}` };
  }

  const contract = getCompositionDataSlotContract(payload.slot);
  if (!Array.isArray(payload.items) || payload.items.length > contract.maxItems) {
    return { success: false, message: `Payload for ${payload.slot} exceeds its item limit` };
  }

  for (const item of payload.items) {
    for (const [field, value] of Object.entries(item)) {
      if (!compositionBindingFields.includes(field as CompositionBindingField) || !contract.fields.includes(field as CompositionBindingField)) {
        return { success: false, message: `Field ${field} is not allowed for ${payload.slot}` };
      }
      if (value !== null && typeof value !== "string" && typeof value !== "number") {
        return { success: false, message: `Field ${field} has an unsupported value type` };
      }
      if (field === "rating" && value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 5)) {
        return { success: false, message: "Rating must be a number from 0 to 5" };
      }
      if (field === "href" && typeof value === "string" && !isSafeHref(value)) {
        return { success: false, message: "Dynamic href uses an unsafe protocol" };
      }
      if (field === "imageUrl" && typeof value === "string" && !isSafeImageUrl(value)) {
        return { success: false, message: "Dynamic image URL must be internal or HTTPS" };
      }
      if (typeof value === "string" && value.length > COMPOSITION_LIMITS.maxTextLength) {
        return { success: false, message: `Field ${field} exceeds the composition text limit` };
      }
    }
  }

  return { success: true };
}
