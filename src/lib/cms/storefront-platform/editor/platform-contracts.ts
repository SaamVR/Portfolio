import type { Store, StorePageBlock } from "@/lib/cms/schema";
import { createRegistryDefaultBlock } from "@/lib/cms/block-registry";
import { resolveStorefrontTemplateSeed } from "@/lib/cms/storefront-template-seeds";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import {
  compositionRecipeRegistry,
  createCompositionDocumentFromRecipe,
  type CompositionRecipeDefinition,
} from "@/lib/cms/storefront-platform/composition/recipes";
import type { CompositionDocument, CompositionNode } from "@/lib/cms/storefront-platform/composition/contracts";
import { compositionDocumentSchema } from "@/lib/cms/storefront-platform/composition/schema";
import {
  evaluateCompositionRecipeCompatibility,
  evaluateStorefrontVariantCompatibility,
  getAvailableStorefrontVariantDefinitions,
  type StorefrontCompatibilityContext,
} from "@/lib/cms/storefront-platform/variants/compatibility";
import type { StorefrontVariantDefinition } from "@/lib/cms/storefront-platform/variants/contracts";
import {
  resolveStorefrontAesthetic,
  type StorefrontAestheticEngineId,
  type StorefrontAestheticProfile,
} from "@/lib/cms/storefront-platform/rendering/aesthetic-engine";

export type PlatformAestheticOption = {
  storedValue: NonNullable<Store["theme"]["aesthetic"]>;
  engineId: StorefrontAestheticEngineId;
  label: string;
  detail: string;
  profile: StorefrontAestheticProfile;
};

const PLATFORM_AESTHETIC_VALUES = ["minimal", "editorial", "glassmorphism", "artisan"] as const;

const AESTHETIC_GUIDANCE: Record<StorefrontAestheticEngineId, string> = {
  flat: "Clean surfaces, restrained motion, and minimal decoration.",
  editorial: "Stronger type hierarchy with magazine-like spacing and framing.",
  glass: "Translucent layered surfaces with a reduced mobile blur profile.",
  artisan: "Warmer surface character with richer but still bounded decoration.",
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getPlatformAestheticOptions(theme: Store["theme"]): PlatformAestheticOption[] {
  return PLATFORM_AESTHETIC_VALUES.map((storedValue) => {
    const profile = resolveStorefrontAesthetic({ ...theme, aesthetic: storedValue });
    return {
      storedValue,
      engineId: profile.id,
      label: profile.id === "flat" ? "Flat / Minimal" : titleCase(profile.id),
      detail: AESTHETIC_GUIDANCE[profile.id],
      profile,
    };
  });
}

function blockSignals(block?: StorePageBlock): Partial<Pick<StorefrontCompatibilityContext, "itemCount" | "itemCountUpperBound" | "mediaCount" | "hasPrimaryMedia">> {
  if (!block) return {};
  const props = (block.props ?? {}) as Record<string, unknown>;
  const hasExplicitImages = Array.isArray(props.images);
  const hasExplicitItems = Array.isArray(props.items);
  const imageList = hasExplicitImages ? (props.images as unknown[]).filter((value) => typeof value === "string" && value.trim()) : [];
  const itemList = hasExplicitItems ? props.items as unknown[] : [];
  const rawLimit = typeof props.limit === "number" ? props.limit : Number(props.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : undefined;
  const exactItemCount = hasExplicitItems ? Math.min(itemList.length, limit ?? itemList.length) : undefined;
  const mediaKeys = ["mediaUrl", "imageUrl", "videoUrl"];
  const hasPrimaryMedia = mediaKeys.some((key) => typeof props[key] === "string" && String(props[key]).trim().length > 0);

  return {
    ...(exactItemCount !== undefined ? { itemCount: exactItemCount } : {}),
    ...(!hasExplicitItems && limit !== undefined ? { itemCountUpperBound: limit } : {}),
    ...(hasExplicitImages ? { mediaCount: imageList.length } : hasPrimaryMedia ? { mediaCount: 1 } : {}),
    hasPrimaryMedia,
  };
}

export function buildEditorCompatibilityContext(
  templateId: StorefrontTemplateId,
  block?: StorePageBlock,
): StorefrontCompatibilityContext {
  const seed = resolveStorefrontTemplateSeed(templateId);
  return {
    businessFamily: seed.businessFamily,
    capabilities: seed.capabilities,
    templateId,
    ...blockSignals(block),
  };
}

function recommendationRank(definition: StorefrontVariantDefinition, context: StorefrontCompatibilityContext) {
  if (definition.recommendedFor?.templateIds?.includes(context.templateId ?? "")) return 0;
  if (definition.recommendedFor?.businessFamilies?.includes(context.businessFamily)) return 1;
  if (definition.editor.badge === "recommended") return 2;
  return 3;
}

export function getCompatibleVariantDefinitions(
  templateId: StorefrontTemplateId,
  blockType: StorePageBlock["type"],
  block?: StorePageBlock,
): StorefrontVariantDefinition[] {
  const context = buildEditorCompatibilityContext(templateId, block);
  return getAvailableStorefrontVariantDefinitions(blockType, context, { currentVariantId: block?.layoutVariant })
    .filter((definition) => evaluateStorefrontVariantCompatibility(definition, context).compatible)
    .sort((left, right) => recommendationRank(left, context) - recommendationRank(right, context) || left.editor.order - right.editor.order);
}

export type CompositionRecipeEditorOption = CompositionRecipeDefinition & { recommended: boolean };

export function getCompatibleCompositionRecipes(templateId: StorefrontTemplateId): CompositionRecipeEditorOption[] {
  const context = buildEditorCompatibilityContext(templateId);
  return compositionRecipeRegistry
    .filter((recipe) => evaluateCompositionRecipeCompatibility(recipe, context).compatible)
    .map((recipe) => ({ ...recipe, recommended: recipe.recommendedTemplateIds.includes(templateId) }))
    .sort((left, right) => Number(right.recommended) - Number(left.recommended));
}

function documentToProps(document: CompositionDocument): Record<string, unknown> {
  return {
    schemaVersion: document.schemaVersion,
    ...(document.recipeId ? { recipeId: document.recipeId } : {}),
    tree: document.tree,
  };
}

export function createCompositionBlockFromRecipe(recipeId: string, sortOrder: number): StorePageBlock {
  const block = createRegistryDefaultBlock("composition", sortOrder);
  if (block.type !== "composition") throw new Error("Composition registry default did not return a composition block.");
  const document = createCompositionDocumentFromRecipe(recipeId);
  return { ...block, props: documentToProps(document) } as StorePageBlock;
}

export function applyCompositionRecipe(block: StorePageBlock, recipeId: string): StorePageBlock {
  if (block.type !== "composition") return block;
  const document = createCompositionDocumentFromRecipe(recipeId);
  return { ...block, props: documentToProps(document) } as StorePageBlock;
}

function findNode(node: CompositionNode, nodeId: string): CompositionNode | undefined {
  if (node.id === nodeId) return node;
  for (const child of node.children ?? []) {
    const match = findNode(child, nodeId);
    if (match) return match;
  }
  return undefined;
}

function updateCompositionDocument(block: StorePageBlock, updater: (document: CompositionDocument) => void): StorePageBlock {
  if (block.type !== "composition") return block;
  const parsed = compositionDocumentSchema.parse(block.props);
  const document = structuredClone(parsed);
  updater(document);
  const validated = compositionDocumentSchema.parse(document);
  return { ...block, props: documentToProps(validated) } as StorePageBlock;
}

export type CompositionEditorField = {
  nodeId: string;
  primitive: string;
  key: "text" | "src" | "alt";
  label: string;
  value: string;
  multiline: boolean;
};

export type CompositionEditorAction = {
  nodeId: string;
  index: number;
  label: string;
  href: string;
};

export function getCompositionEditorFields(block: StorePageBlock | null) {
  const fields: CompositionEditorField[] = [];
  const actions: CompositionEditorAction[] = [];
  if (!block || block.type !== "composition") return { fields, actions, recipeId: undefined as string | undefined };
  const parsed = compositionDocumentSchema.safeParse(block.props);
  if (!parsed.success) return { fields, actions, recipeId: undefined as string | undefined };

  const visit = (node: CompositionNode) => {
    const props = node.props as Record<string, unknown>;
    if (["heading", "text", "badge"].includes(node.primitive) && typeof props.text === "string") {
      fields.push({ nodeId: node.id, primitive: node.primitive, key: "text", label: node.primitive === "heading" ? "Heading" : node.primitive === "badge" ? "Badge" : "Text", value: props.text, multiline: node.primitive === "text" });
    }
    if (node.primitive === "image") {
      if (typeof props.src === "string") fields.push({ nodeId: node.id, primitive: node.primitive, key: "src", label: "Image", value: props.src, multiline: false });
      if (typeof props.alt === "string") fields.push({ nodeId: node.id, primitive: node.primitive, key: "alt", label: "Image alt text", value: props.alt, multiline: false });
    }
    if (node.primitive === "cta-group" && Array.isArray(props.actions)) {
      props.actions.forEach((action, index) => {
        if (!action || typeof action !== "object") return;
        const record = action as Record<string, unknown>;
        actions.push({ nodeId: node.id, index, label: typeof record.label === "string" ? record.label : "", href: typeof record.href === "string" ? record.href : "" });
      });
    }
    node.children?.forEach(visit);
  };
  visit(parsed.data.tree);
  return { fields, actions, recipeId: parsed.data.recipeId };
}

export function updateCompositionField(block: StorePageBlock, nodeId: string, key: "text" | "src" | "alt", value: string): StorePageBlock {
  return updateCompositionDocument(block, (document) => {
    const node = findNode(document.tree, nodeId);
    if (!node) throw new Error(`Composition node ${nodeId} was not found.`);
    node.props = { ...node.props, [key]: value };
  });
}

export function updateCompositionAction(block: StorePageBlock, nodeId: string, index: number, patch: { label?: string; href?: string }): StorePageBlock {
  return updateCompositionDocument(block, (document) => {
    const node = findNode(document.tree, nodeId);
    if (!node || node.primitive !== "cta-group") throw new Error(`CTA node ${nodeId} was not found.`);
    const actions = Array.isArray(node.props.actions) ? structuredClone(node.props.actions) as Array<Record<string, unknown>> : [];
    if (!actions[index]) throw new Error(`CTA action ${index} was not found.`);
    actions[index] = { ...actions[index], ...patch };
    node.props = { ...node.props, actions };
  });
}
