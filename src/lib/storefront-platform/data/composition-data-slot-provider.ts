import type { Product } from "@/data/products";
import type { Store, StorePageBlock } from "@/lib/cms/schema";
import {
  validateCompositionDataSlotPayload,
  type CompositionDataSlotItem,
  type CompositionDataSlotPayload,
  type CompositionDataSlotRequest,
} from "@/lib/cms/storefront-platform/composition/data-slot-contracts";
import { productUrl, storefrontPath } from "@/lib/slug";

export interface CompositionDataProviderInput {
  products: Product[];
  store: Store | null;
}

function formatProductPrice(product: Product, store: Store | null) {
  const locale = store?.locale || "en-BD";
  const currency = store?.currencyCode || "BDT";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(product.price);
  } catch {
    return `${currency} ${product.price.toLocaleString()}`;
  }
}

function visibleBlocks(store: Store | null): StorePageBlock[] {
  if (!store) return [];
  return store.pages.flatMap((page) => page.blocks).filter((block) => block.isVisible ?? block.visible ?? true);
}

function flattenRichText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const own = typeof record.text === "string" ? record.text : "";
  const nested = Array.isArray(record.content) ? record.content.map(flattenRichText).filter(Boolean).join(" ") : "";
  return [own, nested].filter(Boolean).join(" ").trim();
}
function filterProducts(request: CompositionDataSlotRequest, products: Product[]) {
  let result = products.filter((product) => {
    if (request.filters?.category && product.category !== request.filters.category) return false;
    if (request.filters?.productType && product.type !== request.filters.productType) return false;
    return true;
  });

  if (request.source === "featured") result = result.filter((product) => product.featured);
  if (request.source === "featured-or-all") {
    const featured = result.filter((product) => product.featured);
    result = featured.length > 0 ? featured : result;
  }
  if (request.slot === "featured-products" && (request.source === "default" || request.source === "featured")) {
    result = result.filter((product) => product.featured);
  }

  return result.slice(0, request.limit);
}

function productItems(request: CompositionDataSlotRequest, input: CompositionDataProviderInput): CompositionDataSlotItem[] {
  return filterProducts(request, input.products).map((product) => ({
    title: product.name,
    name: product.name,
    priceLabel: formatProductPrice(product, input.store),
    imageUrl: product.image || null,
    imageAlt: product.name,
    href: productUrl(product.id, product.name, input.store?.slug),
    label: product.badge ?? null,
  }));
}

function categoryItems(request: CompositionDataSlotRequest, input: CompositionDataProviderInput): CompositionDataSlotItem[] {
  const source = filterProducts({ ...request, source: "all" }, input.products);
  const byCategory = new Map<string, Product>();
  for (const product of source) {
    if (product.category && !byCategory.has(product.category)) byCategory.set(product.category, product);
  }

  return Array.from(byCategory.entries()).slice(0, request.limit).map(([category, product]) => ({
    title: category,
    label: category,
    imageUrl: product.image || null,
    imageAlt: category,
    href: storefrontPath(`/shop?category=${encodeURIComponent(category)}`, input.store?.slug),
  }));
}
function contentItems(input: CompositionDataProviderInput): CompositionDataSlotItem[] {
  const block = visibleBlocks(input.store).find((item) => item.type === "rich-text");
  if (!block || block.type !== "rich-text") return [];
  return [{
    title: block.props.title,
    body: flattenRichText(block.props.body),
    imageUrl: block.props.imageUrl ?? null,
    imageAlt: block.props.imageAlt ?? block.props.title,
  }];
}

function testimonialItems(request: CompositionDataSlotRequest, input: CompositionDataProviderInput): CompositionDataSlotItem[] {
  const reviews = visibleBlocks(input.store)
    .filter((block): block is Extract<StorePageBlock, { type: "testimonials" }> => block.type === "testimonials")
    .flatMap((block) => block.props.reviews);
  return reviews.slice(0, request.limit).map((review) => ({
    name: review.name,
    body: review.comment,
    rating: review.rating,
  }));
}

function faqItems(request: CompositionDataSlotRequest, input: CompositionDataProviderInput): CompositionDataSlotItem[] {
  const faqs = visibleBlocks(input.store)
    .filter((block): block is Extract<StorePageBlock, { type: "faq-accordion" }> => block.type === "faq-accordion")
    .flatMap((block) => block.props.faqs);
  return faqs.slice(0, request.limit).map((faq) => ({ question: faq.q, answer: faq.a }));
}

export function buildCompositionDataSlotPayload(
  request: CompositionDataSlotRequest,
  input: CompositionDataProviderInput,
): CompositionDataSlotPayload {
  let items: CompositionDataSlotItem[] = [];
  if (request.slot === "products" || request.slot === "featured-products") items = productItems(request, input);
  else if (request.slot === "categories") items = categoryItems(request, input);
  else if (request.slot === "content") items = contentItems(input).slice(0, request.limit);
  else if (request.slot === "testimonials") items = testimonialItems(request, input);
  else if (request.slot === "faq") items = faqItems(request, input);

  const payload: CompositionDataSlotPayload = { slot: request.slot, items };
  const validation = validateCompositionDataSlotPayload(payload);
  if (!validation.success) throw new Error(validation.message);
  return payload;
}
