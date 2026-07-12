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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Boxes, Edit3, Layers3, LayoutTemplate, Loader2, Palette, Plus, Save, Share2 } from "lucide-react";
import { createDefaultBlock, reservedCmsSlugs } from "@/lib/cms/block-library";
import { PageBlueprintEditorForm } from "@/components/admin/cms-library/PageBlueprintEditorForm";
import {
  blockLayerOptions,
  buildBlockForm,
  buildBlueprintForm,
  buildPageForm,
  businessFamilyOptions,
  catalogModeOptions,
  type DialogState,
  type FormState,
  type LibraryData,
  type ThemeRow,
  knownBlockTypes,
  knownCapabilities,
  knownPageBlueprintIds,
  legacyTemplateOptions,
  onboardingStepOptions,
  parseJsonField,
  parseStringArrayField,
  readJsonObject,
  readOnboardingSteps,
  readPagePayload,
  readStringArray,
  slugify,
  updateObjectJsonField,
  updatePagePayloadBlocks,
  updatePagePayloadField,
  writeOnboardingSteps,
  writeStringArray,
} from "@/components/admin/cms-library/shared";

export default function CmsLibraryManager() {
  const { platformRole, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("blueprints");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [form, setForm] = useState<FormState>({});

  const { data, isLoading } = useQuery({
    queryKey: ["cms-library-manager"],
    queryFn: async (): Promise<LibraryData> => {
      const [{ data: blueprints }, { data: themes }, { data: pages }, { data: blocks }] = await Promise.all([
        supabase
          .from("store_blueprints")
          .select("id, name, short_name, description, business_family, catalog_mode, group_name, store_description, legacy_template_id, recommended_page_set, recommended_block_set, required_capabilities, default_theme, hero_payload, onboarding_schema, default_site_settings, is_active")
          .order("group_name")
          .order("name"),
        supabase
          .from("theme_packages")
          .select("id, slug, name, description, source_type, version, preset_id, owner_store_id")
          .order("name"),
        supabase
          .from("page_blueprints")
          .select("id, name, description, business_family, catalog_modes, page_payload, is_active")
          .order("name"),
        supabase
          .from("block_registry_entries")
          .select("block_type, label, description, layer, compatible_business_families, required_capabilities, is_active")
          .order("label"),
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

    const matches = (...values: unknown[]) =>
      values.some((value) => String(value ?? "").toLowerCase().includes(query));

    return {
      blueprints: data.blueprints.filter((item) => matches(item.name, item.short_name, item.description, item.group_name, item.catalog_mode, item.id)),
      themes: data.themes.filter((item) => matches(item.name, item.slug, item.description, item.source_type, item.preset_id)),
      pages: data.pages.filter((item) => matches(item.name, item.description, item.business_family, item.id)),
      blocks: data.blocks.filter((item) => matches(item.label, item.description, item.block_type, item.layer)),
    };
  }, [data, search]);

  if (platformRole !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cms-library-manager"] });
  };

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

  const updateHeroField = (key: string, value: string) => {
    updateField("hero_payload", updateObjectJsonField(form.hero_payload, { [key]: value }));
  };

  const updateDefaultThemeField = (key: string, value: string) => {
    updateField("default_theme", updateObjectJsonField(form.default_theme, { [key]: value }));
  };

  const onboardingSteps = readOnboardingSteps(form.onboarding_schema);

  const updateOnboardingStep = (
    index: number,
    key: "id" | "title" | "description",
    value: string,
  ) => {
    const nextSteps = onboardingSteps.map((step, stepIndex) => (
      stepIndex === index ? { ...step, [key]: value } : step
    ));
    updateField("onboarding_schema", writeOnboardingSteps(nextSteps, form.onboarding_schema));
  };

  const addOnboardingStep = () => {
    const nextSteps = [...onboardingSteps, { id: "launch", title: "New Step", description: "Describe this step." }];
    updateField("onboarding_schema", writeOnboardingSteps(nextSteps, form.onboarding_schema));
  };

  const removeOnboardingStep = (index: number) => {
    const nextSteps = onboardingSteps.filter((_, stepIndex) => stepIndex !== index);
    updateField("onboarding_schema", writeOnboardingSteps(nextSteps, form.onboarding_schema));
  };

  const pagePayload = readPagePayload(form.page_payload);

  const updatePagePayloadMeta = (key: "slug" | "title" | "seoTitle" | "seoDescription", value: string) => {
    updateField("page_payload", updatePagePayloadField(form.page_payload, { [key]: value }));
  };

  const updatePagePayloadHomepage = (checked: boolean) => {
    updateField("page_payload", updatePagePayloadField(form.page_payload, { isHomepage: checked }));
  };

  const addPagePayloadBlock = (type: string) => {
    const nextBlocks = [
      ...pagePayload.blocks,
      createDefaultBlock(type as any, pagePayload.blocks.length),
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
      type === "blueprint"
        ? buildBlueprintForm()
        : type === "page"
          ? buildPageForm()
          : buildBlockForm(),
    );
  };

  const openEditDialog = (state: Exclude<DialogState, null>) => {
    setDialogState(state);
    setForm(
      state.type === "blueprint"
        ? buildBlueprintForm(state.item)
        : state.type === "page"
          ? buildPageForm(state.item)
          : buildBlockForm(state.item),
    );
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
      toast.error(error.message || "Failed to update library item.");
    } else {
      toast.success("Library item updated.");
      await refresh();
    }
    setSavingId(null);
  };

  const insertRow = async (
    table: "store_blueprints" | "page_blueprints" | "block_registry_entries",
    payload: Record<string, unknown>,
    identity: string,
  ) => {
    setSavingId(`${table}:${identity}`);
    const { error } = await (supabase as any).from(table).insert(payload);
    if (error) {
      toast.error(error.message || "Failed to create library item.");
      setSavingId(null);
      return false;
    }

    toast.success("Library item created.");
    await refresh();
    setSavingId(null);
    return true;
  };

  const saveDialog = async () => {
    if (!dialogState) return;

    try {
      if (dialogState.type === "blueprint") {
        const id = slugify(String(form.id || form.short_name || form.name || ""));
        if (!id || !String(form.name || "").trim() || !String(form.short_name || "").trim()) {
          toast.error("Blueprint id, name, and short name are required.");
          return;
        }

        const payload = {
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
        };

        if (dialogState.mode === "create") {
          const created = await insertRow("store_blueprints", payload, id);
          if (created) setDialogState(null);
          return;
        }

        await updateRow("store_blueprints", "id", dialogState.item!.id, payload);
        setDialogState(null);
        return;
      }

      if (dialogState.type === "page") {
        const id = slugify(String(form.id || form.name || ""));
        if (!id || !String(form.name || "").trim()) {
          toast.error("Page blueprint id and name are required.");
          return;
        }

        const payload = {
          id,
          name: String(form.name).trim(),
          description: String(form.description || "").trim(),
          business_family: String(form.business_family || "commerce").trim(),
          catalog_modes: parseStringArrayField(String(form.catalog_modes || "[]"), "Catalog modes"),
          page_payload: parseJsonField(String(form.page_payload || "{}"), "Page payload"),
          is_active: Boolean(form.is_active),
        };

        if (dialogState.mode === "create") {
          const created = await insertRow("page_blueprints", payload, id);
          if (created) setDialogState(null);
          return;
        }

        await updateRow("page_blueprints", "id", dialogState.item!.id, payload);
        setDialogState(null);
        return;
      }

      const blockType = slugify(String(form.block_type || ""));
      if (!blockType || !String(form.label || "").trim()) {
        toast.error("Block type and label are required.");
        return;
      }

      const payload = {
        block_type: blockType,
        label: String(form.label).trim(),
        description: String(form.description || "").trim(),
        layer: String(form.layer || "core").trim(),
        compatible_business_families: parseStringArrayField(String(form.compatible_business_families || "[]"), "Compatible business families"),
        required_capabilities: parseStringArrayField(String(form.required_capabilities || "[]"), "Required capabilities"),
        is_active: Boolean(form.is_active),
      };

      if (dialogState.mode === "create") {
        const created = await insertRow("block_registry_entries", payload, blockType);
        if (created) setDialogState(null);
        return;
      }

      await updateRow("block_registry_entries", "block_type", dialogState.item!.block_type, payload);
      setDialogState(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save library item.");
    }
  };

  const promoteTheme = async (item: ThemeRow) => {
    if (item.source_type === "admin_shared" || item.source_type === "system") {
      toast.message("Theme is already shared.");
      return;
    }

    setSavingId(`theme_packages:${item.id}`);
    const { error } = await (supabase as any)
      .from("theme_packages")
      .update({
        source_type: "admin_shared",
        owner_store_id: null,
        created_by: user?.id ?? null,
      })
      .eq("id", item.id);

    if (error) {
      toast.error(error.message || "Failed to promote theme.");
    } else {
      toast.success("Theme promoted to admin shared.");
      await refresh();
    }
    setSavingId(null);
  };

  const blueprintCards = filteredData?.blueprints ?? [];
  const themeCards = filteredData?.themes ?? [];
  const pageCards = filteredData?.pages ?? [];
  const blockCards = filteredData?.blocks ?? [];
  const activeDialogTitle = dialogState
    ? `${dialogState.mode === "create" ? "Create" : "Edit"} ${dialogState.type === "blueprint" ? "Blueprint" : dialogState.type === "page" ? "Page Blueprint" : "Block Registry Entry"}`
    : "";
  const selectedRecommendedPages = readStringArray(form.recommended_page_set);
  const selectedRecommendedBlocks = readStringArray(form.recommended_block_set);
  const selectedCapabilities = readStringArray(form.required_capabilities);
  const selectedCatalogModes = readStringArray(form.catalog_modes);
  const selectedCompatibleBusinessFamilies = readStringArray(form.compatible_business_families);
  const heroPayload = readJsonObject(form.hero_payload) ?? {};
  const defaultThemePayload = readJsonObject(form.default_theme) ?? {};
  const canUseHomepageSlug = pagePayload.isHomepage || pagePayload.slug === "/";
  const slugIsReserved = pagePayload.slug !== "/" && reservedCmsSlugs.has(pagePayload.slug);

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
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => openCreateDialog("blueprint")}>
              <Plus className="h-4 w-4" />
              New Blueprint
            </Button>
          </div>
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
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditDialog({ mode: "edit", type: "blueprint", item })}>
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
                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <Label>Slug</Label>
                    <Input value={item.slug} readOnly />
                  </div>
                  <div>
                    <Label>Preset Bridge</Label>
                    <Input value={item.preset_id} readOnly />
                  </div>
                  <div>
                    <Label>Owner Store</Label>
                    <Input value={item.owner_store_id ?? "Shared"} readOnly />
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
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => openCreateDialog("page")}>
              <Plus className="h-4 w-4" />
              New Page Blueprint
            </Button>
          </div>
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
                <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditDialog({ mode: "edit", type: "page", item })}>
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
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => openCreateDialog("block")}>
              <Plus className="h-4 w-4" />
              New Block Entry
            </Button>
          </div>
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
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditDialog({ mode: "edit", type: "block", item })}>
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

      <Dialog open={Boolean(dialogState)} onOpenChange={(open) => !open && setDialogState(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{activeDialogTitle}</DialogTitle>
            <DialogDescription>
              Edit shared-library metadata and payloads without overwriting merchant-installed snapshots in place.
            </DialogDescription>
          </DialogHeader>

          {dialogState?.type === "blueprint" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Blueprint Id</Label>
                  <Input value={String(form.id ?? "")} onChange={(event) => updateField("id", event.target.value)} disabled={dialogState.mode === "edit"} />
                </div>
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={String(form.name ?? "")} onChange={(event) => updateField("name", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Short Name</Label>
                  <Input value={String(form.short_name ?? "")} onChange={(event) => updateField("short_name", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea rows={3} value={String(form.description ?? "")} onChange={(event) => updateField("description", event.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Business Family</Label>
                  <Select value={String(form.business_family ?? "commerce")} onValueChange={(value) => updateField("business_family", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {businessFamilyOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Catalog Mode</Label>
                  <Select value={String(form.catalog_mode ?? "multi_product")} onValueChange={(value) => updateField("catalog_mode", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {catalogModeOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Group</Label>
                  <Input value={String(form.group_name ?? "")} onChange={(event) => updateField("group_name", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Legacy Template</Label>
                  <Select value={String(form.legacy_template_id ?? "general")} onValueChange={(value) => updateField("legacy_template_id", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {legacyTemplateOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Store Description</Label>
                <Textarea rows={3} value={String(form.store_description ?? "")} onChange={(event) => updateField("store_description", event.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Recommended Page Set</Label>
                  <Input
                    value={selectedRecommendedPages.join(", ")}
                    onChange={(event) => updateDelimitedStringArrayField("recommended_page_set", event.target.value)}
                    placeholder="home, policy, about"
                  />
                  <div className="flex flex-wrap gap-2">
                    {knownPageBlueprintIds.map((pageId) => (
                      <label key={pageId} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                        <Checkbox
                          checked={selectedRecommendedPages.includes(pageId)}
                          onCheckedChange={(checked) => toggleStringArrayField("recommended_page_set", pageId, checked === true)}
                        />
                        <span>{pageId}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Recommended Block Set</Label>
                  <Input
                    value={selectedRecommendedBlocks.join(", ")}
                    onChange={(event) => updateDelimitedStringArrayField("recommended_block_set", event.target.value)}
                    placeholder="hero, featured-products, faq-accordion"
                  />
                  <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
                    {knownBlockTypes.map((blockType) => (
                      <label key={blockType} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                        <Checkbox
                          checked={selectedRecommendedBlocks.includes(blockType)}
                          onCheckedChange={(checked) => toggleStringArrayField("recommended_block_set", blockType, checked === true)}
                        />
                        <span>{blockType}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Required Capabilities</Label>
                  <Input
                    value={selectedCapabilities.join(", ")}
                    onChange={(event) => updateDelimitedStringArrayField("required_capabilities", event.target.value)}
                    placeholder="catalog, checkout, promotions"
                  />
                  <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
                    {knownCapabilities.map((capability) => (
                      <label key={capability} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                        <Checkbox
                          checked={selectedCapabilities.includes(capability)}
                          onCheckedChange={(checked) => toggleStringArrayField("required_capabilities", capability, checked === true)}
                        />
                        <span>{capability}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Default Theme</Label>
                  <div className="grid gap-3 rounded-md border border-border p-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Preset Id</Label>
                        <Input
                          value={String(defaultThemePayload.presetId ?? "")}
                          onChange={(event) => updateDefaultThemeField("presetId", event.target.value)}
                          placeholder="midnight-blue"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Mode</Label>
                        <Select value={String(defaultThemePayload.mode ?? "dark")} onValueChange={(value) => updateDefaultThemeField("mode", value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">light</SelectItem>
                            <SelectItem value="dark">dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="grid gap-2">
                        <Label>Heading Font</Label>
                        <Input
                          value={String(defaultThemePayload.headingFont ?? "")}
                          onChange={(event) => updateDefaultThemeField("headingFont", event.target.value)}
                          placeholder="'Outfit', sans-serif"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Body Font</Label>
                        <Input
                          value={String(defaultThemePayload.bodyFont ?? "")}
                          onChange={(event) => updateDefaultThemeField("bodyFont", event.target.value)}
                          placeholder="'Inter', sans-serif"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Border Radius</Label>
                        <Input
                          value={String(defaultThemePayload.borderRadius ?? "")}
                          onChange={(event) => updateDefaultThemeField("borderRadius", event.target.value)}
                          placeholder="0.75rem"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Default Theme JSON</Label>
                  <Textarea rows={6} value={String(form.default_theme ?? "")} onChange={(event) => updateField("default_theme", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Hero Content</Label>
                  <div className="grid gap-3 rounded-md border border-border p-3">
                    <div className="grid gap-2">
                      <Label>Tagline</Label>
                      <Input value={String(heroPayload.tagline ?? "")} onChange={(event) => updateHeroField("tagline", event.target.value)} />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input value={String(heroPayload.title ?? "")} onChange={(event) => updateHeroField("title", event.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Highlight</Label>
                        <Input value={String(heroPayload.highlight ?? "")} onChange={(event) => updateHeroField("highlight", event.target.value)} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Subtitle</Label>
                      <Textarea rows={4} value={String(heroPayload.subtitle ?? "")} onChange={(event) => updateHeroField("subtitle", event.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Hero Payload JSON</Label>
                  <Textarea rows={8} value={String(form.hero_payload ?? "")} onChange={(event) => updateField("hero_payload", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Onboarding Steps</Label>
                  <div className="grid gap-3 rounded-md border border-border p-3">
                    {onboardingSteps.map((step, index) => (
                      <div key={`${step.id}-${index}`} className="grid gap-3 rounded-md border border-border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="grid gap-2 flex-1 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Step Id</Label>
                              <Select value={step.id} onValueChange={(value) => updateOnboardingStep(index, "id", value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {onboardingStepOptions.map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Title</Label>
                              <Input value={step.title} onChange={(event) => updateOnboardingStep(index, "title", event.target.value)} />
                            </div>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => removeOnboardingStep(index)}>
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea rows={3} value={step.description} onChange={(event) => updateOnboardingStep(index, "description", event.target.value)} />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="gap-2" onClick={addOnboardingStep}>
                      <Plus className="h-4 w-4" />
                      Add Step
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Onboarding Schema JSON</Label>
                  <Textarea rows={8} value={String(form.onboarding_schema ?? "")} onChange={(event) => updateField("onboarding_schema", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Default Site Settings JSON</Label>
                <Textarea rows={8} value={String(form.default_site_settings ?? "")} onChange={(event) => updateField("default_site_settings", event.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={Boolean(form.is_active)} onCheckedChange={(checked) => updateField("is_active", checked)} />
                <Label>Active</Label>
              </div>
            </div>
          ) : null}

          {dialogState?.type === "page" ? (
            <PageBlueprintEditorForm
              form={form}
              isEditing={dialogState.mode === "edit"}
              businessFamilyOptions={businessFamilyOptions}
              catalogModeOptions={catalogModeOptions}
              knownBlockTypes={knownBlockTypes}
              selectedCatalogModes={selectedCatalogModes}
              pagePayload={pagePayload}
              slugIsReserved={slugIsReserved}
              onUpdateField={updateField}
              onUpdateDelimitedStringArrayField={updateDelimitedStringArrayField}
              onToggleStringArrayField={toggleStringArrayField}
              onUpdatePagePayloadMeta={updatePagePayloadMeta}
              onUpdatePagePayloadHomepage={updatePagePayloadHomepage}
              onAddPagePayloadBlock={addPagePayloadBlock}
              onRemovePagePayloadBlock={removePagePayloadBlock}
              onMovePagePayloadBlock={movePagePayloadBlock}
              onUpdatePagePayloadBlock={updatePagePayloadBlock}
              onUpdatePagePayloadBlockProps={updatePagePayloadBlockProps}
            />
          ) : null}

          {dialogState?.type === "block" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Block Type</Label>
                  <Input value={String(form.block_type ?? "")} onChange={(event) => updateField("block_type", event.target.value)} disabled={dialogState.mode === "edit"} />
                </div>
                <div className="grid gap-2">
                  <Label>Label</Label>
                  <Input value={String(form.label ?? "")} onChange={(event) => updateField("label", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Layer</Label>
                  <Select value={String(form.layer ?? "core")} onValueChange={(value) => updateField("layer", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {blockLayerOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea rows={3} value={String(form.description ?? "")} onChange={(event) => updateField("description", event.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Compatible Business Families</Label>
                  <Input
                    value={selectedCompatibleBusinessFamilies.join(", ")}
                    onChange={(event) => updateDelimitedStringArrayField("compatible_business_families", event.target.value)}
                    placeholder="commerce, booking"
                  />
                  <div className="flex flex-wrap gap-2 rounded-md border border-border p-2">
                    {businessFamilyOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                        <Checkbox
                          checked={selectedCompatibleBusinessFamilies.includes(option)}
                          onCheckedChange={(checked) => toggleStringArrayField("compatible_business_families", option, checked === true)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Required Capabilities</Label>
                  <Input
                    value={selectedCapabilities.join(", ")}
                    onChange={(event) => updateDelimitedStringArrayField("required_capabilities", event.target.value)}
                    placeholder="catalog, checkout"
                  />
                  <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
                    {knownCapabilities.map((capability) => (
                      <label key={capability} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                        <Checkbox
                          checked={selectedCapabilities.includes(capability)}
                          onCheckedChange={(checked) => toggleStringArrayField("required_capabilities", capability, checked === true)}
                        />
                        <span>{capability}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={Boolean(form.is_active)} onCheckedChange={(checked) => updateField("is_active", checked)} />
                <Label>Active</Label>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogState(null)}>Cancel</Button>
            <Button onClick={() => void saveDialog()} className="gap-2" disabled={Boolean(savingId)}>
              {savingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
