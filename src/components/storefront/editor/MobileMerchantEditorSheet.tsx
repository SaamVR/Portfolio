"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, ImagePlus, LayoutGrid, Palette, Plus, Save, Settings2, Trash2, Undo2, Redo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import type { Store, StorePageBlock } from "@/lib/cms/schema";
import { STORE_SECTION_SPACING_PRESETS, STORE_SECTION_SPACING_VALUES, type StoreSectionSpacing } from "@/lib/cms/store-theme-contract";
import { GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { getBasicLayoutVariantOptions } from "@/lib/cms/storefront-editor-registry";
import { applySectionStyleToBlock } from "@/lib/cms/storefront-platform/variants/section-style-library";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import type { StorefrontEditorQualityIssue } from "@/lib/cms/storefront-platform/editor/quality-assist";
import { getCompatibleCompositionRecipes, getCompositionEditorFields, getPlatformAestheticOptions } from "@/lib/cms/storefront-platform/editor/platform-contracts";
import { buildSectionStylesPath } from "@/lib/admin-paths";
import { Link } from "@/lib/react-router-dom-shim";
import { MobileCameraUpload } from "./MobileCameraUpload";
import { SectionStudioOptionControls } from "./section-studio/SectionStudioOptionControls";
import { SectionStudioSaveStatus } from "./section-studio/SectionStudioShells";

const MOBILE_TEXT_FIELDS = ["eyebrow", "tagline", "title", "highlight", "subtitle", "body", "ctaText", "ctaLink"] as const;
type MobileEditorTab = "content" | "layout" | "style" | "media";

type MediaField = {
  key: string;
  label: string;
  folder: string;
  resourceType: "image" | "video" | "auto";
};

function getMediaFields(block: StorePageBlock | null): MediaField[] {
  if (!block) return [];
  if (block.type === "hero") return [{ key: "mediaUrl", label: "Hero media", folder: "hero", resourceType: "auto" }];
  if (block.type === "promo-banner") {
    return [
      { key: "imageUrl", label: "Primary promo image", folder: "promo-banner", resourceType: "image" },
      { key: "secondaryImageUrl", label: "Secondary promo image", folder: "promo-banner", resourceType: "image" },
    ];
  }
  if (block.type === "video-reel") return [{ key: "videoUrl", label: "Video", folder: "video-reel", resourceType: "video" }];
  if (block.type === "rich-text" && block.layoutVariant === "brand-story") {
    return [{ key: "imageUrl", label: "Story image", folder: "brand-story", resourceType: "image" }];
  }
  return [];
}

function tabIcon(tab: MobileEditorTab) {
  if (tab === "layout") return <LayoutGrid className="h-4 w-4" />;
  if (tab === "style") return <Palette className="h-4 w-4" />;
  if (tab === "media") return <ImagePlus className="h-4 w-4" />;
  return <Settings2 className="h-4 w-4" />;
}

export function MobileMerchantEditorSheet({
  store,
  selectedBlock,
  pageId,
  templateId,
  saving,
  hasUnsavedChanges,
  saveStatusLabel,
  saveError,
  isOnline,
  localDraftProtected,
  qualityIssues,
  compositionEnabled,
  canUndo,
  canRedo,
  onClose,
  onSave,
  onPreview,
  onUndo,
  onRedo,
  onUpdateBlockMeta,
  onUpdateBlockProps,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onUpdateThemeToken,
  onUpdateThemeAesthetic,
  onUpdateThemeSectionSpacing,
  onInsertCompositionRecipe,
  onApplyCompositionRecipe,
  onUpdateCompositionField,
  onUpdateCompositionAction,
}: {
  store: Store;
  selectedBlock: StorePageBlock | null;
  pageId: string;
  templateId: StorefrontTemplateId;
  saving: boolean;
  hasUnsavedChanges: boolean;
  saveStatusLabel: string;
  saveError?: string | null;
  isOnline: boolean;
  localDraftProtected: boolean;
  qualityIssues: StorefrontEditorQualityIssue[];
  compositionEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onClose: () => void;
  onSave: () => void;
  onPreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateBlockMeta: (patch: Partial<StorePageBlock>) => void;
  onUpdateBlockProps: (patch: Record<string, unknown>) => void;
  onMoveBlock: (direction: -1 | 1) => void;
  onDuplicateBlock: () => void;
  onRemoveBlock: () => void;
  onUpdateThemeToken: (token: string, value: string) => void;
  onUpdateThemeAesthetic: (aesthetic: NonNullable<Store["theme"]["aesthetic"]>) => void;
  onUpdateThemeSectionSpacing: (spacing: StoreSectionSpacing) => void;
  onInsertCompositionRecipe: (recipeId: string) => void;
  onApplyCompositionRecipe: (recipeId: string) => void;
  onUpdateCompositionField: (nodeId: string, key: "text" | "src" | "alt", value: string) => void;
  onUpdateCompositionAction: (nodeId: string, index: number, patch: { label?: string; href?: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<MobileEditorTab>("content");
  const [showAddSection, setShowAddSection] = useState(false);
  const layoutOptions = useMemo(
    () => selectedBlock ? getBasicLayoutVariantOptions(templateId, selectedBlock.type, selectedBlock) : [],
    [selectedBlock, templateId],
  );
  const mediaFields = useMemo(() => getMediaFields(selectedBlock), [selectedBlock]);
  const compositionRecipes = useMemo(() => getCompatibleCompositionRecipes(templateId), [templateId]);
  const compositionEditor = useMemo(() => getCompositionEditorFields(selectedBlock), [selectedBlock]);
  const aestheticOptions = useMemo(() => getPlatformAestheticOptions(store.theme), [store.theme]);
  const themeVars = useMemo(() => resolveStoreThemeVars(store.theme).vars, [store.theme]);
  const props = (selectedBlock?.props ?? {}) as Record<string, unknown>;

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[85] flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-border bg-background/98 shadow-2xl backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="dialog"
      aria-label="Mobile storefront editor"
    >
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/25" />
      <div className="border-b border-border px-4 pb-3 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">Edit storefront</p>
              <Badge variant={isOnline ? "outline" : "secondary"}>{isOnline ? "Online" : "Offline"}</Badge>
              {localDraftProtected && hasUnsavedChanges ? <Badge variant="outline">Draft protected</Badge> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{saveStatusLabel}</p>
          </div>
          <Button type="button" size="icon" variant="outline" className="h-11 w-11 shrink-0 rounded-full" onClick={onClose} aria-label="Close editor">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SectionStudioSaveStatus
          state={saveError ? "error" : saving ? "saving" : hasUnsavedChanges ? "unsaved" : "saved"}
          label={saveError ? "Save failed" : saving ? "Saving changes" : hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
          detail={saveError ?? saveStatusLabel}
          className="mt-3"
        />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(["content", "layout", "style", "media"] as MobileEditorTab[]).map((tab) => (
            <Button
              key={tab}
              type="button"
              variant={activeTab === tab ? "secondary" : "ghost"}
              className="min-h-11 flex-col gap-1 rounded-xl px-1 text-[11px] capitalize"
              onClick={() => setActiveTab(tab)}
            >
              {tabIcon(tab)}
              {tab}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {activeTab === "content" ? (
          <div className="space-y-4">
            {compositionEnabled ? (
              <div className="rounded-2xl border border-border p-3">
                <Button type="button" variant="outline" className="min-h-11 w-full justify-start gap-2" onClick={() => setShowAddSection((value) => !value)}>
                  <Plus className="h-4 w-4" />
                  Add section
                </Button>
                {showAddSection ? (
                  <div className="mt-3 grid gap-2">
                    <p className="text-xs text-muted-foreground">Choose a safe Composition recipe. You can edit its content and media without raw JSON.</p>
                    {compositionRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        type="button"
                        className="rounded-xl border border-border bg-card p-3 text-left"
                        onClick={() => { onInsertCompositionRecipe(recipe.id); setShowAddSection(false); }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{recipe.label}</span>
                          {recipe.recommended ? <Badge variant="secondary">Recommended</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{recipe.description}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {qualityIssues.length ? (
              <div className="space-y-2">
                {qualityIssues.map((issue) => (
                  <div key={issue.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-semibold">{issue.title}</p>
                        <p className="mt-1 text-muted-foreground">{issue.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedBlock ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs">
                <div className="flex gap-2"><CheckCircle2 className="h-4 w-4" /><span>No mobile quality warnings for this section.</span></div>
              </div>
            ) : null}

            {!selectedBlock ? (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Tap a highlighted storefront section to edit its content.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div><p className="text-sm font-medium">{selectedBlock.type}</p><p className="text-xs text-muted-foreground">Section visibility</p></div>
                  <Switch checked={selectedBlock.isVisible ?? selectedBlock.visible ?? true} onCheckedChange={(checked) => onUpdateBlockMeta({ isVisible: checked, visible: checked })} />
                </div>
                {selectedBlock.type === "composition" ? (
                  <>
                    {compositionEditor.fields.filter((field) => field.key !== "src").map((field) => (
                      <div key={`${field.nodeId}-${field.key}`} className="grid gap-2">
                        <Label>{field.label}</Label>
                        {field.multiline ? (
                          <Textarea className="min-h-24 text-base" value={field.value} onChange={(event) => onUpdateCompositionField(field.nodeId, field.key, event.target.value)} />
                        ) : (
                          <Input className="h-11 text-base" value={field.value} onChange={(event) => onUpdateCompositionField(field.nodeId, field.key, event.target.value)} />
                        )}
                      </div>
                    ))}
                    {compositionEditor.actions.map((action) => (
                      <div key={`${action.nodeId}-${action.index}`} className="grid gap-2 rounded-xl border border-border p-3">
                        <Label>Action {action.index + 1}</Label>
                        <Input className="h-11 text-base" value={action.label} placeholder="Button label" onChange={(event) => onUpdateCompositionAction(action.nodeId, action.index, { label: event.target.value })} />
                        <Input className="h-11 text-base" value={action.href} placeholder="/shop" onChange={(event) => onUpdateCompositionAction(action.nodeId, action.index, { href: event.target.value })} />
                      </div>
                    ))}
                  </>
                ) : (
                  MOBILE_TEXT_FIELDS.filter((field) => typeof props[field] === "string").map((field) => (
                    <div key={field} className="grid gap-2">
                      <Label className="capitalize">{field.replace(/([A-Z])/g, " $1")}</Label>
                      {field === "body" || field.toLowerCase().includes("subtitle") ? (
                        <Textarea className="min-h-24 text-base" value={String(props[field] ?? "")} onChange={(event) => onUpdateBlockProps({ [field]: event.target.value })} />
                      ) : (
                        <Input className="h-11 text-base" value={String(props[field] ?? "")} onChange={(event) => onUpdateBlockProps({ [field]: event.target.value })} />
                      )}
                    </div>
                  ))
                )}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => onMoveBlock(-1)}>Move up</Button>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => onMoveBlock(1)}>Move down</Button>
                  <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={onDuplicateBlock}><Copy className="h-4 w-4" />Duplicate</Button>
                  <Button type="button" variant="outline" className="min-h-11 gap-2 text-destructive" onClick={onRemoveBlock}><Trash2 className="h-4 w-4" />Remove</Button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {activeTab === "layout" ? (
          <div className="space-y-3">
            {!selectedBlock ? <p className="text-sm text-muted-foreground">Select a storefront section to choose its layout.</p> : null}
            {selectedBlock?.type === "composition" ? (
              <>
                <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
                  Composition recipes control this section only. Changing recipes does not alter the store palette, logo, products, navigation, or other sections.
                </div>
                {compositionRecipes.map((recipe) => {
                  const selected = compositionEditor.recipeId === recipe.id;
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      className={`w-full rounded-2xl border p-4 text-left ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                      onClick={() => onApplyCompositionRecipe(recipe.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{recipe.label}</p>
                        {recipe.recommended ? <Badge variant="secondary">Recommended</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{recipe.guidance}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{recipe.performanceClass} · {recipe.responsive.mobile.layout}</p>
                    </button>
                  );
                })}
              </>
            ) : selectedBlock ? (
              <>
                {layoutOptions.length > 0 ? (
                  <Button asChild variant="outline" className="min-h-11 w-full justify-center gap-2">
                    <Link to={buildSectionStylesPath({ storeId: store.id, pageId, blockId: selectedBlock.id })}>
                      <LayoutGrid className="h-4 w-4" /> Browse Section Styles
                    </Link>
                  </Button>
                ) : null}
                {layoutOptions.length === 0 ? <p className="text-sm text-muted-foreground">No additional compatible registered layout is available for this section.</p> : null}
                {layoutOptions.map((option) => {
                  const selected = selectedBlock.layoutVariant === option.id || (!selectedBlock.layoutVariant && layoutOptions[0]?.id === option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                      onClick={() => {
                        const nextBlock = applySectionStyleToBlock(selectedBlock, option.id, templateId);
                        onUpdateBlockMeta({
                          layoutVariant: nextBlock.layoutVariant,
                          variantOptions: nextBlock.variantOptions,
                        });
                      }}
                    >
                      <div className="flex items-center justify-between gap-2"><p className="font-semibold">{option.label}</p>{option.recommended ? <Badge variant="secondary">Recommended</Badge> : null}</div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.previewSummary ?? option.guidance}</p>
                    </button>
                  );
                })}
                <SectionStudioOptionControls
                  templateId={templateId}
                  block={selectedBlock}
                  compact
                  onChange={(nextBlock) => onUpdateBlockMeta({ variantOptions: nextBlock.variantOptions })}
                />
              </>
            ) : null}
          </div>
        ) : null}

        {activeTab === "style" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold">Store aesthetic</p>
                <p className="text-xs text-muted-foreground">Preview the platform presentation profile, then apply it. Applying changes presentation only; merchant colors, logo, content, products, navigation, and fonts are preserved.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {aestheticOptions.map((option) => {
                  const selected = store.theme.aesthetic === option.storedValue || (!store.theme.aesthetic && option.engineId === "flat");
                  return (
                    <button
                      key={option.storedValue}
                      type="button"
                      className={`rounded-2xl border p-3 text-left ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                      onClick={() => onUpdateThemeAesthetic(option.storedValue)}
                    >
                      <div
                        className="h-12 border border-border/70 bg-background/80 p-2"
                        style={{
                          borderRadius: `calc(0.75rem * ${option.profile.tokens["--store-radius-card-scale"] ?? "1"})`,
                          boxShadow: option.profile.tokens["--store-elevation-card"],
                          backdropFilter: `blur(${option.profile.tokens["--store-backdrop-blur"] ?? "0px"})`,
                        }}
                      >
                        <div className="h-2 w-3/5 rounded bg-foreground/65" />
                        <div className="mt-2 h-1.5 w-4/5 rounded bg-foreground/20" />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold">{option.label}</span>
                        {selected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{option.detail}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold">Section spacing</p>
                <p className="text-xs text-muted-foreground">Controls only the gap between top-level storefront sections.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STORE_SECTION_SPACING_VALUES.map((value) => {
                  const preset = STORE_SECTION_SPACING_PRESETS[value];
                  const selected = store.theme.sectionSpacing === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`min-h-14 rounded-xl border p-3 text-left ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                      onClick={() => onUpdateThemeSectionSpacing(value)}
                    >
                      <span className="block text-xs font-semibold">{preset.label}</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">{preset.mobile} · {preset.desktop}</span>
                    </button>
                  );
                })}
              </div>
              {!store.theme.sectionSpacing ? <p className="text-[11px] leading-4 text-amber-700 dark:text-amber-300">Existing spacing is preserved until you choose a preset.</p> : null}
            </div>
            <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
              Store colors stay independent from section layout and aesthetic. Theme color controls below remain merchant-owned.
            </div>
            {GUIDED_THEME_TOKENS.map((token) => {
              const currentValue = store.theme.customCssVars[token.key] ?? themeVars[token.key] ?? "";
              return (
                <div key={token.key} className="grid gap-2">
                  <Label>{token.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="h-11 w-16 p-1"
                      value={hslChannelsToHex(currentValue) ?? "#000000"}
                      onChange={(event) => {
                        const next = hexToHslChannels(event.target.value);
                        if (next) onUpdateThemeToken(token.key, next);
                      }}
                    />
                    <Input className="h-11 text-base" value={currentValue} onChange={(event) => onUpdateThemeToken(token.key, event.target.value)} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {activeTab === "media" ? (
          <div className="space-y-4">
            {!selectedBlock ? <p className="text-sm text-muted-foreground">Select a storefront section to edit its media.</p> : null}
            {selectedBlock && mediaFields.length === 0 && !compositionEditor.fields.some((field) => field.key === "src") ? <p className="text-sm text-muted-foreground">This section has no simple primary-media field. Use the guided workspace for its richer media collection.</p> : null}
            {selectedBlock?.type === "composition" ? compositionEditor.fields.filter((field) => field.key === "src").map((field) => (
              <div key={`${field.nodeId}-${field.key}`} className="space-y-2 rounded-2xl border border-border p-3">
                <Label>{field.label}</Label>
                <MobileCameraUpload storeId={store.id} folder="composition" onChange={(url) => onUpdateCompositionField(field.nodeId, "src", url)} />
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Gallery / file / library</div>
                <CloudinaryUpload
                  value={field.value}
                  onChange={(url) => onUpdateCompositionField(field.nodeId, "src", url)}
                  folder="composition"
                  accept="image/*"
                  label="Upload composition image"
                  resourceType="image"
                  storeId={store.id}
                />
              </div>
            )) : null}
            {mediaFields.map((field) => {
              const value = typeof props[field.key] === "string" ? String(props[field.key]) : "";
              return (
                <div key={field.key} className="space-y-2 rounded-2xl border border-border p-3">
                  <Label>{field.label}</Label>
                  {field.resourceType !== "video" ? (
                    <MobileCameraUpload storeId={store.id} folder={field.folder} onChange={(url) => onUpdateBlockProps({ [field.key]: url })} />
                  ) : null}
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Gallery / file / library</div>
                  <CloudinaryUpload
                    value={value}
                    onChange={(url) => onUpdateBlockProps({ [field.key]: url })}
                    folder={field.folder}
                    accept={field.resourceType === "video" ? "video/*" : field.resourceType === "auto" ? "image/*,video/*" : "image/*"}
                    label={`Upload ${field.label.toLowerCase()}`}
                    resourceType={field.resourceType}
                    storeId={store.id}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-[auto_auto_1fr_auto] gap-2 border-t border-border bg-background px-4 py-3">
        <Button type="button" size="icon" variant="outline" className="h-11 w-11 rounded-xl" onClick={onUndo} disabled={!canUndo} aria-label="Undo"><Undo2 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-11 w-11 rounded-xl" onClick={onRedo} disabled={!canRedo} aria-label="Redo"><Redo2 className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onPreview}>Preview</Button>
        <Button type="button" className="min-h-11 gap-2" onClick={onSave} disabled={saving || !hasUnsavedChanges || !isOnline}>
          <Save className="h-4 w-4" />{saving ? "Saving" : hasUnsavedChanges ? "Save" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
