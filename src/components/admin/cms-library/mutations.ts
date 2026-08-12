import {
  themePackageSchema,
  buildThemePackageExport,
  type ThemePackageDefinition,
} from "@/lib/theme-packages";
import { reservedCmsSlugs } from "@/lib/cms/block-library";
import { getCmsBlockRegistryItem, type CmsBlockRegistryItem } from "@/lib/cms/block-registry";
import { normalizePageTemplatePayload } from "@/lib/cms/page-templates";
import {
  type BlockRow,
  type DialogState,
  type FormState,
  type ThemeRow,
  parseJsonField,
  parseStringArrayField,
  slugify,
} from "@/components/admin/cms-library/shared";

export type LibraryMutationTable =
  | "theme_packages"
  | "block_registry_entries";

export type SaveDialogRequest =
  | {
      table: "theme_packages";
      idColumn: "id";
      idValue: string;
      payload: Record<string, unknown>;
      isCreate: boolean;
    }
  | {
      table: "block_registry_entries";
      idColumn: "block_type";
      idValue: string;
      payload: Record<string, unknown>;
      isCreate: boolean;
    };

export function getActiveDialogTitle(dialogState: DialogState) {
  if (!dialogState) return "";

  const itemLabel =
    dialogState.type === "theme"
        ? "Theme Package"
      : dialogState.type === "page"
        ? "Page Template"
        : "Block Registry Entry";

  return `${dialogState.mode === "create" ? "Create" : "Edit"} ${itemLabel}`;
}

type SaveDialogRequestOptions = {
  blockRegistry?: BlockRow[];
};

function normalizeBlockRegistryForValidation(blockRegistry?: BlockRow[]): CmsBlockRegistryItem[] | undefined {
  if (!blockRegistry?.length) {
    return undefined;
  }

  return blockRegistry.map((item) => ({
    value: item.block_type as CmsBlockRegistryItem["value"],
    label: item.label,
    description: item.description,
    layer: item.layer === "core" || item.layer === "commerce" || item.layer === "extension" ? item.layer : "core",
    compatibleBusinessFamilies: Array.isArray(item.compatible_business_families)
      ? item.compatible_business_families.filter((value): value is CmsBlockRegistryItem["compatibleBusinessFamilies"][number] => typeof value === "string")
      : [],
    requiredCapabilities: Array.isArray(item.required_capabilities)
      ? item.required_capabilities.filter((value): value is string => typeof value === "string")
      : [],
    variantIds: [],
    presetIds: [],
  }));
}

export function buildSaveDialogRequest(
  dialogState: Exclude<DialogState, null>,
  form: FormState,
  options?: SaveDialogRequestOptions,
): SaveDialogRequest {
  if (dialogState.type === "page") {
    const id = slugify(String(form.id || form.name || ""));
    if (!id || !String(form.name || "").trim()) {
      throw new Error("Page template id and name are required.");
    }
    const businessFamily = String(form.business_family || "commerce").trim();

    const normalizedPagePayload = normalizePageTemplatePayload(
      parseJsonField(String(form.page_payload || "{}"), "Page payload"),
    );

    if (normalizedPagePayload.slug !== "/" && reservedCmsSlugs.has(normalizedPagePayload.slug)) {
      throw new Error(`"${normalizedPagePayload.slug}" is reserved for storefront routing.`);
    }

    for (const block of normalizedPagePayload.blocks) {
      const registryItem = getCmsBlockRegistryItem(block.type, normalizeBlockRegistryForValidation(options?.blockRegistry));
      if (!registryItem.compatibleBusinessFamilies.includes(businessFamily as typeof registryItem.compatibleBusinessFamilies[number])) {
        throw new Error(`Block "${block.type}" is not compatible with the ${businessFamily} business family.`);
      }
    }

    throw new Error("Shared page template management has been retired.");
  }

  if (dialogState.type === "theme") {
    const id = slugify(String(form.id || form.slug || form.name || ""));
    const slug = slugify(String(form.slug || form.name || ""));
    if (!id || !slug || !String(form.name || "").trim()) {
      throw new Error("Theme package id, slug, and name are required.");
    }

    const validatedTheme = buildThemePackageExport(themePackageSchema.parse({
      id,
      slug,
      name: String(form.name || "").trim(),
      description: String(form.description || "").trim(),
      sourceType: String(form.source_type || "admin_shared").trim(),
      version: Math.max(1, Number(form.version || 1)),
      compatibilityVersion: Math.max(1, Number(form.compatibility_version || 1)),
      presetId: String(form.preset_id || "").trim(),
      mode: String(form.mode || "dark").trim(),
      preview: parseJsonField(String(form.preview_metadata || "{}"), "Preview metadata"),
      tokens: parseJsonField(String(form.tokens || "{}"), "Tokens"),
      recipes: parseJsonField(String(form.component_recipes || "{}"), "Component recipes"),
      customCss: String(form.custom_css || "").trim() || undefined,
      ownerStoreId: String(form.owner_store_id || "").trim() || null,
    })) as ThemePackageDefinition;

    return {
      table: "theme_packages",
      idColumn: "id",
      idValue: dialogState.mode === "create" ? id : dialogState.item!.id,
      isCreate: dialogState.mode === "create",
      payload: {
        id: validatedTheme.id,
        slug: validatedTheme.slug,
        name: validatedTheme.name,
        description: validatedTheme.description,
        source_type: validatedTheme.sourceType,
        version: validatedTheme.version,
        compatibility_version: validatedTheme.compatibilityVersion,
        preset_id: validatedTheme.presetId,
        mode: validatedTheme.mode,
        preview_metadata: validatedTheme.preview,
        tokens: validatedTheme.tokens,
        component_recipes: validatedTheme.recipes,
        custom_css: validatedTheme.customCss ?? null,
        owner_store_id: validatedTheme.ownerStoreId ?? null,
        is_active: Boolean(form.is_active),
      },
    };
  }

  const blockType = slugify(String(form.block_type || ""));
  if (!blockType || !String(form.label || "").trim()) {
    throw new Error("Block type and label are required.");
  }

  return {
    table: "block_registry_entries",
    idColumn: "block_type",
    idValue: dialogState.mode === "create" ? blockType : dialogState.item!.block_type,
    isCreate: dialogState.mode === "create",
    payload: {
      block_type: blockType,
      label: String(form.label).trim(),
      description: String(form.description || "").trim(),
      layer: String(form.layer || "core").trim(),
      compatible_business_families: parseStringArrayField(String(form.compatible_business_families || "[]"), "Compatible business families"),
      required_capabilities: parseStringArrayField(String(form.required_capabilities || "[]"), "Required capabilities"),
      is_active: Boolean(form.is_active),
    },
  };
}

export function buildThemePromotionPayload(item: ThemeRow, userId?: string | null) {
  if (item.source_type === "admin_shared" || item.source_type === "system") {
    throw new Error("Theme is already shared.");
  }

  return {
    id: `${item.id}-shared-${Date.now()}`,
    slug: `${item.slug}-shared-${Date.now()}`,
    name: `${item.name} Shared`,
    description: item.description,
    source_type: "admin_shared",
    version: Number(item.version ?? 1),
    compatibility_version: Number(item.compatibility_version ?? 1),
    preset_id: item.preset_id,
    mode: item.mode,
    preview_metadata: item.preview_metadata,
    tokens: item.tokens,
    component_recipes: item.component_recipes,
    custom_css: item.custom_css,
    owner_store_id: null,
    is_active: true,
    created_by: userId ?? null,
  };
}
