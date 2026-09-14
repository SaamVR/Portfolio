"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Monitor, RotateCcw, Smartphone, Sparkles } from "lucide-react";
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
import { applySectionStyleToBlock, buildSectionStylePersistencePatch, getSectionStyleLibraryEntries, getSectionStyleResetTarget } from "@/lib/cms/storefront-platform/variants/section-style-library";
import { SectionStylePreview, type SectionStylePreviewMode } from "@/components/storefront/editor/SectionStylePreview";
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
    variantOptions: row.variant_options && typeof row.variant_options === "object" ? row.variant_options as StorePageBlock["variantOptions"] : undefined,
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
  const [lastChange, setLastChange] = useState<{ blockId: string; previousVariantId: string | null; nextVariantId: string | null } | null>(null);
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

  useEffect(() => {
    if (selectedEntry && selectedStyleId !== selectedEntry.definition.id) setSelectedStyleId(selectedEntry.definition.id);
  }, [selectedBlockId, selectedEntry, selectedStyleId]);

  const persistStyleVariant = async (block: StorePageBlock, variantId: string | null) => {
    if (!activeStoreId || !workspace) throw new Error("Section Styles workspace is not ready.");
    const { data, error: updateError } = await (supabase as any)
      .from("store_page_blocks")
      .update(buildSectionStylePersistencePatch(variantId, block, workspace.templateId))
      .eq("store_id", activeStoreId)
      .eq("page_id", workspace.page.id)
      .eq("id", block.id)
      .select("id,layout_variant,variant_options")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw new Error("The section could not be updated. Reload the editor and try again.");

    setWorkspace((current) => current ? {
      ...current,
      blocks: current.blocks.map((item) => item.id === block.id ? applySectionStyleToBlock(item, variantId, workspace.templateId) : item),
    } : current);

    try {
      await refreshStorefrontContentCache(supabase as any, activeStoreId, { pageSlugs: [workspace.page.slug] });
    } catch {
      toast.warning("Style saved, but the storefront cache could not refresh immediately.");
    }
  };

  const applyStyle = async () => {
    if (!selectedBlock || !selectedEntry || !selectedEntry.compatible || selectedEntry.current) return;
    setApplying(true);
    try {
      const previousVariantId = selectedBlock.layoutVariant ?? null;
      await persistStyleVariant(selectedBlock, selectedEntry.definition.id);
      setLastChange({ blockId: selectedBlock.id, previousVariantId, nextVariantId: selectedEntry.definition.id });
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
      await persistStyleVariant(selectedBlock, null);
      setSelectedStyleId(resetEntry?.definition.id ?? "");
      setLastChange({ blockId: selectedBlock.id, previousVariantId, nextVariantId: null });
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
      await persistStyleVariant(block, lastChange.previousVariantId);
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Visual Section Library</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Section Styles</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Compare real design previews, check mobile behavior, and change presentation without replacing the section&apos;s copy, products, categories, or media.</p>
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
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 className="text-lg font-semibold">{blockLabel(selectedBlock.type)} styles</h2><p className="text-xs text-muted-foreground">Recommended styles appear first.</p></div>
            <div className="flex rounded-xl border border-border bg-muted/30 p-1">
              <Button type="button" size="sm" variant={previewMode === "desktop" ? "secondary" : "ghost"} className="min-h-11 gap-1.5" aria-pressed={previewMode === "desktop"} onClick={() => setPreviewMode("desktop")}><Monitor className="h-3.5 w-3.5" />Desktop</Button>
              <Button type="button" size="sm" variant={previewMode === "mobile" ? "secondary" : "ghost"} className="min-h-11 gap-1.5" aria-pressed={previewMode === "mobile"} onClick={() => setPreviewMode("mobile")}><Smartphone className="h-3.5 w-3.5" />Mobile</Button>
            </div>
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
                <button key={entry.definition.id} type="button" aria-pressed={active} onClick={() => setSelectedStyleId(entry.definition.id)} className={cn("rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md", active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card", !entry.compatible && "opacity-60")}>
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
                  <SectionStylePreview blockType={selectedBlock.type} definition={selectedEntry.definition} mode={previewMode} className={previewMode === "mobile" ? "mx-auto w-[62%]" : "w-full"} />
                </div>
                <div className="space-y-4 p-4">
                  <div><div className="flex items-center justify-between gap-2"><h3 className="text-lg font-semibold">{selectedEntry.definition.label}</h3>{selectedEntry.current ? <Badge variant="secondary">Current</Badge> : null}</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedEntry.definition.guidance}</p></div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-border p-2.5"><p className="text-muted-foreground">Mobile</p><p className="mt-1 font-medium">{selectedEntry.definition.responsive.mobile.layout.replaceAll("-", " ")}</p></div>
                    <div className="rounded-xl border border-border p-2.5"><p className="text-muted-foreground">Performance</p><p className="mt-1 font-medium capitalize">{selectedEntry.definition.performanceClass.replaceAll("-", " ")}</p></div>
                  </div>
                  {selectedEntry.contentHints.length ? <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{selectedEntry.contentHints.map((hint) => <p key={hint}>{hint}</p>)}</div> : null}
                  {!selectedEntry.compatible ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{selectedEntry.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div> : null}
                  <div className="rounded-xl border border-emerald-300/50 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><p className="font-semibold">Content-safe style switch</p><p className="mt-1">Only the section style ID changes. Existing section content stays stored.</p></div>
                  <Button type="button" className="min-h-12 w-full gap-2" disabled={!selectedEntry.compatible || selectedEntry.current || applying} onClick={() => void applyStyle()}>{selectedEntry.current ? <><Check className="h-4 w-4" />Already applied</> : applying ? "Applying…" : `Apply ${selectedEntry.definition.label}`}</Button>
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
