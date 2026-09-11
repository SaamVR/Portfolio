import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontBlockType } from "@/lib/cms/storefront-templates";
import type { StorefrontLayoutPreset, StorefrontLayoutPresetSection } from "@/lib/cms/storefront-layout-presets";

export type StorefrontLayoutPresetApplicationResult = {
  blocks: StorePageBlock[];
  addedSlotIds: string[];
  reusedBlockIds: string[];
  appendedExtraBlockIds: string[];
};

function createTruthSafePresetBlock(type: StorefrontBlockType, sortOrder: number): StorePageBlock {
  const base = {
    id: crypto.randomUUID(),
    type,
    sortOrder,
    isVisible: true,
    visible: true,
  } as const;

  if (type === "rich-text") {
    return {
      ...base,
      type: "rich-text",
      props: { title: "Our story", body: "", align: "left" },
    };
  }

  if (type === "featured-products") {
    return { ...base, type: "featured-products", props: { limit: 6 } };
  }

  if (type === "recommended-products") {
    return { ...base, type: "recommended-products", props: { limit: 4 } };
  }

  if (type === "comparison") {
    return { ...base, type: "comparison", props: { limit: 2, specLabels: [] } };
  }

  return { ...base, props: {} } as StorePageBlock;
}

function mergeSuggestedProps(
  block: StorePageBlock,
  section: StorefrontLayoutPresetSection,
): StorePageBlock {
  const suggested = section.props ?? {};
  const currentProps = (block.props ?? {}) as Record<string, unknown>;
  const nextProps = { ...currentProps };

  for (const [key, value] of Object.entries(suggested)) {
    if (nextProps[key] === undefined) nextProps[key] = value;
  }

  return {
    ...block,
    layoutVariant: section.layoutVariant ?? block.layoutVariant,
    props: nextProps,
  } as StorePageBlock;
}

export function applyStorefrontLayoutPreset(
  blocks: readonly StorePageBlock[],
  preset: StorefrontLayoutPreset,
): StorefrontLayoutPresetApplicationResult {
  const original = [...blocks].sort((left, right) => left.sortOrder - right.sortOrder);
  const queues = new Map<StorefrontBlockType, StorePageBlock[]>();

  for (const block of original) {
    const queue = queues.get(block.type) ?? [];
    queue.push(block);
    queues.set(block.type, queue);
  }

  const usedIds = new Set<string>();
  const addedSlotIds: string[] = [];
  const reusedBlockIds: string[] = [];
  const arranged: StorePageBlock[] = [];

  for (const section of preset.sections) {
    const queue = queues.get(section.type) ?? [];
    const existing = queue.find((block) => !usedIds.has(block.id));

    if (existing) {
      usedIds.add(existing.id);
      reusedBlockIds.push(existing.id);
      arranged.push(mergeSuggestedProps(existing, section));
      continue;
    }

    if (section.optional) continue;

    const created = mergeSuggestedProps(
      createTruthSafePresetBlock(section.type, arranged.length),
      section,
    );
    addedSlotIds.push(section.slotId);
    arranged.push(created);
  }

  const extras = original.filter((block) => !usedIds.has(block.id));
  const appendedExtraBlockIds = extras.map((block) => block.id);
  const ordered = [...arranged, ...extras].map((block, sortOrder) => ({
    ...block,
    sortOrder,
  }));

  return {
    blocks: ordered,
    addedSlotIds,
    reusedBlockIds,
    appendedExtraBlockIds,
  };
}
