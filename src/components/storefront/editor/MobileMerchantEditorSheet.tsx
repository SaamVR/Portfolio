"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, ImagePlus, LayoutGrid, Palette, Save, Settings2, Trash2, Undo2, Redo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import type { Store, StorePageBlock } from "@/lib/cms/schema";
import { GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { getBasicLayoutVariantOptions } from "@/lib/cms/storefront-editor-registry";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import type { StorefrontEditorQualityIssue } from "@/lib/cms/storefront-platform/editor/quality-assist";
import { MobileCameraUpload } from "./MobileCameraUpload";

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
  templateId,
  saving,
  hasUnsavedChanges,
  saveStatusLabel,
  isOnline,
  localDraftProtected,
  qualityIssues,
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
}: {
  store: Store;
  selectedBlock: StorePageBlock | null;
  templateId: StorefrontTemplateId;
  saving: boolean;
  hasUnsavedChanges: boolean;
  saveStatusLabel: string;
  isOnline: boolean;
  localDraftProtected: boolean;
  qualityIssues: StorefrontEditorQualityIssue[];
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
}) {
  const [activeTab, setActiveTab] = useState<MobileEditorTab>("content");
  const layoutOptions = useMemo(
    () => selectedBlock ? getBasicLayoutVariantOptions(templateId, selectedBlock.type) : [],
    [selectedBlock, templateId],
  );
  const mediaFields = useMemo(() => getMediaFields(selectedBlock), [selectedBlock]);
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
                {MOBILE_TEXT_FIELDS.filter((field) => typeof props[field] === "string").map((field) => (
                  <div key={field} className="grid gap-2">
                    <Label className="capitalize">{field.replace(/([A-Z])/g, " $1")}</Label>
                    {field === "body" || field.toLowerCase().includes("subtitle") ? (
                      <Textarea className="min-h-24 text-base" value={String(props[field] ?? "")} onChange={(event) => onUpdateBlockProps({ [field]: event.target.value })} />
                    ) : (
                      <Input className="h-11 text-base" value={String(props[field] ?? "")} onChange={(event) => onUpdateBlockProps({ [field]: event.target.value })} />
                    )}
                  </div>
                ))}
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
            {selectedBlock && layoutOptions.length === 0 ? <p className="text-sm text-muted-foreground">This section currently has one registered layout.</p> : null}
            {selectedBlock && layoutOptions.map((option) => {
              const selected = selectedBlock.layoutVariant === option.id || (!selectedBlock.layoutVariant && option.recommended);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  onClick={() => onUpdateBlockMeta({ layoutVariant: option.id })}
                >
                  <div className="flex items-center justify-between gap-2"><p className="font-semibold">{option.label}</p>{option.recommended ? <Badge variant="secondary">Recommended</Badge> : null}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.previewSummary ?? option.guidance}</p>
                </button>
              );
            })}
          </div>
        ) : null}

        {activeTab === "style" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
              Store colors stay independent from section layout. Changing a layout never rewrites these theme colors.
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
            {selectedBlock && mediaFields.length === 0 ? <p className="text-sm text-muted-foreground">This section has no simple primary-media field. Use the guided workspace for its richer media collection.</p> : null}
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
