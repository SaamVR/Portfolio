"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "@/lib/react-router-dom-shim";
import { buildPageBuilderPath } from "@/lib/admin-paths";
import type { StorePageBlock } from "@/lib/cms/schema";
import { resolveStorefrontTemplateId, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { getStorefrontVariantDefinitions } from "@/lib/cms/storefront-platform/variants/registry";
import { normalizeCanonicalVariantOptions, type StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";
import { buildVariantOptionsPersistencePatch } from "@/lib/cms/storefront-platform/variants/variant-options";
import { applySectionStyleToBlock, buildSectionStylePersistencePatch, getSectionStyleLibraryEntries, getSectionStyleResetTarget } from "@/lib/cms/storefront-platform/variants/section-style-library";
import { SectionStylePreview, type SectionStylePreviewMode } from "@/components/storefront/editor/SectionStylePreview";
import { SectionStudioPreviewModeSwitch, SectionStudioPreviewStage, SectionStudioSaveStatus } from "@/components/storefront/editor/section-studio/SectionStudioShells";
import { SectionStudioOptionControls } from "@/components/storefront/editor/section-studio/SectionStudioOptionControls";
import { refreshStorefrontContentCache } from "@/lib/storefront-cache-client";
import { cn } from "@/lib/utils";

type LoadedPage = { id: string; title: string; slug: string };

type WorkspaceState = {
  page: LoadedPage;
  blocks: StorePageBlock[];
  templateId: StorefrontTemplateId;
};

function blockLabel(type: StorePageBlock["type"]) {
  const labels: Partial<Record<StorePageBlock["type"], string>> = {
    hero: "Hero",
    "category-showcase": "Categories",
    "featured-products": "Featured Products",
    "recommended-products": "Recommended Products",
    "promo-banner": "Promo",
    "rich-text": "Story / Rich Text",
    "trust-badges": "Trust",
    "social-feed": "Gallery / Social",
  };
  return labels[type] ?? type.replaceAll("-", " ");
}

function normalizeBlock(row: Record<string, unknown>): StorePageBlock {
  return {
    id: String(row.id),
    type: row.block_type as StorePageBlock["type"],
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    isVisible: row.is_visible !== false,
    visible: row.is_visible !== false,
    layoutVariant: typeof row.layout_variant === "string" ? row.layout_variant : undefined,
    variantOptions: normalizeCanonicalVariantOptions(row.variant_options),
    props: row.props && typeof row.props === "object" ? row.props as Record<string, unknown> : {},
  } as StorePageBlock;
}

export default function SectionStylesWorkspace() {
  const { activeStoreId } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedPageId = searchParams.get("page");
  const requestedBlockId = searchParams.get("block");
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState(requestedBlockId ?? "");
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [previewMode, setPreviewMode] = useState<SectionStylePreviewMode>("desktop");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [savingOptions, setSavingOptions] = useState(false);
  const [optionDrafts, setOptionDrafts] = useState<Record<string, StorefrontVariantOptions | null>>({});
  const [optionSaveError, setOptionSaveError] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<{
    blockId: string;
    previousVariantId: string | null;
    previousVariantOptions?: StorefrontVariantOptions;
    nextVariantId: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activeStoreId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setLastChange(null);
      setOptionDrafts({});
      setOptionSaveError(null);
      setSelectedStyleId("");
      try {
        const [storeResult, profileResult, settingResult] = await Promise.all([
          (supabase as any).from("stores").select("store_type").eq("id", activeStoreId).maybeSingle(),
          (supabase as any).from("store_business_profiles").select("template_id").eq("store_id", activeStoreId).maybeSingle(),
          (supabase as any).from("site_settings").select("value").eq("store_id", activeStoreId).eq("key", "storefront_profile").maybeSingle(),
        ]);
        if (storeResult.error) throw storeResult.error;
        if (profileResult.error) throw profileResult.error;
        if (settingResult.error) throw settingResult.error;

        let pageQuery = (supabase as any).from("store_pages").select("id,title,slug").eq("store_id", activeStoreId);
        pageQuery = requestedPageId ? pageQuery.eq("id", requestedPageId) : pageQuery.eq("is_homepage", true);
        const pageResult = await pageQuery.maybeSingle();
        if (pageResult.error) throw pageResult.error;
        if (!pageResult.data) throw new Error("No storefront page was found for this style workspace.");

        const blockResult = await (supabase as any)
          .from("store_page_blocks")
          .select("id,block_type,props,sort_order,is_visible,layout_variant,variant_options")
          .eq("store_id", activeStoreId)
          .eq("page_id", pageResult.data.id)
          .order("sort_order");
        if (blockResult.error) throw blockResult.error;

        const setting = settingResult.data?.value && typeof settingResult.data.value === "object"
          ? settingResult.data.value as Record<string, unknown>
          : {};
        const templateId = resolveStorefrontTemplateId(setting.template_id, {
          templateSeedId: profileResult.data?.template_id ?? storeResult.data?.store_type ?? null,
          productVisibility: typeof setting.product_visibility === "string" ? setting.product_visibility : null,
        });
        const blocks = (blockResult.data ?? []).map((row: Record<string, unknown>) => normalizeBlock(row));
        if (cancelled) return;
        setWorkspace({ page: pageResult.data, blocks, templateId });
        const supported = blocks.filter((block) => getStorefrontVariantDefinitions(block.type).length > 0);
        const initial = supported.find((block) => block.id === requestedBlockId) ?? supported[0];
        setSelectedBlockId(initial?.id ?? "");
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Section styles could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeStoreId, requestedBlockId, requestedPageId]);

  const supportedBlocks = useMemo(
    () => workspace?.blocks.filter((block) => getStorefrontVariantDefinitions(block.type).length > 0) ?? [],
    [workspace],
  );
  const selectedBlock = supportedBlocks.find((block) => block.id === selectedBlockId) ?? supportedBlocks[0] ?? null;
  const entries = useMemo(
    () => workspace && selectedBlock ? getSectionStyleLibraryEntries(workspace.templateId, selectedBlock) : [],
    [workspace, selectedBlock],
  );
  const selectedEntry = entries.find((entry) => entry.definition.id === selectedStyleId)
    ?? entries.find((entry) => entry.current);
  const resetEntry = workspace && selectedBlock ? getSectionStyleResetTarget(workspace.templateId, selectedBlock) : undefined;
  const hasUnregisteredCurrentStyle = Boolean(selectedBlock?.layoutVariant && !entries.some((entry) => entry.definition.id === selectedBlock.layoutVariant));
  const hasOptionDraft = Boolean(selectedBlock && Object.prototype.hasOwnProperty.call(optionDrafts, selectedBlock.id));
  const selectedBlockWithOptionDraft = selectedBlock
    ? {
        ...selectedBlock,
        variantOptions: hasOptionDraft ? optionDrafts[selectedBlock.id] ?? undefined : selectedBlock.variantOptions,
      }
    : null;
  const optionControlBlock = workspace && selectedBlockWithOptionDraft && selectedEntry
    ? applySectionStyleToBlock(selectedBlockWithOptionDraft, selectedEntry.definition.id, workspace.templateId)
    : selectedBlockWithOptionDraft;

  useEffect(() => {
    if (selectedEntry && selectedStyleId !== selectedEntry.definition.id) setSelectedStyleId(selectedEntry.definition.id);
  }, [selectedBlockId, selectedEntry, selectedStyleId]);

  const persistStyleVariant = async (
    block: StorePageBlock,
    variantId: string | null,
    options?: { sourceVariantOptions: StorefrontVariantOptions | undefined },
  ) => {
    if (!activeStoreId || !workspace) throw new Error("Section Styles workspace is not ready.");
    const hasDraft = Object.prototype.hasOwnProperty.call(optionDrafts, block.id);
    const sourceBlock = {
      ...block,
      variantOptions: options
        ? options.sourceVariantOptions
        : hasDraft
          ? optionDrafts[block.id] ?? undefined
          : block.variantOptions,
    };
    const nextBlock = applySectionStyleToBlock(sourceBlock, variantId, workspace.templateId);
    const patch = {
      ...buildSectionStylePersistencePatch(variantId),
      ...buildVariantOptionsPersistencePatch(nextBlock.variantOptions),
    };
    const { data, error: updateError } = await (supabase as any)
      .from("store_page_blocks")
      .update(patch)
      .eq("store_id", activeStoreId)
      .eq("page_id", workspace.page.id)
      .eq("id", block.id)
      .select("id,layout_variant,variant_options")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw new Error("The section could not be updated. Reload the editor and try again.");

    setWorkspace((current) => current ? {
      ...current,
      blocks: current.blocks.map((item) => item.id === block.id ? nextBlock : item),
    } : current);
    setOptionDrafts((current) => {
      const next = { ...current };
      delete next[block.id];
      return next;
    });
    setOptionSaveError(null);

    try {
      await refreshStorefrontContentCache(supabase as any, activeStoreId, { pageSlugs: [workspace.page.slug] });
    } catch {
      toast.warning("Style saved, but the storefront cache could not refresh immediately.");
    }
  };

  const saveOptionChanges = async () => {
    if (!activeStoreId || !workspace || !selectedBlock || !hasOptionDraft) return;
    setSavingOptions(true);
    setOptionSaveError(null);
    try {
      const nextOptions = optionDrafts[selectedBlock.id] ?? undefined;
      const { data, error: updateError } = await (supabase as any)
        .from("store_page_blocks")
        .update(buildVariantOptionsPersistencePatch(nextOptions))
        .eq("store_id", activeStoreId)
        .eq("page_id", workspace.page.id)
        .eq("id", selectedBlock.id)
        .select("id,variant_options")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("The section adjustments could not be saved. Reload the editor and try again.");
      setWorkspace((current) => current ? {
        ...current,
        blocks: current.blocks.map((item) => item.id === selectedBlock.id ? { ...item, variantOptions: nextOptions } : item),
      } : current);
      setOptionDrafts((current) => {
        const next = { ...current };
        delete next[selectedBlock.id];
        return next;
      });
      await refreshStorefrontContentCache(supabase as any, activeStoreId, { pageSlugs: [workspace.page.slug] });
      toast.success("Section adjustments saved.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not save section adjustments.";
      setOptionSaveError(message);
      toast.error(message);
    } finally {
      setSavingOptions(false);
    }
  };

  const applyStyle = async () => {
    if (!selectedBlock || !selectedEntry || !selectedEntry.compatible || selectedEntry.current) return;
    setApplying(true);
    try {
      const previousVariantId = selectedBlock.layoutVariant ?? null;
      const previousVariantOptions = selectedBlock.variantOptions;
      await persistStyleVariant(selectedBlock, selectedEntry.definition.id);
      setLastChange({
        blockId: selectedBlock.id,
        previousVariantId,
        previousVariantOptions,
        nextVariantId: selectedEntry.definition.id,
      });
      toast.success(`${selectedEntry.definition.label} applied. Section content was preserved.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not apply this section style.");
    } finally {
      setApplying(false);
    }
  };

  const resetToTemplateStyle = async () => {
    if (!selectedBlock || selectedBlock.layoutVariant == null) return;
    setApplying(true);
    try {
      const previousVariantId = selectedBlock.layoutVariant;
      const previousVariantOptions = selectedBlock.variantOptions;
      await persistStyleVariant(selectedBlock, null);
      setSelectedStyleId(resetEntry?.definition.id ?? "");
      setLastChange({ blockId: selectedBlock.id, previousVariantId, previousVariantOptions, nextVariantId: null });
      toast.success(resetEntry
        ? `Reset to inherited ${resetEntry.definition.label}. Section content was preserved.`
        : "Reset to the template's inherited/default presentation. Section content was preserved.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not reset this section style.");
    } finally {
      setApplying(false);
    }
  };

  const undoLastStyleChange = async () => {
    if (!workspace || !lastChange) return;
    const block = workspace.blocks.find((item) => item.id === lastChange.blockId);
    if (!block) {
      setLastChange(null);
      return;
    }
    setApplying(true);
    try {
      await persistStyleVariant(block, lastChange.previousVariantId, {
        sourceVariantOptions: lastChange.previousVariantOptions,
      });
      setSelectedBlockId(block.id);
      setSelectedStyleId(lastChange.previousVariantId ?? "");
      setLastChange(null);
      toast.success("Last section style change undone.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not undo the last style change.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">Loading Section Styles…</div>;
  if (!activeStoreId) return <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-muted-foreground">Choose a store before opening Section Styles.</div>;
  if (error || !workspace) return <div className="mx-auto max-w-4xl px-4 py-12"><p className="text-sm text-destructive">{error ?? "Section Styles could not be loaded."}</p></div>;
  if (!selectedBlock) return <div className="mx-auto max-w-4xl px-4 py-12"><p className="text-sm text-muted-foreground">This page has no sections with registered visual styles yet.</p></div>;

  const editorHref = buildPageBuilderPath("basic", { storeId: activeStoreId, pageId: workspace.page.id, blockId: selectedBlock.id });

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 gap-2"><Link to={editorHref}><ArrowLeft className="h-4 w-4" />Back to editor</Link></Button>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Section Studio</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Style and fine-tune sections</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose a Section Style, then adjust only the presentation controls that style supports. Copy, products, categories, and media stay untouched.</p>
        </div>
        <Badge variant="outline" className="mt-1">{workspace.templateId}</Badge>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {supportedBlocks.map((block, index) => (
          <button key={block.id} type="button" onClick={() => { setSelectedBlockId(block.id); setSelectedStyleId(""); }} aria-pressed={selectedBlock.id === block.id} className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium", selectedBlock.id === block.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40")}>
            {index + 1}. {blockLabel(block.type)}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-lg font-semibold">{blockLabel(selectedBlock.type)} styles</h2><p className="text-xs text-muted-foreground">Recommended styles appear first.</p></div>
            <SectionStudioPreviewModeSwitch value={previewMode} onChange={setPreviewMode} />
          </div>
          {hasUnregisteredCurrentStyle ? (
            <div className="mb-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Current template style <strong>{selectedBlock.layoutVariant}</strong> is specialized and is not yet published in the shared Section Styles library. Choosing a shared style will migrate presentation only; the section content remains stored.
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => {
              const active = selectedEntry?.definition.id === entry.definition.id;
              return (
                <button key={entry.definition.id} type="button" aria-pressed={active} onClick={() => { setSelectedStyleId(entry.definition.id); setOptionSaveError(null); }} className={cn("rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md", active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card", !entry.compatible && "opacity-60")}>
                  <div className="relative">
                    <SectionStylePreview blockType={selectedBlock.type} definition={entry.definition} mode={previewMode} className={previewMode === "mobile" ? "mx-auto w-[44%]" : "w-full"} />
                    <div className="absolute left-2 top-2 flex gap-1">
                      {entry.templateDefault ? <Badge variant="outline" className="bg-background/90 text-[10px]">Template default</Badge> : entry.recommended ? <Badge className="gap-1 text-[10px]"><Sparkles className="h-3 w-3" />Recommended</Badge> : null}
                      {entry.current ? <Badge variant="secondary" className="text-[10px]">Current</Badge> : null}
                    </div>
                  </div>
                  <div className="p-2 pb-1">
                    <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{entry.definition.label}</p></div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{entry.definition.description}</p>
                    {!entry.compatible ? <p className="mt-1 text-[11px] text-amber-700">{entry.reasons[0]}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedEntry ? (
          <aside className="order-first lg:order-none lg:sticky lg:top-5 lg:self-start">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-muted/20 p-3">
                  <SectionStudioPreviewStage mode={previewMode}>
                    <SectionStylePreview blockType={selectedBlock.type} definition={selectedEntry.definition} mode={previewMode} className="w-full" />
                  </SectionStudioPreviewStage>
                </div>
                <div className="space-y-4 p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{selectedEntry.current ? "Current Section Style" : "Previewing Section Style"}</p>
                        <h3 className="mt-1 text-lg font-semibold">{selectedEntry.definition.label}</h3>
                      </div>
                      {selectedEntry.current ? <Badge variant="secondary">Current</Badge> : <Badge variant="outline">Preview</Badge>}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedEntry.definition.guidance}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-border p-2.5"><p className="text-muted-foreground">Mobile</p><p className="mt-1 font-medium">{selectedEntry.definition.responsive.mobile.layout.replaceAll("-", " ")}</p></div>
                    <div className="rounded-xl border border-border p-2.5"><p className="text-muted-foreground">Performance</p><p className="mt-1 font-medium capitalize">{selectedEntry.definition.performanceClass.replaceAll("-", " ")}</p></div>
                  </div>
                  {selectedEntry.contentHints.length ? <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{selectedEntry.contentHints.map((hint) => <p key={hint}>{hint}</p>)}</div> : null}
                  {!selectedEntry.compatible ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{selectedEntry.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div> : null}
                  <div className="rounded-xl border border-emerald-300/50 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><p className="font-semibold">Content-safe style switch</p><p className="mt-1">Changing style normalizes presentation overrides against that style. Unsupported overrides disappear; section content stays stored.</p></div>
                  {optionControlBlock ? (
                    <SectionStudioOptionControls
                      templateId={workspace.templateId}
                      block={optionControlBlock}
                      compact
                      disabled={!selectedEntry.current || applying || savingOptions}
                      onChange={(nextBlock) => {
                        setOptionDrafts((current) => ({ ...current, [selectedBlock.id]: nextBlock.variantOptions ?? null }));
                        setOptionSaveError(null);
                      }}
                    />
                  ) : null}
                  {!selectedEntry.current ? (
                    <p className="rounded-xl border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">Apply this Section Style before changing its supported adjustments.</p>
                  ) : (
                    <>
                      <SectionStudioSaveStatus
                        state={optionSaveError ? "error" : savingOptions ? "saving" : hasOptionDraft ? "unsaved" : "saved"}
                        label={optionSaveError ? "Adjustments not saved" : savingOptions ? "Saving adjustments" : hasOptionDraft ? "Unsaved adjustments" : "Adjustments saved"}
                        detail={optionSaveError ?? (hasOptionDraft ? "Review the section preview, then save these overrides." : "The storefront is using the saved adjustment state.")}
                      />
                      <Button type="button" className="min-h-12 w-full gap-2" disabled={!hasOptionDraft || savingOptions || applying} onClick={() => void saveOptionChanges()}>
                        {savingOptions ? "Saving…" : "Save section adjustments"}
                      </Button>
                    </>
                  )}
                  <Button type="button" className="min-h-12 w-full gap-2" disabled={!selectedEntry.compatible || selectedEntry.current || applying || savingOptions} onClick={() => void applyStyle()}>{selectedEntry.current ? <><Check className="h-4 w-4" />Already applied</> : applying ? "Applying…" : `Apply ${selectedEntry.definition.label}`}</Button>
                  {selectedBlock.layoutVariant != null ? (
                    <Button type="button" variant="outline" className="min-h-11 w-full gap-2" disabled={applying} onClick={() => void resetToTemplateStyle()}>
                      <RotateCcw className="h-4 w-4" />{resetEntry ? `Reset to ${resetEntry.definition.label}` : "Reset to inherited/default"}
                    </Button>
                  ) : null}
                  {lastChange ? (
                    <Button type="button" variant="outline" className="min-h-11 w-full gap-2" disabled={applying} onClick={() => void undoLastStyleChange()}>
                      <RotateCcw className="h-4 w-4" />Undo last style change
                    </Button>
                  ) : null}
                  <p className="text-center text-[11px] text-muted-foreground">Fallback: {selectedEntry.definition.safeFallback} · {selectedEntry.definition.lifecycle}</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        ) : (
          <aside className="order-first lg:order-none lg:sticky lg:top-5 lg:self-start">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Inherited/default presentation</h3><Badge variant="secondary">Current</Badge></div>
                <p className="text-sm leading-6 text-muted-foreground">This template does not declare a Section Style default for this section. The storefront is using the renderer&apos;s inherited/default presentation, so no library style is selected.</p>
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">Choose a style card to preview an explicit visual treatment. Resetting an explicit style returns here without changing section content.</div>
                {lastChange ? (
                  <Button type="button" variant="outline" className="min-h-11 w-full gap-2" disabled={applying} onClick={() => void undoLastStyleChange()}>
                    <RotateCcw className="h-4 w-4" />Undo last style change
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}
