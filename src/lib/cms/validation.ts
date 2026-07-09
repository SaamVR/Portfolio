import {
  storePageBlockSchema,
  storePageSchema,
  storeSchema,
  type Store,
  type StorePage,
  type StorePageBlock,
} from "@/lib/cms/schema";

function normalizeBlockOrder(block: StorePageBlock, sortOrder: number): StorePageBlock {
  return {
    ...block,
    sortOrder,
  };
}

export function sanitizeStoreBlocks(blocks: unknown[]): StorePageBlock[] {
  return blocks
    .map((block) => storePageBlockSchema.safeParse(block))
    .filter((result): result is Extract<typeof result, { success: true }> => result.success)
    .map((result, index) => normalizeBlockOrder(result.data, index));
}

export function sanitizeStorePage(page: {
  id: string;
  slug: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  isHomepage?: boolean;
  blocks: unknown[];
}): StorePage | null {
  const candidate = {
    ...page,
    blocks: sanitizeStoreBlocks(page.blocks),
  };

  const parsed = storePageSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function validateStoreForPersistence(store: Store) {
  return storeSchema.safeParse(store);
}
