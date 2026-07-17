"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Paintbrush2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
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

  if (!canManageStore) {
    return null;
  }

  const updateStoreThemeToken = (token: string, value: string) => {
    setStore((current) => ({
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

    setStore((current) => updateBlock(current, page.id, selectedBlock.id, (block) => ({
      ...block,
      props: {
        ...(block.props as Record<string, unknown>),
        [field]: value,
      },
    } as StorePageBlock)));
  };

  const moveSelectedBlock = (direction: -1 | 1) => {
    if (!selectedBlock) return;

    setStore((current) => updatePage(current, page.id, (currentPage) => {
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

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
      <div className="pointer-events-auto flex justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <Button type="button" size="icon" variant={adminMode ? "secondary" : "ghost"} onClick={() => onAdminModeChange(!adminMode)}>
            {adminMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  </div>
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
                  {editorMode === "advanced" ? (
                    <p className="text-xs text-muted-foreground">Advanced mode keeps the live editor focused, then hands complex page structure changes off to Page Builder.</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
