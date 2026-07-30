"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, LayoutTemplate, Star, Download, Wand2, Loader2, Globe, Monitor, Smartphone, Tablet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loadPageBlueprints } from "@/lib/cms/page-blueprints";
import type { CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import type { Store, StorePage } from "@/lib/cms/schema";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { fetchMarketplaceTemplate, type ThemeExportBundle } from "@/lib/cms/theme-export-import";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { defaultStore } from "@/lib/cms/default-store";
import { useAuth } from "@/hooks/auth-context";
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

const CATEGORIES = ["All", ...Array.from(new Set(storefrontTemplateOptions.map((option) => getStorefrontTemplateSeedDefinition(option.value).group)))];

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
};

function getTemplateCategory(templateId: StorefrontTemplateId): string {
  return getStorefrontTemplateSeedDefinition(templateId).group;
}

function getPreviewWidthClass(viewport: TemplatePreviewViewport) {
  if (viewport === "mobile") return "max-w-[390px]";
  if (viewport === "tablet") return "max-w-[760px]";
  return "max-w-5xl";
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
    <div className={cn("absolute inset-0 overflow-hidden bg-background", className)}>
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
  applyThemeBundle
}: { 
  store?: Store;
  applyThemeBundle?: (bundle: ThemeExportBundle) => boolean | void;
}) {
  const [activeTab, setActiveTab] = useState<"built-in" | "community">("built-in");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [previewWithData, setPreviewWithData] = useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [previewViewport, setPreviewViewport] = useState<TemplatePreviewViewport>("desktop");
  const [moderatingTemplateId, setModeratingTemplateId] = useState<string | null>(null);
  const { platformRole } = useAuth();
  const builtInTemplates = useMemo<BuiltInTemplateItem[]>(
    () =>
      storefrontTemplateOptions.map((option) => {
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
        };
      }),
    [],
  );

  const { data: blueprints = [], isLoading: isLoadingBlueprints } = useQuery({
    queryKey: ["page-blueprints"],
    queryFn: async () => {
      return loadPageBlueprints(supabase);
    }
  });

  const { data: communityTemplates = [], isLoading: isLoadingCommunity } = useQuery({
    queryKey: ["community-templates", platformRole],
    queryFn: async () => {
      let query = supabase
        .from("cms_marketplace_templates")
        .select("id, title, description, cover_image, preview_asset_urls, category, price, pricing_mode, created_at, creator_id, status, install_count, rating_avg, rating_count, tags, best_for, aesthetic, mobile_ready, safety_status, safety_findings, rejection_reason")
        .order("created_at", { ascending: false });

      if (platformRole !== "admin") {
        query = query.eq("status", "published");
      }

      const { data, error } = await query;
        
      if (error) throw error;
      return data || [];
    }
  });

  const filteredBuiltIn = useMemo(() => {
    return builtInTemplates.filter((tpl) => {
      const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase())
        || tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      const category = tpl.category;
      const matchesCategory = activeCategory === "All" || category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, builtInTemplates, searchQuery]);

  const filteredCommunity = useMemo(() => {
    return communityTemplates.filter((tpl: any) => {
      const matchesSearch = tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (tpl.description && tpl.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const category = tpl.category || "commerce";
      const matchesCategory = activeCategory === "All" || category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [communityTemplates, searchQuery, activeCategory]);

  const handlePreviewBuiltIn = (templateId: string) => {
    const selectedTemplate = builtInTemplates.find((template) => template.id === templateId);
    if (!selectedTemplate) return;
        setPreviewState({
          kind: "built-in",
          id: templateId,
          name: selectedTemplate.name,
          category: selectedTemplate.category,
          bundle: createBuiltInBundle(templateId, blueprints, store),
          mobileReady: true,
          previewAssets: [selectedTemplate.referenceImage],
        });
  };

  const handleApplyBuiltIn = async (templateId: string) => {
    if (!applyThemeBundle) {
      toast.error("Template application logic is missing.");
      return;
    }
    try {
      setApplyingTemplateId(templateId);
      const selectedTemplate = builtInTemplates.find((template) => template.id === templateId);
      const bundle = createBuiltInBundle(templateId, blueprints, store);
      const applied = applyThemeBundle(bundle);
      if (applied === false) return;
      toast.success(`${selectedTemplate?.name ?? "Template"} loaded into the draft.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to apply template. Please try again.");
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handlePreviewCommunity = async (item: any) => {
    try {
      setApplyingTemplateId(item.id);
      const res = await fetchMarketplaceTemplate(supabase, item.id);
      if (res.success) {
        setPreviewState({
          kind: "community",
          id: item.id,
          name: item.title,
          category: item.category || "commerce",
          bundle: {
            ...res.bundle,
            theme: store.theme,
            pages: res.bundle.pages ? personalizePreviewPages(res.bundle.pages, store) : res.bundle.pages,
          },
          mobileReady: item.mobile_ready !== false,
          previewAssets: Array.isArray(item.preview_asset_urls) ? item.preview_asset_urls.filter(Boolean) : (item.cover_image ? [item.cover_image] : []),
        });
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to preview template from marketplace.");
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handleApplyCommunity = async (templateId: string) => {
    if (!applyThemeBundle) {
      toast.error("Theme application logic is missing.");
      return;
    }
    try {
      setApplyingTemplateId(templateId);
      const res = await fetchMarketplaceTemplate(supabase, templateId);
      if (res.success) {
        const applied = applyThemeBundle(res.bundle);
        if (applied === false) return;
        const { error: installError } = await supabase.from("cms_marketplace_template_installs" as any).insert({
          template_id: templateId,
          store_id: store.id,
          installed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        });
        if (installError) throw installError;
        toast.success("Marketplace template loaded into the draft.");
      } else {
        toast.error(res.error);
      }
    } catch (e: any) {
      toast.error("Failed to download template from marketplace.");
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

  const isLoading = activeTab === "built-in" ? isLoadingBlueprints : isLoadingCommunity;
  const displayItems = activeTab === "built-in" ? filteredBuiltIn : filteredCommunity;
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

  return (
    <div className="flex flex-col h-full bg-background" data-testid="template-gallery">
      {/* Header */}
      <div className="flex-none p-6 border-b bg-card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutTemplate className="h-6 w-6 text-primary" />
              Template Gallery
            </h1>
            <p className="text-muted-foreground mt-1">
              Browse and apply high-converting designs for your storefront.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto items-start sm:items-center gap-4">
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-[300px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="built-in"><LayoutTemplate className="mr-2 h-4 w-4" /> Built-In</TabsTrigger>
                <TabsTrigger value="community" data-testid="template-gallery-community-tab"><Globe className="mr-2 h-4 w-4" /> Community</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center space-x-2 bg-secondary/50 p-2 rounded-lg border">
              <Switch 
                id="preview-data" 
                checked={previewWithData}
                onCheckedChange={setPreviewWithData}
              />
              <Label htmlFor="preview-data" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
                Live Preview
              </Label>
            </div>
          </div>
        </div>
        
        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search templates..." 
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ScrollArea className="w-full pb-2 whitespace-nowrap">
            <div className="flex space-x-2">
              {CATEGORIES.map(category => (
                <Button
                  key={category}
                  variant={activeCategory === category ? "default" : "secondary"}
                  className="rounded-full"
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
            <h3 className="text-lg font-medium">Loading templates...</h3>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayItems.map((item: any) => {
              const isBuiltIn = activeTab === "built-in";
              const id = item.id;
              const name = isBuiltIn ? item.name : item.title;
              const category = isBuiltIn ? item.category : (item.category || "commerce");
              const rating = isBuiltIn ? "4.8" : (item.rating_avg ? Number(item.rating_avg).toFixed(1) : "New");
              const downloads = isBuiltIn ? (id.length * 123) + 400 : Number(item.install_count ?? 0);
              const isPremium = !isBuiltIn && item.pricing_mode === "premium";
              const status = isBuiltIn ? "published" : item.status ?? "draft";
              const mobileReady = isBuiltIn ? item.mobileReady : item.mobile_ready !== false;
              const aesthetic = isBuiltIn ? item.aesthetic : (item.aesthetic || "custom");
              const builtInCardBundle = isBuiltIn
                ? (previewWithData ? createBuiltInBundle(id, blueprints, store) : createBuiltInCardBundle(id, blueprints, store))
                : null;
              const communityPreviewAsset = !isBuiltIn ? getCommunityPreviewAsset(item, "desktop") : "";

              return (
              <div key={id} className="group flex flex-col rounded-xl border bg-card text-card-foreground overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50" data-testid={`template-card-${id}`}>
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {isBuiltIn && previewWithData && builtInCardBundle ? (
                    <TemplatePreviewCanvas bundle={builtInCardBundle} viewport="desktop" />
                  ) : isBuiltIn && item.referenceImage ? (
                    <img
                      src={item.referenceImage}
                      alt={name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : communityPreviewAsset ? (
                    <img 
                      src={communityPreviewAsset} 
                      alt={name} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-background p-5 text-center">
                      <LayoutTemplate className="h-8 w-8 text-primary/60" />
                      <p className="mt-3 text-sm font-semibold text-foreground">Preview asset coming soon</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Open the template preview to inspect the live layout before applying it.
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-4">
                     <Button
                       variant="secondary"
                       className="w-full gap-2"
                       data-testid={`template-preview-${id}`}
                       onClick={() => isBuiltIn ? handlePreviewBuiltIn(id) : handlePreviewCommunity(item)}
                       disabled={applyingTemplateId === id}
                     >
                       Preview <Eye className="h-4 w-4" />
                     </Button>
                     <Button 
                        className="w-full gap-2" 
                        data-testid={`template-apply-${id}`}
                        onClick={() => isBuiltIn ? handleApplyBuiltIn(id) : handleApplyCommunity(id)} 
                        disabled={applyingTemplateId === id}
                     >
                       {applyingTemplateId === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" />}
                       Apply
                     </Button>
                  </div>
                    <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-md text-foreground hover:bg-background/90 capitalize">
                    {category}
                  </Badge>
                  <div className="absolute right-3 top-3 flex gap-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-md capitalize text-foreground">
                      {String(aesthetic).replace("-", " ")}
                    </Badge>
                    <Badge className={mobileReady ? "bg-primary/90 text-primary-foreground" : "bg-background/80 text-foreground"}>
                      {mobileReady ? "mobile ready" : "desktop first"}
                    </Badge>
                  </div>
                  {!isBuiltIn && (
                    <Badge variant={status === "published" ? "default" : "secondary"} className="absolute bottom-3 left-3 capitalize">
                      {String(status).replace("_", " ")}
                    </Badge>
                  )}
                  {isPremium && (
                    <Badge className="absolute top-3 right-3 bg-amber-500 text-white hover:bg-amber-600">
                      ${item.price}
                    </Badge>
                  )}
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="rounded bg-secondary px-2 py-1 capitalize">{category}</span>
                    <span className="rounded bg-secondary px-2 py-1 capitalize">{String(aesthetic).replace("-", " ")}</span>
                    <span className={mobileReady ? "rounded bg-primary/10 px-2 py-1 text-primary" : "rounded bg-secondary px-2 py-1"}>
                      {mobileReady ? "mobile" : "desktop"}
                    </span>
                  </div>
                  
                  {isBuiltIn && item.capabilities && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {item.catalogMode.replace('_', ' ')}
                      </span>
                      {item.capabilities.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  {!isBuiltIn && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{item.description}</p>
                  )}
                  {!isBuiltIn && (
                    <div className="mb-4 flex flex-wrap gap-1">
                      {(item.best_for ?? []).slice(0, 3).map((tag: string) => (
                        <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-secondary-foreground">
                          {tag}
                        </span>
                      ))}
                      {mobileReady ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                          mobile ready
                        </span>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-foreground">{rating}</span>
                      {!isBuiltIn && item.rating_count ? <span>({item.rating_count})</span> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>{downloads.toLocaleString()}</span>
                    </div>
                  </div>
                  {!isBuiltIn && platformRole === "admin" && status === "in_review" ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" size="sm" data-testid={`template-approve-${id}`} onClick={() => handleModerateTemplate(id, "published")} disabled={moderatingTemplateId === id || item.safety_status !== "passed"}>
                        Approve
                      </Button>
                      <Button type="button" size="sm" variant="outline" data-testid={`template-reject-${id}`} onClick={() => handleModerateTemplate(id, "rejected")} disabled={moderatingTemplateId === id}>
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      <Dialog open={Boolean(previewState)} onOpenChange={(open) => !open && setPreviewState(null)}>
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  {previewState?.name ?? "Template Preview"}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Previewed as {store.name} with your current theme and sample storefront content.
                </p>
                {previewState ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="capitalize">{previewState.category}</Badge>
                    <Badge variant="outline">{previewPages.length} page{previewPages.length === 1 ? "" : "s"}</Badge>
                    <Badge variant="outline">{previewState.mobileReady === false ? "Desktop first" : "Mobile ready"}</Badge>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-border p-1">
                  {[
                    { id: "desktop", label: "Desktop", icon: Monitor },
                    { id: "tablet", label: "Tablet", icon: Tablet },
                    { id: "mobile", label: "Mobile", icon: Smartphone },
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.id}
                        type="button"
                        size="sm"
                        variant={previewViewport === option.id ? "secondary" : "ghost"}
                        className="gap-2"
                        onClick={() => setPreviewViewport(option.id as TemplatePreviewViewport)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{option.label}</span>
                      </Button>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!previewState) return;
                    if (previewState.kind === "built-in") {
                      void handleApplyBuiltIn(previewState.id);
                    } else {
                      void handleApplyCommunity(previewState.id);
                    }
                    setPreviewState(null);
                  }}
                  disabled={Boolean(previewState && applyingTemplateId === previewState.id)}
                  className="gap-2"
                >
                  {previewState && applyingTemplateId === previewState.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LayoutTemplate className="h-4 w-4" />
                  )}
                  Apply Template
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto bg-muted/30 p-4">
            <div className={cn("mx-auto overflow-hidden rounded-xl border bg-background shadow-sm transition-all", getPreviewWidthClass(previewViewport))}>
              {previewBlocks.length > 0 && previewState ? (
                <StoreThemeScope theme={previewState.bundle.theme}>
                  <div className="min-h-[620px] bg-background">
                    {previewBlocks.map((block) => (
                      <StorefrontBlockRenderer key={block.id} block={block} />
                    ))}
                  </div>
                </StoreThemeScope>
              ) : previewAssetFallback ? (
                <div className="flex min-h-[420px] items-center justify-center bg-muted/20 p-6">
                  <img
                    src={previewAssetFallback}
                    alt={`${previewState?.name ?? "Template"} preview`}
                    className="max-h-[70vh] w-full rounded-lg object-contain"
                  />
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
                  <LayoutTemplate className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium text-foreground">This template has no page layout preview.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Theme-only templates can still be applied to your current layout.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
