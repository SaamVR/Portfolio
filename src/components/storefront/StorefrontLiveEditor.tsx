"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Loader2, Paintbrush2, Plus, RotateCcw, Save, Settings2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { cmsBlockTypeOptions, createDefaultBlock } from "@/lib/cms/block-library";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
import { GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { supabase } from "@/integrations/supabase/client";
import { loadStoreBlueprints, resolveStoreBlueprint } from "@/lib/cms/store-blueprints";
import { loadThemePackages } from "@/lib/theme-packages";
import { Link, useLocation } from "@/lib/react-router-dom-shim";

const BASIC_TEXT_FIELDS = [
  "eyebrow",
  "tagline",
  "title",
  "highlight",
  "subtitle",
  "body",
  "ctaText",
  "ctaLink",
  "secondaryCtaText",
  "secondaryCtaLink",
  "badgeText",
  "mediaUrl",
  "videoUrl",
] as const;

const PROMO_BG_STYLES = ["gradient", "dark", "accent", "luxury-gold", "indigo", "rose", "aurora", "luxury-dark", "confetti", "mesh-gradient"] as const;
const PROMO_ALIGNMENTS = ["left", "center", "right"] as const;
const PROMO_PADDING_SIZES = ["compact", "cozy", "large"] as const;

function updatePage(store: Store, pageId: string, updater: (page: StorePage) => StorePage) {
  return {
    ...store,
    pages: store.pages.map((page) => (page.id === pageId ? updater(page) : page)),
  };
}

function updateBlock(store: Store, pageId: string, blockId: string, updater: (block: StorePageBlock) => StorePageBlock) {
  return updatePage(store, pageId, (page) => ({
    ...page,
    blocks: page.blocks.map((block) => (block.id === blockId ? updater(block) : block)) as StorePageBlock[],
  }));
}

export function StorefrontLiveEditor({
  store,
  page,
  setStore,
  adminMode,
  selectedBlockId,
  onAdminModeChange,
  onSelectedBlockChange,
  canManageStore,
  userId,
}: {
  store: Store;
  page: StorePage;
  setStore: React.Dispatch<React.SetStateAction<Store>>;
  adminMode: boolean;
  selectedBlockId: string | null;
  onAdminModeChange: (value: boolean) => void;
  onSelectedBlockChange: (value: string | null) => void;
  canManageStore: boolean;
  userId: string | null | undefined;
}) {
  const [editorMode, setEditorMode] = useState<"basic" | "advanced">("basic");
  const [saving, setSaving] = useState(false);
  const [nextBlockType, setNextBlockType] = useState<StorePageBlock["type"]>("rich-text");
  const [insertPosition, setInsertPosition] = useState<"before" | "after">("after");
  const [history, setHistory] = useState<Store[]>([]);
  const lastLoadedStoreRef = useRef(store);
  const location = useLocation();
  const pageEditorHref = `/admin/page-builder?page=${encodeURIComponent(page.id)}&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
  const selectedBlock = useMemo(
    () => page.blocks.find((block) => block.id === selectedBlockId) ?? null,
    [page.blocks, selectedBlockId],
  );

  useEffect(() => {
    if (!adminMode) {
      onSelectedBlockChange(null);
    }
  }, [adminMode, onSelectedBlockChange]);

  useEffect(() => {
    lastLoadedStoreRef.current = store;
    setHistory([]);
  }, [store]);

  if (!canManageStore) {
    return null;
  }

  const applyStoreChange = (updater: (current: Store) => Store) => {
    setStore((current) => {
      setHistory((existing) => {
        const next = [...existing, current];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });
      return updater(current);
    });
  };

  const undoLastChange = () => {
    setHistory((existing) => {
      const previous = existing[existing.length - 1];
      if (!previous) {
        toast.error("No live editor changes to undo.");
        return existing;
      }

      setStore(previous);
      return existing.slice(0, -1);
    });
  };

  const resetToLoadedState = () => {
    setStore(lastLoadedStoreRef.current);
    setHistory([]);
    onSelectedBlockChange(null);
    toast.success("Live editor reset to the last loaded storefront state.");
  };

  const updateStoreThemeToken = (token: string, value: string) => {
    applyStoreChange((current) => ({
      ...current,
      theme: {
        ...current.theme,
        customCssVars: {
          ...current.theme.customCssVars,
          [token]: value,
        },
      },
    }));
  };

  const updateSelectedBlockField = (field: string, value: string) => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => ({
      ...block,
      props: {
        ...(block.props as Record<string, unknown>),
        [field]: value,
      },
    } as StorePageBlock)));
  };

  const updateSelectedBlockProps = (patch: Record<string, unknown>) => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => ({
      ...block,
      props: {
        ...(block.props as Record<string, unknown>),
        ...patch,
      },
    } as StorePageBlock)));
  };

  const updateSelectedBlockNumber = (field: string, value: string) => {
    if (!selectedBlock) return;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      updateSelectedBlockProps({ [field]: undefined });
      return;
    }
    updateSelectedBlockProps({ [field]: parsed });
  };

  const updateSelectedBlockJsonArray = (field: string, value: string) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("Not an array");
      }
      updateSelectedBlockProps({ [field]: parsed });
    } catch {
      toast.error(`Invalid JSON array for ${field}.`);
    }
  };

  const updateSelectedArrayItem = (field: string, index: number, patch: Record<string, unknown>) => {
    if (!selectedBlock) return;
    const currentItems = Array.isArray((selectedBlock.props as Record<string, unknown>)[field])
      ? ([...(selectedBlock.props as Record<string, unknown>)[field] as unknown[]] as Record<string, unknown>[])
      : [];
    currentItems[index] = {
      ...(currentItems[index] ?? {}),
      ...patch,
    };
    updateSelectedBlockProps({ [field]: currentItems });
  };

  const addSelectedArrayItem = (field: string, item: Record<string, unknown>) => {
    if (!selectedBlock) return;
    const currentItems = Array.isArray((selectedBlock.props as Record<string, unknown>)[field])
      ? ([...(selectedBlock.props as Record<string, unknown>)[field] as unknown[]] as Record<string, unknown>[])
      : [];
    updateSelectedBlockProps({ [field]: [...currentItems, item] });
  };

  const removeSelectedArrayItem = (field: string, index: number) => {
    if (!selectedBlock) return;
    const currentItems = Array.isArray((selectedBlock.props as Record<string, unknown>)[field])
      ? ([...(selectedBlock.props as Record<string, unknown>)[field] as unknown[]] as Record<string, unknown>[])
      : [];
    updateSelectedBlockProps({ [field]: currentItems.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveSelectedBlock = (direction: -1 | 1) => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      const blocks = [...currentPage.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
      const index = blocks.findIndex((block) => block.id === selectedBlock.id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) {
        return currentPage;
      }

      const [block] = blocks.splice(index, 1);
      blocks.splice(nextIndex, 0, block);
      return {
        ...currentPage,
        blocks: blocks.map((item, sortOrder) => ({ ...item, sortOrder })),
      };
    }));
  };

  const duplicateSelectedBlock = () => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      const sourceIndex = currentPage.blocks.findIndex((block) => block.id === selectedBlock.id);
      if (sourceIndex === -1) {
        return currentPage;
      }

      const sourceBlock = currentPage.blocks[sourceIndex];
      const duplicatedBlock: StorePageBlock = {
        ...sourceBlock,
        id: crypto.randomUUID(),
        sortOrder: sourceIndex + 1,
      };

      const blocks = [...currentPage.blocks];
      blocks.splice(sourceIndex + 1, 0, duplicatedBlock);
      onSelectedBlockChange(duplicatedBlock.id);

      return {
        ...currentPage,
        blocks: blocks.map((block, index) => ({ ...block, sortOrder: index })),
      };
    }));
  };

  const removeSelectedBlock = () => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      if (currentPage.blocks.length <= 1) {
        toast.error("A page needs at least one block.");
        return currentPage;
      }

      const sourceIndex = currentPage.blocks.findIndex((block) => block.id === selectedBlock.id);
      if (sourceIndex === -1) {
        return currentPage;
      }

      const blocks = currentPage.blocks.filter((block) => block.id !== selectedBlock.id)
        .map((block, index) => ({ ...block, sortOrder: index }));
      const nextSelected = blocks[Math.max(0, sourceIndex - 1)] ?? blocks[0] ?? null;
      onSelectedBlockChange(nextSelected?.id ?? null);

      return {
        ...currentPage,
        blocks,
      };
    }));
  };

  const insertNewBlock = () => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      const sourceIndex = currentPage.blocks.findIndex((block) => block.id === selectedBlock.id);
      if (sourceIndex === -1) {
        return currentPage;
      }

      const insertionIndex = insertPosition === "before" ? sourceIndex : sourceIndex + 1;
      const nextBlock = createDefaultBlock(nextBlockType, insertionIndex);
      const blocks = [...currentPage.blocks];
      blocks.splice(insertionIndex, 0, nextBlock);
      onSelectedBlockChange(nextBlock.id);

      return {
        ...currentPage,
        blocks: blocks.map((block, index) => ({ ...block, sortOrder: index })),
      };
    }));
  };

  const saveLiveEdits = async () => {
    setSaving(true);
    try {
      const [blueprints, themePackages, businessProfileResult] = await Promise.all([
        loadStoreBlueprints(supabase),
        loadThemePackages(supabase, store.id),
        supabase.from("store_business_profiles").select("blueprint_id").eq("store_id", store.id).maybeSingle(),
      ]);
      const blueprint = resolveStoreBlueprint(businessProfileResult.data?.blueprint_id ?? null, blueprints);
      const result = await persistStorefrontState({
        client: supabase,
        store,
        ownerId: userId ?? null,
        blueprint,
        themePackages,
        selectedPage: page,
        revisionLabel: `Live ${editorMode} edit`,
        changedBy: userId ?? null,
      });

      if (result.error) {
        toast.error(`Failed to save live edits: ${result.error.message || "Unknown error"}`);
        return;
      }

      toast.success("Live storefront changes saved.");
    } finally {
      setSaving(false);
    }
  };

  const resolvedThemeVars = resolveStoreThemeVars(store.theme).vars;

  const renderAdvancedControls = () => {
    if (!selectedBlock || editorMode !== "advanced") {
      return null;
    }

    switch (selectedBlock.type) {
      case "hero":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Anchor ID</Label>
              <Input value={selectedBlock.props.anchorId ?? ""} onChange={(event) => updateSelectedBlockProps({ anchorId: event.target.value })} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Media Type</Label>
                <Select
                  value={(selectedBlock.props.mediaType as "image" | "video" | undefined) ?? "image"}
                  onValueChange={(value) => updateSelectedBlockProps({ mediaType: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Overlay Opacity</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedBlock.props.overlayOpacity?.toString() ?? ""}
                  onChange={(event) => updateSelectedBlockNumber("overlayOpacity", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Hero Media</Label>
              <CloudinaryUpload
                value={selectedBlock.props.mediaUrl ?? ""}
                onChange={(url) => updateSelectedBlockProps({ mediaUrl: url })}
                onSelectAsset={(asset) => {
                  if (!asset) return;
                  updateSelectedBlockProps({ mediaType: asset.resourceType });
                }}
                folder="hero"
                accept="image/*,video/*"
                label="Upload hero media"
                resourceType="auto"
                storeId={store.id}
              />
            </div>
            <div className="grid gap-2">
              <Label>Overlay Color</Label>
              <Input value={selectedBlock.props.overlayColor ?? ""} onChange={(event) => updateSelectedBlockProps({ overlayColor: event.target.value })} />
            </div>
          </div>
        );
      case "promo-banner":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Background Style</Label>
                <Select value={(selectedBlock.props.bgStyle as string | undefined) ?? "gradient"} onValueChange={(value) => updateSelectedBlockProps({ bgStyle: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROMO_BG_STYLES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Text Alignment</Label>
                <Select value={(selectedBlock.props.textAlignment as string | undefined) ?? "center"} onValueChange={(value) => updateSelectedBlockProps({ textAlignment: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROMO_ALIGNMENTS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Padding Size</Label>
                <Select value={(selectedBlock.props.paddingSize as string | undefined) ?? "cozy"} onValueChange={(value) => updateSelectedBlockProps({ paddingSize: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROMO_PADDING_SIZES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Card Opacity</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedBlock.props.cardOpacity?.toString() ?? ""}
                  onChange={(event) => updateSelectedBlockNumber("cardOpacity", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <Label>Glow</Label>
                <Switch checked={(selectedBlock.props.enableGlow as boolean | undefined) ?? false} onCheckedChange={(checked) => updateSelectedBlockProps({ enableGlow: checked })} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <Label>Particles</Label>
                <Switch checked={(selectedBlock.props.enableParticles as boolean | undefined) ?? true} onCheckedChange={(checked) => updateSelectedBlockProps({ enableParticles: checked })} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <Label>Orbs</Label>
                <Switch checked={(selectedBlock.props.enableOrbs as boolean | undefined) ?? true} onCheckedChange={(checked) => updateSelectedBlockProps({ enableOrbs: checked })} />
              </div>
            </div>
          </div>
        );
      case "featured-products":
        return (
          <div className="grid gap-2">
            <Label>Product Limit</Label>
            <Input
              type="number"
              min="1"
              max="24"
              value={selectedBlock.props.limit?.toString() ?? "6"}
              onChange={(event) => updateSelectedBlockNumber("limit", event.target.value)}
            />
          </div>
        );
      case "countdown":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input value={selectedBlock.props.endDate ?? ""} placeholder="2026-12-31T23:59:59" onChange={(event) => updateSelectedBlockProps({ endDate: event.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Background Gradient</Label>
              <Input value={selectedBlock.props.bgGradient ?? ""} onChange={(event) => updateSelectedBlockProps({ bgGradient: event.target.value })} />
            </div>
          </div>
        );
      case "rich-text":
        return (
          <div className="grid gap-2">
            <Label>Alignment</Label>
            <Select value={(selectedBlock.props.align as "left" | "center" | undefined) ?? "center"} onValueChange={(value) => updateSelectedBlockProps({ align: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">left</SelectItem>
                <SelectItem value="center">center</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "social-feed":
        return (
          <div className="grid gap-3">
            {((selectedBlock.props.images as string[] | undefined) ?? []).map((image, index) => (
              <div key={`${image}-${index}`} className="rounded-xl border border-border p-3">
                <div className="grid gap-2">
                  <Label>Image {index + 1}</Label>
                  <CloudinaryUpload
                    value={image}
                    onChange={(url) => {
                      const next = [ ...(((selectedBlock.props.images as string[] | undefined) ?? [])) ];
                      next[index] = url;
                      updateSelectedBlockProps({ images: next });
                    }}
                    folder="social-feed"
                    accept="image/*"
                    label="Upload social image"
                    resourceType="image"
                    storeId={store.id}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const next = [ ...(((selectedBlock.props.images as string[] | undefined) ?? [])) ].filter((_, itemIndex) => itemIndex !== index);
                    updateSelectedBlockProps({ images: next });
                  }}>
                    Remove image
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => updateSelectedBlockProps({
              images: [...(((selectedBlock.props.images as string[] | undefined) ?? [])), ""],
            })}>
              Add image
            </Button>
          </div>
        );
      case "video-reel":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Video Upload</Label>
              <CloudinaryUpload
                value={selectedBlock.props.videoUrl ?? ""}
                onChange={(url) => updateSelectedBlockProps({ videoUrl: url })}
                folder="video-reel"
                accept="video/*"
                label="Upload video"
                resourceType="video"
                storeId={store.id}
              />
            </div>
          </div>
        );
      case "faq-accordion":
        return (
          <div className="grid gap-3">
            {((selectedBlock.props.faqs as Array<{ q: string; a: string }> | undefined) ?? []).map((faq, index) => (
              <div key={`${faq.q}-${index}`} className="rounded-xl border border-border p-3">
                <div className="grid gap-2">
                  <Label>Question</Label>
                  <Input value={faq.q ?? ""} onChange={(event) => updateSelectedArrayItem("faqs", index, { q: event.target.value })} />
                  <Label>Answer</Label>
                  <Textarea rows={3} value={faq.a ?? ""} onChange={(event) => updateSelectedArrayItem("faqs", index, { a: event.target.value })} />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSelectedArrayItem("faqs", index)}>
                    Remove FAQ
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addSelectedArrayItem("faqs", { q: "", a: "" })}>
              Add FAQ
            </Button>
          </div>
        );
      case "trust-badges":
        return (
          <div className="grid gap-3">
            {((selectedBlock.props.badges as Array<{ label: string; description?: string; icon?: string }> | undefined) ?? []).map((badge, index) => (
              <div key={`${badge.label}-${index}`} className="rounded-xl border border-border p-3">
                <div className="grid gap-2">
                  <Label>Label</Label>
                  <Input value={badge.label ?? ""} onChange={(event) => updateSelectedArrayItem("badges", index, { label: event.target.value })} />
                  <Label>Description</Label>
                  <Textarea rows={2} value={badge.description ?? ""} onChange={(event) => updateSelectedArrayItem("badges", index, { description: event.target.value })} />
                  <Label>Icon</Label>
                  <Select value={badge.icon ?? "shield"} onValueChange={(value) => updateSelectedArrayItem("badges", index, { icon: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="truck">truck</SelectItem>
                      <SelectItem value="payment">payment</SelectItem>
                      <SelectItem value="returns">returns</SelectItem>
                      <SelectItem value="support">support</SelectItem>
                      <SelectItem value="shield">shield</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSelectedArrayItem("badges", index)}>
                    Remove badge
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addSelectedArrayItem("badges", { label: "", description: "", icon: "shield" })}>
              Add badge
            </Button>
          </div>
        );
      case "testimonials":
        return (
          <div className="grid gap-3">
            {((selectedBlock.props.reviews as Array<{ name: string; rating?: number; comment: string }> | undefined) ?? []).map((review, index) => (
              <div key={`${review.name}-${index}`} className="rounded-xl border border-border p-3">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={review.name ?? ""} onChange={(event) => updateSelectedArrayItem("reviews", index, { name: event.target.value })} />
                  <Label>Rating</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={String(review.rating ?? 5)}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value || "5", 10);
                      updateSelectedArrayItem("reviews", index, { rating: Number.isNaN(parsed) ? 5 : parsed });
                    }}
                  />
                  <Label>Comment</Label>
                  <Textarea rows={3} value={review.comment ?? ""} onChange={(event) => updateSelectedArrayItem("reviews", index, { comment: event.target.value })} />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSelectedArrayItem("reviews", index)}>
                    Remove review
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addSelectedArrayItem("reviews", { name: "", rating: 5, comment: "" })}>
              Add review
            </Button>
          </div>
        );
      default:
        return (
          <p className="text-xs text-muted-foreground">
            Advanced mode for this block is still lightweight here. Use Page Builder for deeper structure changes.
          </p>
        );
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
      <div className="pointer-events-auto flex justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <Button type="button" size="icon" variant={adminMode ? "secondary" : "ghost"} onClick={() => onAdminModeChange(!adminMode)}>
            {adminMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => undoLastChange()} disabled={history.length === 0} title="Undo live edit">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => resetToLoadedState()} title="Reset live editor">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Select value={editorMode} onValueChange={(value) => setEditorMode(value as "basic" | "advanced")}>
            <SelectTrigger className="h-9 w-[128px] rounded-full border-none bg-transparent px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic Mode</SelectItem>
              <SelectItem value="advanced">Advanced Mode</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" onClick={() => void saveLiveEdits()} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {adminMode ? (
        <div className="pointer-events-auto rounded-3xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live Website Editor</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{page.title}</p>
            </div>
            <Button asChild type="button" size="sm" variant="outline" className="rounded-full">
              <Link to={pageEditorHref}>Open Builder</Link>
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border p-3">
              <div className="mb-3 flex items-center gap-2">
                <Paintbrush2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Theme tokens</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {GUIDED_THEME_TOKENS.map((token) => {
                  const currentValue = store.theme.customCssVars[token.key] ?? resolvedThemeVars[token.key] ?? "";
                  return (
                    <div key={token.key} className="grid gap-2">
                      <Label>{token.label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={hslChannelsToHex(currentValue) ?? "#000000"}
                          onChange={(event) => {
                            const next = hexToHslChannels(event.target.value);
                            if (!next) return;
                            updateStoreThemeToken(token.key, next);
                          }}
                          className="h-10 w-16 p-1"
                        />
                        <Input value={currentValue} onChange={(event) => updateStoreThemeToken(token.key, event.target.value)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border p-3">
              <div className="mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Selected block</p>
              </div>
              {!selectedBlock ? (
                <p className="text-sm text-muted-foreground">Click a highlighted section on the storefront to edit it here.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{selectedBlock.type}</p>
                    <Switch
                      checked={selectedBlock.isVisible}
                      onCheckedChange={(checked) => setStore((current) => updateBlock(current, page.id, selectedBlock.id, (block) => ({ ...block, isVisible: checked })))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => moveSelectedBlock(-1)}>
                      <ArrowUp className="h-4 w-4" />
                      Up
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => moveSelectedBlock(1)}>
                      <ArrowDown className="h-4 w-4" />
                      Down
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => duplicateSelectedBlock()}>
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => removeSelectedBlock()}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                  {editorMode === "advanced" ? (
                    <div className="grid gap-3 rounded-xl border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Insert block inline</p>
                        <p className="text-xs text-muted-foreground">Add a new section before or after the currently selected block.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>Block Type</Label>
                          <Select value={nextBlockType} onValueChange={(value) => setNextBlockType(value as StorePageBlock["type"])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {cmsBlockTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Insert Position</Label>
                          <Select value={insertPosition} onValueChange={(value) => setInsertPosition(value as "before" | "after")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="before">Before selected</SelectItem>
                              <SelectItem value="after">After selected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => insertNewBlock()}>
                        <Plus className="h-4 w-4" />
                        Insert Block
                      </Button>
                    </div>
                  ) : null}
                  {BASIC_TEXT_FIELDS.filter((field) => typeof selectedBlock.props[field] === "string").map((field) => (
                    <div key={field} className="grid gap-2">
                      <Label>{field}</Label>
                      {field === "body" || field.toLowerCase().includes("subtitle") ? (
                        <Textarea
                          value={String(selectedBlock.props[field] ?? "")}
                          onChange={(event) => updateSelectedBlockField(field, event.target.value)}
                        />
                      ) : (
                        <Input
                          value={String(selectedBlock.props[field] ?? "")}
                          onChange={(event) => updateSelectedBlockField(field, event.target.value)}
                        />
                      )}
                    </div>
                  ))}
                  {renderAdvancedControls()}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
