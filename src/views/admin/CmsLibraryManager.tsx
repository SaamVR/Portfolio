"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Navigate } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Boxes, Edit3, Loader2, Layers3, Palette, LayoutTemplate, Save, Share2 } from "lucide-react";

type BlueprintRow = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  business_family: string;
  catalog_mode: string;
  group_name: string;
  is_active: boolean;
};

type ThemeRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  source_type: string;
  version: number;
  preset_id: string;
};

type PageRow = {
  id: string;
  name: string;
  description: string;
  business_family: string;
  is_active: boolean;
};

type BlockRow = {
  block_type: string;
  label: string;
  description: string;
  layer: string;
  is_active: boolean;
};

type LibraryData = {
  blueprints: BlueprintRow[];
  themes: ThemeRow[];
  pages: PageRow[];
  blocks: BlockRow[];
};

type EditState =
  | { type: "blueprint"; item: BlueprintRow }
  | { type: "page"; item: PageRow }
  | { type: "block"; item: BlockRow }
  | null;

export default function CmsLibraryManager() {
  const { platformRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("blueprints");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editState, setEditState] = useState<EditState>(null);
  const [editForm, setEditForm] = useState<Record<string, string | boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["cms-library-manager"],
    queryFn: async (): Promise<LibraryData> => {
      const [{ data: blueprints }, { data: themes }, { data: pages }, { data: blocks }] = await Promise.all([
        supabase.from("store_blueprints").select("id, name, short_name, description, business_family, catalog_mode, group_name, is_active").order("group_name").order("name"),
        supabase.from("theme_packages").select("id, slug, name, description, source_type, version, preset_id").order("name"),
        supabase.from("page_blueprints").select("id, name, description, business_family, is_active").order("name"),
        supabase.from("block_registry_entries").select("block_type, label, description, layer, is_active").order("label"),
      ]);

      return {
        blueprints: blueprints ?? [],
        themes: themes ?? [],
        pages: pages ?? [],
        blocks: blocks ?? [],
      };
    },
    enabled: platformRole === "admin",
  });

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!data || !query) return data;

    return {
      blueprints: data.blueprints.filter((item) => [item.name, item.short_name, item.description, item.group_name, item.catalog_mode].some((value) => value.toLowerCase().includes(query))),
      themes: data.themes.filter((item) => [item.name, item.slug, item.description, item.source_type, item.preset_id].some((value) => value.toLowerCase().includes(query))),
      pages: data.pages.filter((item) => [item.name, item.description, item.business_family].some((value) => value.toLowerCase().includes(query))),
      blocks: data.blocks.filter((item) => [item.label, item.description, item.block_type, item.layer].some((value) => value.toLowerCase().includes(query))),
    };
  }, [data, search]);

  if (platformRole !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cms-library-manager"] });
  };

  const updateRow = async (
    table: "store_blueprints" | "page_blueprints" | "block_registry_entries" | "theme_packages",
    idColumn: string,
    idValue: string,
    patch: Record<string, unknown>,
  ) => {
    setSavingId(`${table}:${idValue}`);
    const { error } = await (supabase as any).from(table).update(patch).eq(idColumn, idValue);
    if (error) {
      toast.error("Failed to update library item.");
    } else {
      toast.success("Library item updated.");
      await refresh();
    }
    setSavingId(null);
  };

  const openEditor = (state: NonNullable<EditState>) => {
    setEditState(state);
    setEditForm({ ...state.item });
  };

  const saveEditor = async () => {
    if (!editState) return;

    if (editState.type === "blueprint") {
      await updateRow("store_blueprints", "id", editState.item.id, {
        name: editForm.name,
        short_name: editForm.short_name,
        description: editForm.description,
        business_family: editForm.business_family,
        catalog_mode: editForm.catalog_mode,
        group_name: editForm.group_name,
      });
    }

    if (editState.type === "page") {
      await updateRow("page_blueprints", "id", editState.item.id, {
        name: editForm.name,
        description: editForm.description,
        business_family: editForm.business_family,
      });
    }

    if (editState.type === "block") {
      await updateRow("block_registry_entries", "block_type", editState.item.block_type, {
        label: editForm.label,
        description: editForm.description,
        layer: editForm.layer,
      });
    }

    setEditState(null);
  };

  const promoteTheme = async (item: ThemeRow) => {
    if (item.source_type === "admin_shared" || item.source_type === "system") {
      toast.message("Theme is already shared.");
      return;
    }

    await updateRow("theme_packages", "id", item.id, { source_type: "admin_shared" });
  };

  const blueprintCards = filteredData?.blueprints ?? [];
  const themeCards = filteredData?.themes ?? [];
  const pageCards = filteredData?.pages ?? [];
  const blockCards = filteredData?.blocks ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary" className="gap-2">
          <Layers3 className="h-3.5 w-3.5" />
          Shared Library
        </Badge>
        <h1 className="font-heading text-3xl font-bold text-foreground">CMS Library Manager</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Curate the shared blueprints, themes, page blueprints, and block registry entries that power tenant-safe storefront setup.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Library Search</CardTitle>
            <CardDescription>Filter across the active shared-library tab.</CardDescription>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cms-library-search">Search</Label>
            <Input id="cms-library-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search blueprints, themes, pages, or blocks" />
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="blueprints" className="gap-2"><Layers3 className="h-4 w-4" />Blueprints</TabsTrigger>
          <TabsTrigger value="themes" className="gap-2"><Palette className="h-4 w-4" />Themes</TabsTrigger>
          <TabsTrigger value="pages" className="gap-2"><LayoutTemplate className="h-4 w-4" />Pages</TabsTrigger>
          <TabsTrigger value="blocks" className="gap-2"><Boxes className="h-4 w-4" />Blocks</TabsTrigger>
        </TabsList>

        <TabsContent value="blueprints" className="space-y-4">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : blueprintCards.map((item) => (
            <Card key={item.id} className="border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.group_name}</Badge>
                    <Badge variant="secondary">{item.catalog_mode.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="grid gap-2">
                  <Label>Business Family</Label>
                  <Input value={item.business_family} readOnly />
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditor({ type: "blueprint", item })}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(checked) => void updateRow("store_blueprints", "id", item.id, { is_active: checked })}
                    disabled={savingId === `store_blueprints:${item.id}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : themeCards.map((item) => (
            <Card key={item.id} className="border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.source_type.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary">v{item.version}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label>Slug</Label>
                    <Input value={item.slug} readOnly />
                  </div>
                  <div>
                    <Label>Preset Bridge</Label>
                    <Input value={item.preset_id} readOnly />
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => void promoteTheme(item)}
                    disabled={savingId === `theme_packages:${item.id}` || item.source_type === "admin_shared" || item.source_type === "system"}
                  >
                    {savingId === `theme_packages:${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                    Promote to Shared
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : pageCards.map((item) => (
            <Card key={item.id} className="border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{item.business_family}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditor({ type: "page", item })}>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
                <Switch
                  checked={item.is_active}
                  onCheckedChange={(checked) => void updateRow("page_blueprints", "id", item.id, { is_active: checked })}
                  disabled={savingId === `page_blueprints:${item.id}`}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : blockCards.map((item) => (
            <Card key={item.block_type} className="border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{item.label}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{item.layer}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="grid gap-1">
                  <Label>Block Type</Label>
                  <Input value={item.block_type} readOnly />
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditor({ type: "block", item })}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(checked) => void updateRow("block_registry_entries", "block_type", item.block_type, { is_active: checked })}
                    disabled={savingId === `block_registry_entries:${item.block_type}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editState)} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editState?.type === "blueprint" ? "Edit Blueprint"
                : editState?.type === "page" ? "Edit Page Blueprint"
                : editState?.type === "block" ? "Edit Block Registry Entry"
                : "Edit Library Item"}
            </DialogTitle>
            <DialogDescription>
              Update the shared-library metadata without changing merchant-installed snapshots in place.
            </DialogDescription>
          </DialogHeader>

          {editState?.type === "blueprint" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={String(editForm.name ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Short Name</Label>
                <Input value={String(editForm.short_name ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, short_name: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea rows={4} value={String(editForm.description ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Business Family</Label>
                  <Input value={String(editForm.business_family ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, business_family: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Catalog Mode</Label>
                  <Input value={String(editForm.catalog_mode ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, catalog_mode: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Group</Label>
                  <Input value={String(editForm.group_name ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, group_name: event.target.value }))} />
                </div>
              </div>
            </div>
          ) : null}

          {editState?.type === "page" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={String(editForm.name ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea rows={4} value={String(editForm.description ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Business Family</Label>
                <Input value={String(editForm.business_family ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, business_family: event.target.value }))} />
              </div>
            </div>
          ) : null}

          {editState?.type === "block" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Label</Label>
                <Input value={String(editForm.label ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, label: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea rows={4} value={String(editForm.description ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Layer</Label>
                <Input value={String(editForm.layer ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, layer: event.target.value }))} />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditState(null)}>Cancel</Button>
            <Button onClick={() => void saveEditor()} className="gap-2" disabled={Boolean(savingId)}>
              {savingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
