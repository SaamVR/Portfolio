"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Navigate } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Boxes, Edit3, Layers3, LayoutTemplate, Loader2, Palette, Plus, Save, Share2 } from "lucide-react";
import { reservedCmsSlugs } from "@/lib/cms/block-library";
import { PageBlueprintEditorForm } from "@/components/admin/cms-library/PageBlueprintEditorForm";
import { BlockRegistryEditorForm } from "@/components/admin/cms-library/BlockRegistryEditorForm";
import { BlueprintEditorForm } from "@/components/admin/cms-library/BlueprintEditorForm";
import { ThemeEditorForm } from "@/components/admin/cms-library/ThemeEditorForm";
import { useCmsLibraryEditor } from "@/components/admin/cms-library/useCmsLibraryEditor";
import { useCmsLibraryManagerData } from "@/components/admin/cms-library/useCmsLibraryManagerData";
import { buildSaveDialogRequest, getActiveDialogTitle } from "@/components/admin/cms-library/mutations";
import {
  blockLayerOptions,
  businessFamilyOptions,
  buildKnownBlockOptions,
  buildKnownBlockTypes,
  buildKnownCapabilities,
  buildKnownPageBlueprintIds,
  catalogModeOptions,
  checkoutModeOptions,
  legacyTemplateOptions,
  onboardingStepOptions,
  prepaymentDiscountTypeOptions,
  productVisibilityOptions,
  themeModeOptions,
  themeSourceTypeOptions,
} from "@/components/admin/cms-library/shared";

export default function CmsLibraryManager() {
  const { platformRole, user } = useAuth();
  const [activeTab, setActiveTab] = useState("blueprints");
  const {
    dialogState,
    form,
    setDialogState,
    updateField,
    toggleStringArrayField,
    updateDelimitedStringArrayField,
    updateHeroField,
    updateDefaultThemeField,
    onboardingSteps,
    updateOnboardingStep,
    addOnboardingStep,
    removeOnboardingStep,
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
    selectedRecommendedPages,
    selectedRecommendedBlocks,
    selectedCapabilities,
    selectedCatalogModes,
    selectedCompatibleBusinessFamilies,
    heroPayload,
    defaultThemePayload,
    defaultSiteSettingsPayload,
    themeEditorPayload,
    updateThemePreviewField,
    updateThemeTypographyField,
    updateThemeBorderRadius,
    updateDefaultSiteSettingsSection,
  } = useCmsLibraryEditor();
  const {
    savingId,
    search,
    setSearch,
    data,
    filteredData,
    isLoading,
    updateRow,
    insertRow,
    promoteTheme,
  } = useCmsLibraryManagerData(user?.id);

  if (platformRole !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  const saveDialog = async () => {
    if (!dialogState) return;

    try {
      const request = buildSaveDialogRequest(dialogState, form, {
        blockRegistry: data?.blocks ?? [],
      });

      if (request.isCreate) {
        const created = await insertRow(request.table, request.payload, request.idValue);
        if (created) setDialogState(null);
        return;
      }

      await updateRow(request.table, request.idColumn, request.idValue, request.payload);
      setDialogState(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save library item.");
    }
  };

  const blueprintCards = filteredData?.blueprints ?? [];
  const themeCards = filteredData?.themes ?? [];
  const pageCards = filteredData?.pages ?? [];
  const blockCards = filteredData?.blocks ?? [];
  const activeDialogTitle = getActiveDialogTitle(dialogState);
  const slugIsReserved = pagePayload.slug !== "/" && reservedCmsSlugs.has(pagePayload.slug);
  const livePageBlueprintIds = buildKnownPageBlueprintIds(data?.pages ?? []);
  const liveBlockTypes = buildKnownBlockTypes(data?.blocks ?? []);
  const liveBlockOptions = buildKnownBlockOptions(data?.blocks ?? []);
  const liveCapabilities = buildKnownCapabilities(data);

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
          {isLoading && blueprintCards.length === 0 ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : blueprintCards.map((item) => (
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
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => openCreateDialog("theme")}>
              <Plus className="h-4 w-4" />
              New Theme Package
            </Button>
          </div>
          {isLoading && themeCards.length === 0 ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : themeCards.map((item) => (
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
                    className="mr-2 gap-2"
                    onClick={() => openEditDialog({ mode: "edit", type: "theme", item })}
                    disabled={item.source_type === "merchant_private"}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
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
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(checked) => void updateRow("theme_packages", "id", item.id, { is_active: checked })}
                    disabled={savingId === `theme_packages:${item.id}` || item.source_type === "merchant_private"}
                    className="ml-3"
                  />
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
          {isLoading && pageCards.length === 0 ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : pageCards.map((item) => (
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
          {isLoading && blockCards.length === 0 ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : blockCards.map((item) => (
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
            <BlueprintEditorForm
              form={form}
              isEditing={dialogState.mode === "edit"}
              businessFamilyOptions={businessFamilyOptions}
              catalogModeOptions={catalogModeOptions}
              legacyTemplateOptions={legacyTemplateOptions}
              onboardingStepOptions={onboardingStepOptions}
              knownPageBlueprintIds={livePageBlueprintIds}
              knownBlockTypes={liveBlockTypes}
              knownCapabilities={liveCapabilities}
              selectedRecommendedPages={selectedRecommendedPages}
              selectedRecommendedBlocks={selectedRecommendedBlocks}
              selectedCapabilities={selectedCapabilities}
              heroPayload={heroPayload}
              defaultThemePayload={defaultThemePayload}
              defaultSiteSettingsPayload={defaultSiteSettingsPayload}
              onboardingSteps={onboardingSteps}
              productVisibilityOptions={productVisibilityOptions}
              checkoutModeOptions={checkoutModeOptions}
              prepaymentDiscountTypeOptions={prepaymentDiscountTypeOptions}
              onUpdateField={updateField}
              onUpdateDelimitedStringArrayField={updateDelimitedStringArrayField}
              onToggleStringArrayField={toggleStringArrayField}
              onUpdateHeroField={updateHeroField}
              onUpdateDefaultThemeField={updateDefaultThemeField}
              onUpdateDefaultSiteSettingsSection={updateDefaultSiteSettingsSection}
              onUpdateOnboardingStep={updateOnboardingStep}
              onAddOnboardingStep={addOnboardingStep}
              onRemoveOnboardingStep={removeOnboardingStep}
            />
          ) : null}

          {dialogState?.type === "page" ? (
            <PageBlueprintEditorForm
              form={form}
              isEditing={dialogState.mode === "edit"}
              businessFamilyOptions={businessFamilyOptions}
              catalogModeOptions={catalogModeOptions}
              knownBlockTypes={liveBlockTypes}
              knownBlockOptions={liveBlockOptions}
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

          {dialogState?.type === "theme" ? (
            <ThemeEditorForm
              form={form}
              isEditing={dialogState.mode === "edit"}
              themeSourceTypeOptions={themeSourceTypeOptions}
              themeModeOptions={themeModeOptions}
              themeEditorPayload={themeEditorPayload}
              onUpdateField={updateField}
              onUpdateThemePreviewField={updateThemePreviewField}
              onUpdateThemeTypographyField={updateThemeTypographyField}
              onUpdateThemeBorderRadius={updateThemeBorderRadius}
            />
          ) : null}

          {dialogState?.type === "block" ? (
            <BlockRegistryEditorForm
              form={form}
              isEditing={dialogState.mode === "edit"}
              blockLayerOptions={blockLayerOptions}
              businessFamilyOptions={businessFamilyOptions}
              knownCapabilities={liveCapabilities}
              selectedCompatibleBusinessFamilies={selectedCompatibleBusinessFamilies}
              selectedCapabilities={selectedCapabilities}
              onUpdateField={updateField}
              onUpdateDelimitedStringArrayField={updateDelimitedStringArrayField}
              onToggleStringArrayField={toggleStringArrayField}
            />
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
