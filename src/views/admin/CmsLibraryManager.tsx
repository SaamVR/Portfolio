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
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Page Blueprint Id</Label>
                  <Input value={String(form.id ?? "")} onChange={(event) => updateField("id", event.target.value)} disabled={dialogState.mode === "edit"} />
                </div>
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={String(form.name ?? "")} onChange={(event) => updateField("name", event.target.value)} />
                </div>
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
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea rows={3} value={String(form.description ?? "")} onChange={(event) => updateField("description", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Catalog Modes</Label>
                <Input
                  value={selectedCatalogModes.join(", ")}
                  onChange={(event) => updateDelimitedStringArrayField("catalog_modes", event.target.value)}
                  placeholder="single_product, multi_product"
                />
                <div className="flex flex-wrap gap-2 rounded-md border border-border p-2">
                  {catalogModeOptions.map((mode) => (
                    <label key={mode} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                      <Checkbox
                        checked={selectedCatalogModes.includes(mode)}
                        onCheckedChange={(checked) => toggleStringArrayField("catalog_modes", mode, checked === true)}
                      />
                      <span>{mode.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Page Payload JSON</Label>
                <div className="grid gap-3 rounded-md border border-border p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Slug</Label>
                      <Input
                        value={pagePayload.slug}
                        onChange={(event) => updatePagePayloadMeta("slug", event.target.value)}
                        placeholder="/landing"
                      />
                      {slugIsReserved ? (
                        <p className="text-xs text-amber-600">This slug is reserved for storefront routing. Use `/` only for a homepage or choose a different path.</p>
                      ) : null}
                    </div>
                    <div className="grid gap-2">
                      <Label>Title</Label>
                      <Input value={pagePayload.title} onChange={(event) => updatePagePayloadMeta("title", event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>SEO Title</Label>
                      <Input value={pagePayload.seoTitle} onChange={(event) => updatePagePayloadMeta("seoTitle", event.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Homepage</Label>
                      <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                        <Switch checked={pagePayload.isHomepage} onCheckedChange={updatePagePayloadHomepage} />
                        <span className="text-sm text-muted-foreground">
                          {canUseHomepageSlug ? "Treat this page as the homepage." : "Homepage pages should use `/` as the slug."}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>SEO Description</Label>
                    <Textarea rows={3} value={pagePayload.seoDescription} onChange={(event) => updatePagePayloadMeta("seoDescription", event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Blocks</Label>
                      <Select onValueChange={(value) => addPagePayloadBlock(value)}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Add block" /></SelectTrigger>
                        <SelectContent>
                          {knownBlockTypes.map((blockType) => (
                            <SelectItem key={blockType} value={blockType}>{blockType}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      {pagePayload.blocks.map((block, index) => (
                        <div key={String(block.id ?? `${block.type}-${index}`)} className="grid gap-3 rounded-md border border-border px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{String(block.type ?? "unknown")}</p>
                              <p className="text-xs text-muted-foreground">Order {index + 1} • {block.isVisible === false ? "Hidden" : "Visible"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
                                <Switch
                                  checked={block.isVisible !== false}
                                  onCheckedChange={(checked) => updatePagePayloadBlock(index, { isVisible: checked })}
                                />
                                <span className="text-xs text-muted-foreground">Visible</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => movePagePayloadBlock(index, -1)} disabled={index === 0}>Up</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => movePagePayloadBlock(index, 1)} disabled={index === pagePayload.blocks.length - 1}>Down</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => removePagePayloadBlock(index)}>Remove</Button>
                              </div>
                            </div>
                          </div>

                          {block.type === "hero" ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Tagline</Label>
                                <Input value={String((block.props as any)?.tagline ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { tagline: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Anchor Id</Label>
                                <Input value={String((block.props as any)?.anchorId ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { anchorId: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Highlight</Label>
                                <Input value={String((block.props as any)?.highlight ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { highlight: event.target.value })} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Subtitle</Label>
                                <Textarea rows={3} value={String((block.props as any)?.subtitle ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { subtitle: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Primary CTA Text</Label>
                                <Input value={String((block.props as any)?.ctaText ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { ctaText: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Primary CTA Link</Label>
                                <Input value={String((block.props as any)?.ctaLink ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { ctaLink: event.target.value })} />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "featured-products" ? (
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="grid gap-2">
                                <Label>Tagline</Label>
                                <Input value={String((block.props as any)?.tagline ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { tagline: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Limit</Label>
                                <Input type="number" min={1} max={24} value={String((block.props as any)?.limit ?? 6)} onChange={(event) => updatePagePayloadBlockProps(index, { limit: Number(event.target.value || 6) })} />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "countdown" ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Title</Label>
                                <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Subtitle</Label>
                                <Textarea rows={3} value={String((block.props as any)?.subtitle ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { subtitle: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>End Date</Label>
                                <Input value={String((block.props as any)?.endDate ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { endDate: event.target.value })} placeholder="2026-12-31T23:59:59Z" />
                              </div>
                              <div className="grid gap-2">
                                <Label>Background Gradient</Label>
                                <Input value={String((block.props as any)?.bgGradient ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { bgGradient: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Text</Label>
                                <Input value={String((block.props as any)?.ctaText ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { ctaText: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Link</Label>
                                <Input value={String((block.props as any)?.ctaLink ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { ctaLink: event.target.value })} />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "promo-banner" ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Title</Label>
                                <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Subtitle</Label>
                                <Textarea rows={3} value={String((block.props as any)?.subtitle ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { subtitle: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Badge Text</Label>
                                <Input value={String((block.props as any)?.badgeText ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { badgeText: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Background Style</Label>
                                <Select value={String((block.props as any)?.bgStyle ?? "gradient")} onValueChange={(value) => updatePagePayloadBlockProps(index, { bgStyle: value })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="gradient">gradient</SelectItem>
                                    <SelectItem value="dark">dark</SelectItem>
                                    <SelectItem value="accent">accent</SelectItem>
                                    <SelectItem value="luxury-gold">luxury-gold</SelectItem>
                                    <SelectItem value="indigo">indigo</SelectItem>
                                    <SelectItem value="rose">rose</SelectItem>
                                    <SelectItem value="aurora">aurora</SelectItem>
                                    <SelectItem value="luxury-dark">luxury-dark</SelectItem>
                                    <SelectItem value="confetti">confetti</SelectItem>
                                    <SelectItem value="mesh-gradient">mesh-gradient</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Text</Label>
                                <Input value={String((block.props as any)?.ctaText ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { ctaText: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Link</Label>
                                <Input value={String((block.props as any)?.ctaLink ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { ctaLink: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Text Alignment</Label>
                                <Select value={String((block.props as any)?.textAlignment ?? "center")} onValueChange={(value) => updatePagePayloadBlockProps(index, { textAlignment: value })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="left">left</SelectItem>
                                    <SelectItem value="center">center</SelectItem>
                                    <SelectItem value="right">right</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Padding Size</Label>
                                <Select value={String((block.props as any)?.paddingSize ?? "cozy")} onValueChange={(value) => updatePagePayloadBlockProps(index, { paddingSize: value })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="compact">compact</SelectItem>
                                    <SelectItem value="cozy">cozy</SelectItem>
                                    <SelectItem value="large">large</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Card Opacity</Label>
                                <Input type="number" min={0} max={100} value={String((block.props as any)?.cardOpacity ?? 0)} onChange={(event) => updatePagePayloadBlockProps(index, { cardOpacity: Number(event.target.value || 0) })} />
                              </div>
                              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                                <Label>Glow</Label>
                                <Switch checked={Boolean((block.props as any)?.enableGlow)} onCheckedChange={(checked) => updatePagePayloadBlockProps(index, { enableGlow: checked })} />
                              </div>
                              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                                <Label>Particles</Label>
                                <Switch checked={(block.props as any)?.enableParticles !== false} onCheckedChange={(checked) => updatePagePayloadBlockProps(index, { enableParticles: checked })} />
                              </div>
                              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                                <Label>Orbs</Label>
                                <Switch checked={(block.props as any)?.enableOrbs !== false} onCheckedChange={(checked) => updatePagePayloadBlockProps(index, { enableOrbs: checked })} />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "category-showcase" ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Tagline</Label>
                                <Input value={String((block.props as any)?.tagline ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { tagline: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "rich-text" ? (
                            <div className="grid gap-3">
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="grid gap-2">
                                  <Label>Eyebrow</Label>
                                  <Input value={String((block.props as any)?.eyebrow ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { eyebrow: event.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Title</Label>
                                  <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label>Body</Label>
                                <Textarea rows={5} value={String((block.props as any)?.body ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { body: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Alignment</Label>
                                <Select value={String((block.props as any)?.align ?? "center")} onValueChange={(value) => updatePagePayloadBlockProps(index, { align: value })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="left">left</SelectItem>
                                    <SelectItem value="center">center</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : null}

                          {block.type === "recently-viewed" ? (
                            <div className="grid gap-2">
                              <Label>Section Title</Label>
                              <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                            </div>
                          ) : null}

                          {block.type === "social-feed" ? (
                            <div className="grid gap-3">
                              <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Subtitle</Label>
                                <Input value={String((block.props as any)?.subtitle ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { subtitle: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Image URLs</Label>
                                <Textarea
                                  rows={4}
                                  value={((block.props as any)?.images ?? []).join(", ")}
                                  onChange={(event) => updatePagePayloadBlockProps(index, {
                                    images: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                                  })}
                                  placeholder="https://..., https://..."
                                />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "video-reel" ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Title</Label>
                                <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Video URL</Label>
                                <Input value={String((block.props as any)?.videoUrl ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { videoUrl: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Text</Label>
                                <Input value={String((block.props as any)?.ctaText ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { ctaText: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Link</Label>
                                <Input value={String((block.props as any)?.ctaLink ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { ctaLink: event.target.value })} />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "faq-accordion" ? (
                            <div className="grid gap-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label>Title</Label>
                                  <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Subtitle</Label>
                                  <Input value={String((block.props as any)?.subtitle ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { subtitle: event.target.value })} />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label>FAQs JSON</Label>
                                <Textarea
                                  rows={6}
                                  value={JSON.stringify((block.props as any)?.faqs ?? [], null, 2)}
                                  onChange={(event) => {
                                    try {
                                      updatePagePayloadBlockProps(index, { faqs: JSON.parse(event.target.value) });
                                    } catch {}
                                  }}
                                />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "trust-badges" ? (
                            <div className="grid gap-3">
                              <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Badges JSON</Label>
                                <Textarea
                                  rows={6}
                                  value={JSON.stringify((block.props as any)?.badges ?? [], null, 2)}
                                  onChange={(event) => {
                                    try {
                                      updatePagePayloadBlockProps(index, { badges: JSON.parse(event.target.value) });
                                    } catch {}
                                  }}
                                />
                              </div>
                            </div>
                          ) : null}

                          {block.type === "testimonials" ? (
                            <div className="grid gap-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label>Title</Label>
                                  <Input value={String((block.props as any)?.title ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { title: event.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Subtitle</Label>
                                  <Input value={String((block.props as any)?.subtitle ?? "")} onChange={(event) => updatePagePayloadBlockProps(index, { subtitle: event.target.value })} />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label>Reviews JSON</Label>
                                <Textarea
                                  rows={6}
                                  value={JSON.stringify((block.props as any)?.reviews ?? [], null, 2)}
                                  onChange={(event) => {
                                    try {
                                      updatePagePayloadBlockProps(index, { reviews: JSON.parse(event.target.value) });
                                    } catch {}
                                  }}
                                />
                              </div>
                            </div>
                          ) : null}

                          {!["hero", "featured-products", "countdown", "promo-banner", "category-showcase", "rich-text", "recently-viewed", "social-feed", "video-reel", "faq-accordion", "trust-badges", "testimonials"].includes(String(block.type ?? "")) ? (
                            <div className="grid gap-2">
                              <Label>Props JSON</Label>
                              <Textarea
                                rows={5}
                                value={JSON.stringify((block.props as any) ?? {}, null, 2)}
                                onChange={(event) => {
                                  try {
                                    updatePagePayloadBlock(index, { props: JSON.parse(event.target.value) });
                                  } catch {}
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {pagePayload.blocks.length === 0 ? (
                        <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">No blocks yet. Add one from the menu above.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Textarea rows={16} value={String(form.page_payload ?? "")} onChange={(event) => updateField("page_payload", event.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={Boolean(form.is_active)} onCheckedChange={(checked) => updateField("is_active", checked)} />
                <Label>Active</Label>
              </div>
            </div>
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
