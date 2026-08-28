"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Globe,
  LayoutTemplate,
  Loader2,
  Search,
  Star,
  Wand2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Store } from "@/lib/cms/schema";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import { StorefrontPreviewFrame } from "@/components/storefront/StorefrontPreviewFrame";
import { toast } from "sonner";
import { fetchMarketplaceTemplate, type ThemeExportBundle } from "@/lib/cms/theme-export-import";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { defaultStore } from "@/lib/cms/default-store";
import { useAuth } from "@/hooks/auth-context";
import { isPlatformRole } from "@/lib/platform/rbac";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
  storefrontTemplateOptions,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";
import {
  createBuiltInBundle,
  createBuiltInCardBundle,
  getCommunityPreviewAsset,
  personalizePreviewPages,
  type TemplatePreviewViewport,
} from "@/lib/cms/template-gallery-preview";

const CATEGORIES = [
  "All",
  ...Array.from(
    new Set(
      storefrontTemplateOptions.map((option) => getStorefrontTemplateSeedDefinition(option.value).group),
    ),
  ),
];

const TEMPLATES_PER_PAGE = 8;

type PreviewState = {
  kind: "built-in" | "community";
  id: string;
  name: string;
  category: string;
  bundle: ThemeExportBundle;
  mobileReady?: boolean;
  previewAssets?: string[];
};

type BuiltInTemplateItem = {
  id: StorefrontTemplateId;
  name: string;
  description: string;
  category: string;
  aesthetic: string;
  mobileReady: boolean;
  capabilities: string[];
  catalogMode: string;
  referenceImage: string;
  onboardingMode: "template" | "blank";
  businessFamily: string;
  defaultBlockCount: number;
  compatibleBlockCount: number;
};

function formatOnboardingMode(mode: "template" | "blank") {
  return mode === "blank" ? "Blank builder" : "Guided template";
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ");
}

function TemplatePreviewCanvas({
  bundle,
  viewport,
  maxBlocks = 2,
  className,
}: {
  bundle: ThemeExportBundle;
  viewport: TemplatePreviewViewport;
  maxBlocks?: number;
  className?: string;
}) {
  const previewBlocks = bundle.pages?.[0]?.blocks.slice(0, maxBlocks) ?? [];
  const canvasClass = viewport === "mobile"
    ? "w-[420px] scale-[0.34]"
    : viewport === "tablet"
      ? "w-[860px] scale-[0.22]"
      : "w-[1280px] scale-[0.20]";

  if (previewBlocks.length === 0) {
    return (
      <div className={cn("flex h-full w-full flex-col items-center justify-center bg-muted/30 text-center", className)}>
        <LayoutTemplate className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-xs font-medium text-foreground">Theme-ready preview</p>
        <p className="mt-1 max-w-[200px] text-[11px] text-muted-foreground">
          This template focuses on theme styling and can be applied to your current layout.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-background pointer-events-none select-none", className)}>
      <StoreThemeScope theme={bundle.theme}>
        <div className={cn("origin-top-left bg-background", canvasClass)}>
          {previewBlocks.map((block) => (
            <StorefrontBlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </StoreThemeScope>
    </div>
  );
}

export function TemplateGallery({
  store = defaultStore,
  applyThemeBundle,
}: {
  store?: Store;
  applyThemeBundle?: (bundle: ThemeExportBundle) => boolean | void | Promise<boolean | void>;
}) {
  const [activeTab, setActiveTab] = useState<"built-in" | "community">("built-in");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [previewWithData, setPreviewWithData] = useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [previewViewport, setPreviewViewport] = useState<TemplatePreviewViewport>("desktop");
  const [moderatingTemplateId, setModeratingTemplateId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { platformRole } = useAuth();
  const canApplyTemplate = typeof applyThemeBundle === "function";

  const builtInTemplates = useMemo<BuiltInTemplateItem[]>(
    () => storefrontTemplateOptions.map((option) => {
      const templateDefinition = getStorefrontTemplateDefinition(option.value);
      const seedDefinition = getStorefrontTemplateSeedDefinition(option.value);
      return {
        id: option.value,
        name: option.label,
        description: option.description,
        category: seedDefinition.group,
        aesthetic: seedDefinition.defaultTheme.aesthetic || "template",
        mobileReady: true,
        capabilities: seedDefinition.capabilities,
        catalogMode: seedDefinition.catalogMode,
        referenceImage: getStorefrontTemplateReferenceImage(option.value),
        onboardingMode: seedDefinition.onboardingMode,
        businessFamily: seedDefinition.businessFamily,
        defaultBlockCount: seedDefinition.defaultBlockSet.length,
        compatibleBlockCount: templateDefinition.compatibleBlockSet.length,
      };
    }),
    [],
  );

  const { data: communityTemplates = [], isLoading: isLoadingCommunity } = useQuery({
    queryKey: ["community-templates", platformRole],
    queryFn: async () => {
      let query = supabase
        .from("cms_marketplace_templates")
        .select("id, title, description, cover_image, preview_asset_urls, category, price, pricing_mode, created_at, creator_id, status, install_count, rating_avg, rating_count, tags, best_for, aesthetic, mobile_ready, safety_status, safety_findings, rejection_reason")
        .order("created_at", { ascending: false });

      if (!isPlatformRole(platformRole)) {
        query = query.eq("status", "published");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredBuiltIn = useMemo(() => builtInTemplates.filter((template) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = template.name.toLowerCase().includes(query)
      || template.description.toLowerCase().includes(query);
    const matchesCategory = activeCategory === "All" || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  }), [activeCategory, builtInTemplates, searchQuery]);

  const filteredCommunity = useMemo(() => communityTemplates.filter((template: any) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = template.title.toLowerCase().includes(query)
      || Boolean(template.description?.toLowerCase().includes(query));
    const category = template.category || "commerce";
    const matchesCategory = activeCategory === "All" || category === activeCategory;
    return matchesSearch && matchesCategory;
  }), [activeCategory, communityTemplates, searchQuery]);

  const displayItems = activeTab === "built-in" ? filteredBuiltIn : filteredCommunity;
  const totalPages = Math.max(1, Math.ceil(displayItems.length / TEMPLATES_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * TEMPLATES_PER_PAGE;
    return displayItems.slice(start, start + TEMPLATES_PER_PAGE);
  }, [displayItems, safePage]);

  const handlePreviewBuiltIn = (templateId: StorefrontTemplateId) => {
    const selectedTemplate = builtInTemplates.find((template) => template.id === templateId);
    if (!selectedTemplate) return;
    setPreviewState({
      kind: "built-in",
      id: templateId,
      name: selectedTemplate.name,
      category: selectedTemplate.category,
      bundle: createBuiltInBundle(templateId, store),
      mobileReady: true,
      previewAssets: [selectedTemplate.referenceImage],
    });
  };

  const handleApplyBuiltIn = async (templateId: StorefrontTemplateId) => {
    if (!applyThemeBundle) return false;
    try {
      setApplyingTemplateId(templateId);
      const selectedTemplate = builtInTemplates.find((template) => template.id === templateId);
      const applied = await applyThemeBundle(createBuiltInBundle(templateId, store));
      if (applied === false) return false;
      toast.success(`${selectedTemplate?.name ?? "Template"} loaded into the draft.`);
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to apply template. Please try again.");
      return false;
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handlePreviewCommunity = async (item: any) => {
    try {
      setApplyingTemplateId(item.id);
      const result = await fetchMarketplaceTemplate(supabase, item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPreviewState({
        kind: "community",
        id: item.id,
        name: item.title,
        category: item.category || "commerce",
        bundle: {
          ...result.bundle,
          theme: store.theme,
          pages: result.bundle.pages ? personalizePreviewPages(result.bundle.pages, store) : result.bundle.pages,
        },
        mobileReady: item.mobile_ready !== false,
        previewAssets: Array.isArray(item.preview_asset_urls)
          ? item.preview_asset_urls.filter(Boolean)
          : (item.cover_image ? [item.cover_image] : []),
      });
    } catch {
      toast.error("Failed to preview template from marketplace.");
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handleApplyCommunity = async (templateId: string) => {
    if (!applyThemeBundle) return false;
    try {
      setApplyingTemplateId(templateId);
      const result = await fetchMarketplaceTemplate(supabase, templateId);
      if (!result.success) {
        toast.error(result.error);
        return false;
      }
      const applied = await applyThemeBundle(result.bundle);
      if (applied === false) return false;
      const { data: userData } = await supabase.auth.getUser();
      const { error: installError } = await supabase
        .from("cms_marketplace_template_installs" as any)
        .insert({
          template_id: templateId,
          store_id: store.id,
          installed_by: userData.user?.id ?? null,
        });
      if (installError) throw installError;
      toast.success("Marketplace template loaded into the draft.");
      return true;
    } catch {
      toast.error("Failed to download template from marketplace.");
      return false;
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handleModerateTemplate = async (templateId: string, status: "published" | "rejected") => {
    try {
      const template = communityTemplates.find((item: any) => item.id === templateId) as any;
      if (status === "published" && template?.safety_status !== "passed") {
        toast.error("Template cannot be approved until automated safety checks pass.");
        return;
      }
      setModeratingTemplateId(templateId);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("cms_marketplace_templates")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userData.user?.id ?? null,
          rejection_reason: status === "rejected" ? "Rejected during marketplace review." : null,
        } as any)
        .eq("id", templateId);
      if (error) throw error;
      toast.success(status === "published" ? "Template published." : "Template rejected.");
    } catch (error: any) {
      toast.error(error.message || "Failed to moderate template.");
    } finally {
      setModeratingTemplateId(null);
    }
  };

  const previewPages = previewState?.bundle.pages ?? [];
  const previewBlocks = previewPages[0]?.blocks ?? [];
  const previewAssetFallback = previewState?.kind === "community"
    ? getCommunityPreviewAsset(
        {
          preview_asset_urls: previewState.previewAssets ?? [],
          cover_image: previewState.previewAssets?.[0] ?? null,
        },
        previewViewport,
      )
    : "";
  const isLoading = activeTab === "community" && isLoadingCommunity;

  return (
    <div className="flex h-full flex-col bg-background" data-testid="template-gallery">
      <div className="flex-none border-b bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
              <LayoutTemplate className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              Template Gallery
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Preview storefront structures first. Applying a template loads it into this store's draft so you can review before saving.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value as "built-in" | "community");
                setActiveCategory("All");
                setPage(1);
              }}
              className="w-full sm:w-[300px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="built-in"><LayoutTemplate className="mr-2 h-4 w-4" />Built-In</TabsTrigger>
                <TabsTrigger value="community" data-testid="template-gallery-community-tab"><Globe className="mr-2 h-4 w-4" />Community</TabsTrigger>
              </TabsList>
            </Tabs>

            {activeTab === "built-in" ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-secondary/40 px-3 py-2 sm:justify-start">
                <div className="min-w-0">
                  <Label htmlFor="preview-data" className="flex cursor-pointer items-center gap-1.5 text-sm font-medium">
                    <Wand2 className="h-3.5 w-3.5 text-primary" />
                    Use store data
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Show your current store in card previews.</p>
                </div>
                <Switch id="preview-data" checked={previewWithData} onCheckedChange={setPreviewWithData} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates..."
              className="pl-8"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-2">
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  type="button"
                  size="sm"
                  variant={activeCategory === category ? "default" : "secondary"}
                  className="rounded-full"
                  onClick={() => {
                    setActiveCategory(category);
                    setPage(1);
                  }}
                >
                  {category}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <h3 className="font-medium">Loading community templates...</h3>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <LayoutTemplate className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-medium">No templates found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:gap-5">
              {paginatedItems.map((item: any) => {
                const isBuiltIn = activeTab === "built-in";
                const id = item.id as string;
                const builtInId = id as StorefrontTemplateId;
                const name = isBuiltIn ? item.name : item.title;
                const description = isBuiltIn ? item.description : item.description;
                const category = isBuiltIn ? item.category : (item.category || "commerce");
                const status = isBuiltIn ? "published" : item.status ?? "draft";
                const mobileReady = isBuiltIn ? item.mobileReady : item.mobile_ready !== false;
                const isPremium = !isBuiltIn && item.pricing_mode === "premium";
                const builtInCardBundle = isBuiltIn
                  ? (previewWithData ? createBuiltInBundle(builtInId, store) : createBuiltInCardBundle(builtInId, store))
                  : null;
                const communityPreviewAsset = !isBuiltIn ? getCommunityPreviewAsset(item, "desktop") : "";
                const ratingCount = !isBuiltIn ? Number(item.rating_count ?? 0) : 0;
                const installCount = !isBuiltIn ? Number(item.install_count ?? 0) : 0;

                return (
                  <article
                    key={id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-shadow hover:shadow-md"
                    data-testid={`template-card-${id}`}
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {isBuiltIn && previewWithData && builtInCardBundle ? (
                        <TemplatePreviewCanvas bundle={builtInCardBundle} viewport="desktop" />
                      ) : isBuiltIn && item.referenceImage ? (
                        <img src={item.referenceImage} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                      ) : communityPreviewAsset ? (
                        <img src={communityPreviewAsset} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-5 text-center">
                          <LayoutTemplate className="h-8 w-8 text-primary/60" />
                          <p className="mt-3 text-sm font-semibold">Preview asset coming soon</p>
                          <p className="mt-1 text-xs text-muted-foreground">Open the live preview to inspect the layout.</p>
                        </div>
                      )}

                      <Badge className="absolute left-3 top-3 max-w-[60%] truncate bg-background/85 text-foreground backdrop-blur-md hover:bg-background/90">
                        {category}
                      </Badge>
                      <div className="absolute right-3 top-3 flex max-w-[45%] flex-wrap justify-end gap-1.5">
                        {isPremium ? <Badge className="bg-amber-500 text-white">${item.price}</Badge> : null}
                        <Badge className={mobileReady ? "bg-primary/90 text-primary-foreground" : "bg-background/85 text-foreground"}>
                          {mobileReady ? "Mobile ready" : "Desktop first"}
                        </Badge>
                      </div>
                      {!isBuiltIn && isPlatformRole(platformRole) && status !== "published" ? (
                        <Badge variant="secondary" className="absolute bottom-3 left-3 capitalize">{formatLabel(String(status))}</Badge>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <div>
                        <h3 className="line-clamp-1 text-lg font-semibold">{name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                          {description || "Storefront template ready to preview."}
                        </p>
                      </div>

                      {isBuiltIn ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{formatOnboardingMode(item.onboardingMode)}</span>
                            {" · "}{item.defaultBlockCount} starter sections{" · "}{formatLabel(item.businessFamily)}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="font-normal capitalize">{formatLabel(item.catalogMode)}</Badge>
                            {item.capabilities.slice(0, 2).map((capability: string) => (
                              <Badge key={capability} variant="outline" className="font-normal capitalize">{formatLabel(capability)}</Badge>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{item.compatibleBlockCount} compatible section types</p>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {(item.best_for ?? []).slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>
                            ))}
                          </div>
                          {(ratingCount > 0 || installCount > 0) ? (
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              {ratingCount > 0 ? (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  <span className="font-medium text-foreground">{Number(item.rating_avg ?? 0).toFixed(1)}</span>
                                  <span>({ratingCount})</span>
                                </span>
                              ) : null}
                              {installCount > 0 ? (
                                <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" />{installCount.toLocaleString()} installs</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className={cn("mt-auto grid gap-2 pt-4", canApplyTemplate ? "grid-cols-2" : "grid-cols-1")}>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          data-testid={`template-preview-${id}`}
                          onClick={() => isBuiltIn ? handlePreviewBuiltIn(builtInId) : void handlePreviewCommunity(item)}
                          disabled={applyingTemplateId === id}
                        >
                          <Eye className="h-4 w-4" />Preview
                        </Button>
                        {canApplyTemplate ? (
                          <Button
                            type="button"
                            className="gap-2"
                            data-testid={`template-apply-${id}`}
                            onClick={() => isBuiltIn ? void handleApplyBuiltIn(builtInId) : void handleApplyCommunity(id)}
                            disabled={applyingTemplateId === id}
                          >
                            {applyingTemplateId === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
                            Apply
                          </Button>
                        ) : null}
                      </div>

                      {!canApplyTemplate ? (
                        <p className="mt-2 text-center text-[11px] text-muted-foreground">Choose a store to enable template application.</p>
                      ) : null}

                      {!isBuiltIn && isPlatformRole(platformRole) && status === "in_review" ? (
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                          <Button
                            type="button"
                            size="sm"
                            data-testid={`template-approve-${id}`}
                            onClick={() => void handleModerateTemplate(id, "published")}
                            disabled={moderatingTemplateId === id || item.safety_status !== "passed"}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            data-testid={`template-reject-${id}`}
                            onClick={() => void handleModerateTemplate(id, "rejected")}
                            disabled={moderatingTemplateId === id}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            {displayItems.length > TEMPLATES_PER_PAGE ? (
              <div className="flex flex-col items-center justify-between gap-4 border-t pt-5 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{(safePage - 1) * TEMPLATES_PER_PAGE + 1}</span>–<span className="font-semibold text-foreground">{Math.min(safePage * TEMPLATES_PER_PAGE, displayItems.length)}</span> of <span className="font-semibold text-foreground">{displayItems.length}</span> templates
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="gap-1">
                    <ChevronLeft className="h-3.5 w-3.5" />Previous
                  </Button>
                  <span className="px-2 text-xs font-semibold">{safePage} / {totalPages}</span>
                  <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="gap-1">
                    Next<ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={Boolean(previewState)} onOpenChange={(open) => !open && setPreviewState(null)}>
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  {previewState?.name ?? "Template Preview"}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Previewed as {store.name} with storefront content and responsive viewport controls.
                </p>
                {previewState ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{previewState.category}</Badge>
                    <Badge variant="outline">{previewPages.length} page{previewPages.length === 1 ? "" : "s"}</Badge>
                    <Badge variant="outline">{previewState.mobileReady === false ? "Desktop first" : "Mobile ready"}</Badge>
                    {previewState.kind === "built-in" ? (
                      <Badge variant="outline">
                        {formatOnboardingMode(builtInTemplates.find((template) => template.id === previewState.id)?.onboardingMode ?? "template")}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {canApplyTemplate ? (
                <Button
                  type="button"
                  onClick={async () => {
                    if (!previewState) return;
                    const applied = previewState.kind === "built-in"
                      ? await handleApplyBuiltIn(previewState.id as StorefrontTemplateId)
                      : await handleApplyCommunity(previewState.id);
                    if (applied) setPreviewState(null);
                  }}
                  disabled={Boolean(previewState && applyingTemplateId === previewState.id)}
                  className="gap-2"
                >
                  {previewState && applyingTemplateId === previewState.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
                  Apply Template
                </Button>
              ) : (
                <Badge variant="outline" className="w-fit">Preview only</Badge>
              )}
            </div>
          </DialogHeader>

          <div className="overflow-y-auto bg-muted/30 p-3 sm:p-4">
            <StorefrontPreviewFrame
              viewport={previewViewport}
              onViewportChange={(value) => setPreviewViewport(value as TemplatePreviewViewport)}
              showToolbar
              title={`${previewState?.name ?? "Template"} preview`}
            >
              {previewBlocks.length > 0 && previewState ? (
                <StoreThemeScope theme={previewState.bundle.theme}>
                  <div className="min-h-[620px] bg-background">
                    {previewBlocks.map((block) => <StorefrontBlockRenderer key={block.id} block={block} />)}
                  </div>
                </StoreThemeScope>
              ) : previewAssetFallback ? (
                <div className="flex min-h-[420px] items-center justify-center bg-muted/20 p-6">
                  <img src={previewAssetFallback} alt={`${previewState?.name ?? "Template"} preview`} className="max-h-[70vh] w-full rounded-lg object-contain" />
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
                  <LayoutTemplate className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">This template has no page layout preview.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Theme-only templates can still be applied to the current layout.</p>
                </div>
              )}
            </StorefrontPreviewFrame>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
