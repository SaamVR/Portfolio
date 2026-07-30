import {
  storePageBlockSchema,
  storePageSchema,
  storeSchema,
  type Store,
  type StoreTheme,
  type StorePage,
  type StorePageBlock,
} from "@/lib/cms/schema";

const unsafeBlockCustomCssPatterns = [
  /@import/i,
  /expression\s*\(/i,
  /javascript:/i,
  /url\s*\(/i,
  /<\/style/i,
  /<script/i,
] as const;

const blockedHtmlPatterns = [
  /<script\b[\s\S]*?<\/script>/gi,
  /\son\w+\s*=\s*(['"]).*?\1/gi,
  /\son\w+\s*=\s*[^\s>]+/gi,
  /javascript:/gi,
  /<iframe\b[\s\S]*?<\/iframe>/gi,
] as const;

const unsafeThemeCustomCssPatterns = [
  /@import/i,
  /expression\s*\(/i,
  /javascript:/i,
  /url\s*\(/i,
  /<\/style/i,
  /<script/i,
] as const;

function normalizeBlockOrder(block: StorePageBlock, sortOrder: number): StorePageBlock {
  return {
    ...block,
    sortOrder,
  };
}

export function sanitizeStoreBlockCustomCss(customCss?: string | null) {
  if (!customCss?.trim()) return undefined;
  if (unsafeBlockCustomCssPatterns.some((pattern) => pattern.test(customCss))) {
    return undefined;
  }
  return customCss.trim();
}

export function sanitizeStoreBlockCustomHtml(customHtml?: string | null) {
  if (!customHtml?.trim()) return undefined;

  let sanitized = customHtml;
  for (const pattern of blockedHtmlPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  sanitized = sanitized.trim();
  return sanitized || undefined;
}

export function sanitizeStoreThemeCustomCss(customCss?: string | null) {
  if (!customCss?.trim()) return undefined;
  if (unsafeThemeCustomCssPatterns.some((pattern) => pattern.test(customCss))) {
    return undefined;
  }
  return customCss.trim();
}

export function sanitizeStoreThemeHtmlInjection(markup?: string | null) {
  if (!markup?.trim()) return undefined;

  let sanitized = markup;
  for (const pattern of blockedHtmlPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  sanitized = sanitized.trim();
  return sanitized || undefined;
}

export function sanitizeStoreTheme(theme: StoreTheme, options?: { allowAdvanced?: boolean }): StoreTheme {
  const allowAdvanced = options?.allowAdvanced ?? false;

  return {
    ...theme,
    customCss: allowAdvanced ? sanitizeStoreThemeCustomCss(theme.customCss) : undefined,
    globalHeadInjection: allowAdvanced ? sanitizeStoreThemeHtmlInjection(theme.globalHeadInjection) : undefined,
    globalBodyInjection: allowAdvanced ? sanitizeStoreThemeHtmlInjection(theme.globalBodyInjection) : undefined,
  };
}

function sanitizeBlockContent(block: StorePageBlock, options?: { allowAdvanced?: boolean }): StorePageBlock {
  const allowAdvanced = options?.allowAdvanced ?? false;
  return {
    ...block,
    customHtml: allowAdvanced ? sanitizeStoreBlockCustomHtml(block.customHtml) : undefined,
    customCss: allowAdvanced ? sanitizeStoreBlockCustomCss(block.customCss) : undefined,
  };
}

export function sanitizeStoreBlocks(blocks: unknown[], options?: { allowAdvanced?: boolean }): StorePageBlock[] {
  return blocks
    .map((block) => storePageBlockSchema.safeParse(block))
    .filter((result): result is Extract<typeof result, { success: true }> => result.success)
    .map((result, index) => normalizeBlockOrder(sanitizeBlockContent(result.data, options), index));
}

export function sanitizeStorePage(page: {
  id: string;
  slug: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  isHomepage?: boolean;
  blocks: unknown[];
}, options?: { allowAdvanced?: boolean }): StorePage | null {
  const candidate = {
    ...page,
    blocks: sanitizeStoreBlocks(page.blocks, options),
  };

  const parsed = storePageSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function validateStoreForPersistence(store: Store) {
  return storeSchema.safeParse({
    ...store,
    theme: sanitizeStoreTheme(store.theme, { allowAdvanced: true }),
    pages: store.pages.map((page) => ({
      ...page,
      blocks: sanitizeStoreBlocks(page.blocks, { allowAdvanced: true }),
    })),
  });
}
