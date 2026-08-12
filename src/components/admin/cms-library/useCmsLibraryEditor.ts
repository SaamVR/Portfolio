"use client";

import { useMemo, useState } from "react";
import { createDefaultBlock } from "@/lib/cms/block-library";
import {
  type ThemeEditorPayload,
  buildBlockForm,
  buildPageForm,
  buildThemeForm,
  type DialogState,
  type FormState,
  readPagePayload,
  readThemeEditorPayload,
  readStringArray,
  updatePagePayloadBlocks,
  updatePagePayloadField,
  updateThemeJsonField,
  writeStringArray,
} from "@/components/admin/cms-library/shared";

export function useCmsLibraryEditor() {
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [form, setForm] = useState<FormState>({});

  const updateField = (key: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleStringArrayField = (key: string, value: string, checked: boolean) => {
    const currentValues = readStringArray(form[key]);
    const nextValues = checked
      ? [...currentValues, value]
      : currentValues.filter((entry) => entry !== value);
    updateField(key, writeStringArray(nextValues));
  };

  const updateDelimitedStringArrayField = (key: string, raw: string) => {
    const values = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    updateField(key, writeStringArray(values));
  };

  const updateThemePreviewField = (key: "bg" | "primary" | "accent", value: string) => {
    updateField("preview_metadata", updateThemeJsonField(form.preview_metadata, { [key]: value }));
  };

  const updateThemeTypographyField = (key: "headingFont" | "bodyFont", value: string) => {
    const themePayload = readThemeEditorPayload(form.preview_metadata, form.tokens);
    updateField("tokens", JSON.stringify({
      ...themePayload.tokens,
      typography: {
        ...themePayload.tokens.typography,
        [key]: value,
      },
    }, null, 2));
  };

  const updateThemeBorderRadius = (value: string) => {
    const themePayload = readThemeEditorPayload(form.preview_metadata, form.tokens);
    updateField("tokens", JSON.stringify({
      ...themePayload.tokens,
      components: {
        ...themePayload.tokens.components,
        borderRadius: value,
      },
    }, null, 2));
  };

  const pagePayload = useMemo(
    () => readPagePayload(form.page_payload),
    [form.page_payload],
  );

  const updatePagePayloadMeta = (key: "slug" | "title" | "seoTitle" | "seoDescription", value: string) => {
    updateField("page_payload", updatePagePayloadField(form.page_payload, { [key]: value }));
  };

  const updatePagePayloadHomepage = (checked: boolean) => {
    updateField("page_payload", updatePagePayloadField(form.page_payload, { isHomepage: checked }));
  };

  const addPagePayloadBlock = (type: string) => {
    const nextBlocks = [
      ...pagePayload.blocks,
      createDefaultBlock(type as never, pagePayload.blocks.length),
    ].map((block, index) => ({
      ...block,
      sortOrder: index,
    }));
    updateField("page_payload", updatePagePayloadField(form.page_payload, { blocks: nextBlocks }));
  };

  const removePagePayloadBlock = (index: number) => {
    const nextBlocks = pagePayload.blocks
      .filter((_, blockIndex) => blockIndex !== index)
      .map((block, blockIndex) => ({
        ...block,
        sortOrder: blockIndex,
      }));
    updateField("page_payload", updatePagePayloadField(form.page_payload, { blocks: nextBlocks }));
  };

  const movePagePayloadBlock = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= pagePayload.blocks.length) return;

    const blocks = [...pagePayload.blocks];
    const [block] = blocks.splice(index, 1);
    blocks.splice(nextIndex, 0, block);
    updateField("page_payload", updatePagePayloadField(form.page_payload, {
      blocks: blocks.map((item, blockIndex) => ({
        ...item,
        sortOrder: blockIndex,
      })),
    }));
  };

  const updatePagePayloadBlock = (index: number, patch: Record<string, unknown>) => {
    const nextBlocks = pagePayload.blocks.map((block, blockIndex) => (
      blockIndex === index ? { ...block, ...patch } : block
    ));
    updateField("page_payload", updatePagePayloadBlocks(form.page_payload, nextBlocks));
  };

  const updatePagePayloadBlockProps = (index: number, patch: Record<string, unknown>) => {
    const nextBlocks = pagePayload.blocks.map((block, blockIndex) => (
      blockIndex === index
        ? {
            ...block,
            props: {
              ...(block.props && typeof block.props === "object" ? block.props : {}),
              ...patch,
            },
          }
        : block
    ));
    updateField("page_payload", updatePagePayloadBlocks(form.page_payload, nextBlocks));
  };

  const openCreateDialog = (type: NonNullable<DialogState>["type"]) => {
    setDialogState({ mode: "create", type });
    setForm(
      type === "theme"
          ? buildThemeForm()
        : type === "page"
          ? buildPageForm()
          : buildBlockForm(),
    );
  };

  const openEditDialog = (state: Exclude<DialogState, null>) => {
    setDialogState(state);
    setForm(
      state.type === "theme"
          ? buildThemeForm(state.item)
        : state.type === "page"
          ? buildPageForm(state.item)
          : buildBlockForm(state.item),
    );
  };

  const selectedCapabilities = useMemo(() => readStringArray(form.required_capabilities), [form.required_capabilities]);
  const selectedCatalogModes = useMemo(() => readStringArray(form.catalog_modes), [form.catalog_modes]);
  const selectedCompatibleBusinessFamilies = useMemo(
    () => readStringArray(form.compatible_business_families),
    [form.compatible_business_families],
  );
  const themeEditorPayload = useMemo<ThemeEditorPayload>(
    () => readThemeEditorPayload(form.preview_metadata, form.tokens),
    [form.preview_metadata, form.tokens],
  );

  return {
    dialogState,
    form,
    setDialogState,
    updateField,
    toggleStringArrayField,
    updateDelimitedStringArrayField,
    updateThemePreviewField,
    updateThemeTypographyField,
    updateThemeBorderRadius,
    pagePayload,
    updatePagePayloadMeta,
    updatePagePayloadHomepage,
    addPagePayloadBlock,
    removePagePayloadBlock,
    movePagePayloadBlock,
    updatePagePayloadBlock,
    updatePagePayloadBlockProps,
    openCreateDialog,
    openEditDialog,
    selectedCapabilities,
    selectedCatalogModes,
    selectedCompatibleBusinessFamilies,
    themeEditorPayload,
  };
}
