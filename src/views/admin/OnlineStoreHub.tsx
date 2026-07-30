import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { buildPageBuilderPath } from "@/lib/admin-paths";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { Link, useSearchParams } from "@/lib/react-router-dom-shim";

import {
  Palette,
  LayoutTemplate,
  FileText,
  FileCode2,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CmsPagesManager from "./CmsPagesManager";
import BlogManager from "./BlogManager";
import MediaLibraryManager from "@/components/admin/MediaLibraryManager";
import { TemplateGallery } from "./TemplateGallery";
import { Badge } from "@/components/ui/badge";

export default function OnlineStoreHub() {
  const { activeStoreId, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "design";

  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const cmsEnabled = role === "admin" && getFeatureEnabled(entitlementData?.featureMap, "cms_pages", false);
  const advancedEditingEnabled = cmsEnabled && getFeatureEnabled(entitlementData?.featureMap, "advanced_page_builder", false);

  const { data: storeMeta } = useQuery({
    queryKey: ["online-store-hub-meta", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug, custom_domain")
        .eq("id", activeStoreId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeStoreId),
  });

  const storeUrl = storeMeta?.slug
    ? absoluteStoreUrl({ slug: storeMeta.slug, customDomain: storeMeta.custom_domain ?? null }, "/")
    : "#";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Online Store Hub</h1>
          <p className="text-sm text-muted-foreground">
            Customize your visual storefront design, select themes & templates, manage custom pages, blog posts, and store media.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {storeMeta?.slug && (
            <Button variant="outline" asChild className="gap-2">
              <a href={storeUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                View Storefront
              </a>
            </Button>
          )}
          <Button asChild className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
            <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>
              <Palette className="h-4 w-4" />
              Customize Design
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Tabbed Hub */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })}
        className="space-y-6"
      >
        <TabsList className="bg-secondary/40 p-1 border border-border flex flex-wrap gap-1">
          <TabsTrigger value="design" className="gap-2">
            <Palette className="h-4 w-4" />
            Customize Design
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Themes & Templates
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2">
            <FileText className="h-4 w-4" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="blog" className="gap-2">
            <FileCode2 className="h-4 w-4" />
            Blog
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Media Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-6">
          {/* Live Store Overview Banner */}
          <Card className="border-border bg-gradient-to-r from-primary/5 via-card to-card overflow-hidden">
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-3 md:items-center">
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Storefront Active
                    </Badge>
                  </div>
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    {storeMeta?.name || "Your Merchant Store"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {storeMeta?.custom_domain ? `Custom domain: https://${storeMeta.custom_domain}` : `Subdomain URL: ${storeUrl}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button size="lg" asChild className="gap-2 shadow-lg shadow-primary/20">
                    <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>
                      <Palette className="h-4 w-4" />
                      Open Drag & Drop Builder
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Design Action Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border hover:border-primary/50 transition-all">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Visual Block Builder
                </CardTitle>
                <CardDescription>
                  Drag, drop, reorder homepage banners, product carousels, and promotional sections visually.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-between" asChild>
                  <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>
                    Launch Editor <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-all">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-primary" /> Storefront Blueprint
                </CardTitle>
                <CardDescription>
                  Switch between preset business templates tailored for clothing, electronics, or single-product stores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-between" onClick={() => setSearchParams({ tab: "templates" }, { replace: true })}>
                  Browse Templates <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-all">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Custom Pages & Legal
                </CardTitle>
                <CardDescription>
                  Add About Us, Contact, Return Policy, Terms of Service, and custom landing pages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-between" onClick={() => setSearchParams({ tab: "pages" }, { replace: true })}>
                  Manage Pages <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplateGallery />
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <CmsPagesManager />
        </TabsContent>

        <TabsContent value="blog" className="space-y-4">
          <BlogManager />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <MediaLibraryManager />
        </TabsContent>
      </Tabs>

      {/* Advanced / Developer Accordion for Expert Editing */}
      {advancedEditingEnabled && (
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold text-foreground">Advanced Theme Code & Raw Templates</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Link to={buildPageBuilderPath("advanced", { storeId: activeStoreId })}>
                  Open Expert Code Editor <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
