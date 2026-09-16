import type { Product } from "@/data/products";
import {
  buildCommercialSelectionWithDefaults,
  getCommercialSelectionPrice,
  getDefaultCommercialSelection,
} from "@/lib/commerce/product-commercial-options";

export type ProductCartSelection = {
  optionIds: string[];
  label: string;
  unitPrice: number;
  fulfillmentType: "physical" | "digital";
};

function finalizeSelection(
  product: Product,
  selection: { optionIds: string[]; label: string; complete?: boolean },
  fallbackLabel: string,
): ProductCartSelection | null {
  if (selection.complete === false) return null;
  const unitPrice = getCommercialSelectionPrice(product.price, product.commercialOptions ?? [], selection.optionIds);
  if (unitPrice === null) return null;
  return {
    optionIds: selection.optionIds,
    label: selection.label || fallbackLabel || "Default option",
    unitPrice,
    fulfillmentType: product.fulfillmentType ?? "physical",
  };
}

export function resolveDefaultProductCartSelection(product: Product, fallbackLabel = "Default option") {
  return finalizeSelection(product, getDefaultCommercialSelection(product.commercialOptions ?? []), fallbackLabel);
}

export function resolveProductCartSelection(
  product: Product,
  selections: Array<{ groupKey: string; label?: string | null }>,
  fallbackLabel = "Default option",
) {
  return finalizeSelection(
    product,
    buildCommercialSelectionWithDefaults(product.commercialOptions ?? [], selections),
    fallbackLabel,
  );
}
