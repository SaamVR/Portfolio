import {
  type DialogState,
  type FormState,
  type ThemeRow,
  parseJsonField,
  parseStringArrayField,
  slugify,
} from "@/components/admin/cms-library/shared";

export type LibraryMutationTable =
  | "store_blueprints"
  | "theme_packages"
  | "page_blueprints"
  | "block_registry_entries";

export type SaveDialogRequest =
  | {
      table: "store_blueprints";
      idColumn: "id";
      idValue: string;
      payload: Record<string, unknown>;
      isCreate: boolean;
    }
  | {
      table: "theme_packages";
      idColumn: "id";
      idValue: string;
      payload: Record<string, unknown>;
      isCreate: boolean;
    }
  | {
      table: "page_blueprints";
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
    dialogState.type === "blueprint"
      ? "Blueprint"
      : dialogState.type === "theme"
        ? "Theme Package"
      : dialogState.type === "page"
        ? "Page Blueprint"
        : "Block Registry Entry";

  return `${dialogState.mode === "create" ? "Create" : "Edit"} ${itemLabel}`;
}

export function buildSaveDialogRequest(dialogState: Exclude<DialogState, null>, form: FormState): SaveDialogRequest {
  if (dialogState.type === "blueprint") {
    const id = slugify(String(form.id || form.short_name || form.name || ""));
    if (!id || !String(form.name || "").trim() || !String(form.short_name || "").trim()) {
      throw new Error("Blueprint id, name, and short name are required.");
    }

    return {
      table: "store_blueprints",
      idColumn: "id",
      idValue: dialogState.mode === "create" ? id : dialogState.item!.id,
      isCreate: dialogState.mode === "create",
      payload: {
        id,
        name: String(form.name).trim(),
        short_name: String(form.short_name).trim(),
        description: String(form.description || "").trim(),
        business_family: String(form.business_family || "commerce").trim(),
        catalog_mode: String(form.catalog_mode || "multi_product").trim(),
        group_name: String(form.group_name || "General").trim(),
        store_description: String(form.store_description || "").trim(),
        legacy_template_id: String(form.legacy_template_id || "").trim() || null,
        recommended_page_set: parseJsonField(String(form.recommended_page_set || "[]"), "Recommended page set"),
        recommended_block_set: parseJsonField(String(form.recommended_block_set || "[]"), "Recommended block set"),
        required_capabilities: parseStringArrayField(String(form.required_capabilities || "[]"), "Required capabilities"),
        default_theme: parseJsonField(String(form.default_theme || "{}"), "Default theme"),
        hero_payload: parseJsonField(String(form.hero_payload || "{}"), "Hero payload"),
        onboarding_schema: parseJsonField(String(form.onboarding_schema || "{}"), "Onboarding schema"),
        default_site_settings: parseJsonField(String(form.default_site_settings || "{}"), "Default site settings"),
        is_active: Boolean(form.is_active),
      },
    };
  }

  if (dialogState.type === "page") {
    const id = slugify(String(form.id || form.name || ""));
    if (!id || !String(form.name || "").trim()) {
      throw new Error("Page blueprint id and name are required.");
    }

    return {
      table: "page_blueprints",
      idColumn: "id",
      idValue: dialogState.mode === "create" ? id : dialogState.item!.id,
      isCreate: dialogState.mode === "create",
      payload: {
        id,
        name: String(form.name).trim(),
        description: String(form.description || "").trim(),
        business_family: String(form.business_family || "commerce").trim(),
        catalog_modes: parseStringArrayField(String(form.catalog_modes || "[]"), "Catalog modes"),
        page_payload: parseJsonField(String(form.page_payload || "{}"), "Page payload"),
        is_active: Boolean(form.is_active),
      },
    };
  }

  if (dialogState.type === "theme") {
    const id = slugify(String(form.id || form.slug || form.name || ""));
    const slug = slugify(String(form.slug || form.name || ""));
    if (!id || !slug || !String(form.name || "").trim()) {
      throw new Error("Theme package id, slug, and name are required.");
    }

    return {
      table: "theme_packages",
      idColumn: "id",
      idValue: dialogState.mode === "create" ? id : dialogState.item!.id,
      isCreate: dialogState.mode === "create",
      payload: {
        id,
        slug,
        name: String(form.name || "").trim(),
        description: String(form.description || "").trim(),
        source_type: String(form.source_type || "admin_shared").trim(),
        version: Math.max(1, Number(form.version || 1)),
        compatibility_version: Math.max(1, Number(form.compatibility_version || 1)),
        preset_id: String(form.preset_id || "").trim(),
        mode: String(form.mode || "dark").trim(),
        preview_metadata: parseJsonField(String(form.preview_metadata || "{}"), "Preview metadata"),
        tokens: parseJsonField(String(form.tokens || "{}"), "Tokens"),
        component_recipes: parseJsonField(String(form.component_recipes || "{}"), "Component recipes"),
        custom_css: String(form.custom_css || "").trim() || null,
        owner_store_id: String(form.owner_store_id || "").trim() || null,
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
    source_type: "admin_shared",
    owner_store_id: null,
    created_by: userId ?? null,
  };
}
