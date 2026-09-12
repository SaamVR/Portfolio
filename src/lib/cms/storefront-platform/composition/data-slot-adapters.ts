import type { StorePageBlock } from "@/lib/cms/schema";
import type { CompositionDocument, CompositionNode, CompositionDataSourceMode } from "@/lib/cms/storefront-platform/composition/contracts";
import {
  buildCompositionDataSlotRequest,
  getCompositionDataSlotContract,
  type CompositionDataSlotRequest,
} from "@/lib/cms/storefront-platform/composition/data-slot-contracts";

function productSource(source: string | undefined): CompositionDataSourceMode {
  if (source === "featured" || source === "all" || source === "newest" || source === "category" || source === "type") {
    return source;
  }
  return "featured-or-all";
}

function categorySource(source: string | undefined): CompositionDataSourceMode {
  if (source === "auto") return "auto";
  if (source === "types") return "type";
  return "default";
}

function boundedLimit(slot: CompositionDataSlotRequest["slot"], value: number | undefined, fallback: number) {
  return Math.min(value ?? fallback, getCompositionDataSlotContract(slot).maxItems);
}

export function adaptStorePageBlockToCompositionDataSlots(block: StorePageBlock): CompositionDataSlotRequest[] {
  switch (block.type) {
    case "featured-products":
      return [buildCompositionDataSlotRequest({
        nodeId: block.id,
        slot: "featured-products",
        source: productSource(block.props.source),
        limit: boundedLimit("featured-products", block.props.limit, 6),
        filters: { category: block.props.category, productType: block.props.productType },
      })];
    case "recommended-products":
      return [buildCompositionDataSlotRequest({
        nodeId: block.id,
        slot: "products",
        source: productSource(block.props.source),
        limit: boundedLimit("products", block.props.limit, 4),
        filters: { category: block.props.category, productType: block.props.productType },
      })];
    case "comparison":
      return [buildCompositionDataSlotRequest({
        nodeId: block.id,
        slot: "products",
        source: productSource(block.props.source),
        limit: boundedLimit("products", block.props.limit, 2),
        filters: { category: block.props.category, productType: block.props.productType },
      })];
    case "category-showcase":
      return [buildCompositionDataSlotRequest({
        nodeId: block.id,
        slot: "categories",
        source: categorySource(block.props.source),
        limit: boundedLimit("categories", block.props.limit, 12),
      })];
    case "rich-text":
      return [buildCompositionDataSlotRequest({ nodeId: block.id, slot: "content", source: "manual", limit: 1 })];
    case "testimonials":
      return [buildCompositionDataSlotRequest({
        nodeId: block.id,
        slot: "testimonials",
        source: block.props.source ?? "manual",
        limit: boundedLimit("testimonials", block.props.limit, Math.max(1, block.props.reviews.length || 6)),
      })];
    case "faq-accordion":
      return [buildCompositionDataSlotRequest({
        nodeId: block.id,
        slot: "faq",
        source: "manual",
        limit: boundedLimit("faq", block.props.faqs.length || undefined, 6),
      })];
    default:
      return [];
  }
}

export function collectCompositionDataSlotRequests(document: CompositionDocument): CompositionDataSlotRequest[] {
  const requests: CompositionDataSlotRequest[] = [];

  const visit = (node: CompositionNode) => {
    if (node.primitive === "data-slot") {
      const slot = node.props.slot as CompositionDataSlotRequest["slot"];
      const source = (node.props.source ?? "default") as CompositionDataSourceMode;
      const limit = (node.props.limit ?? 6) as number;
      requests.push(buildCompositionDataSlotRequest({
        nodeId: node.id,
        slot,
        source,
        limit,
        filters: {
          category: typeof node.props.category === "string" ? node.props.category : undefined,
          productType: typeof node.props.productType === "string" ? node.props.productType : undefined,
        },
      }));
    }

    node.children?.forEach(visit);
  };

  visit(document.tree);
  return requests;
}
