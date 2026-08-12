import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { buildPageBuilderPath, buildSiteSettingsPath } from "@/lib/admin-paths";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { Link, useSearchParams } from "@/lib/react-router-dom-shim";

import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Palette,
  LayoutTemplate,
  FileText,
  FileCode2,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Rocket,
  Shapes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CmsPagesManager from "./CmsPagesManager";
import BlogManager from "./BlogManager";
import MediaLibraryManager from "@/components/admin/MediaLibraryManager";
import { TemplateGallery } from "./TemplateGallery";
import { Badge } from "@/components/ui/badge";
import { StorefrontSectionStyleStudio } from "@/components/admin/StorefrontSectionStyleStudio";
import type { StorePageBlock } from "@/lib/cms/schema";

type ReadinessIssue = {
  id: string;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
};

type ReadinessSnapshot = {
  score: number;
  issueCount: number;
  issues: ReadinessIssue[];
  sectionCount: number;
};

type ReadinessBlockRow = {
  block_type: StorePageBlock["type"];
  props: Record<string, unknown> | null;
  layout_variant: string | null;
  is_visible: boolean | null;
};

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|\/)/i.test(value.trim());
}

function buildReadinessSnapshot(
  storeId: string,
  homepageBlocks: ReadinessBlockRow[],
): ReadinessSnapshot {
  const issues: ReadinessIssue[] = [];
  const stylesHref = `/admin/online-store?tab=styles&storeId=${encodeURIComponent(storeId)}`;
  const pageBuilderHref = buildPageBuilderPath("basic", { storeId });

  const visibleBlocks = homepageBlocks.filter((block) => block.is_visible !== false);
  const hero = visibleBlocks.find((block) => block.block_type === "hero");
  const promo = visibleBlocks.find((block) => block.block_type === "promo-banner");
  const socialFeed = visibleBlocks.find((block) => block.block_type === "social-feed");
  const faq = visibleBlocks.find((block) => block.block_type === "faq-accordion");
  const trust = visibleBlocks.find((block) => block.block_type === "trust-badges");
  const testimonials = visibleBlocks.find((block) => block.block_type === "testimonials");

  if (!hero) {
    issues.push({
      id: "hero-missing",
      title: "Homepage hero is missing",
      detail: "The storefront should start with a clear opening section that tells shoppers what this store offers.",
      href: pageBuilderHref,
      actionLabel: "Open page builder",
    });
  } else {
    const heroProps = hero.props ?? {};
    const heroTitle = typeof heroProps.title === "string" ? heroProps.title.trim() : "";
    const heroCtaText = typeof heroProps.ctaText === "string" ? heroProps.ctaText.trim() : "";
    const heroCtaLink = typeof heroProps.ctaLink === "string" ? heroProps.ctaLink.trim() : "";
    const heroMedia = typeof heroProps.mediaUrl === "string" ? heroProps.mediaUrl.trim() : "";

    if (!heroTitle) {
      issues.push({
        id: "hero-title",
        title: "Hero headline needs work",
        detail: "The first section should clearly explain the store promise instead of feeling empty or generic.",
        href: stylesHref,
        actionLabel: "Edit hero style",
      });
    }
    if ((hero.layout_variant === "full-bleed" || hero.layout_variant === "editorial") && !heroMedia) {
      issues.push({
        id: "hero-media",
        title: "Hero style needs media",
        detail: "This hero style depends on a strong image or video to feel complete.",
        href: stylesHref,
        actionLabel: "Add hero media",
      });
    }
    if ((heroCtaText && !heroCtaLink) || (!heroCtaText && heroCtaLink) || (heroCtaLink && !looksLikeUrl(heroCtaLink))) {
      issues.push({
        id: "hero-cta",
        title: "Hero action is incomplete",
        detail: "The primary button should have both clear text and a valid destination.",
        href: stylesHref,
        actionLabel: "Fix hero action",
      });
    }
  }

  if (promo) {
    const promoTitle = typeof promo.props?.title === "string" ? promo.props.title.trim() : "";
    if (!promoTitle) {
      issues.push({
        id: "promo-title",
        title: "Promo section lacks a message",
        detail: "Promotional space should say exactly what the offer is instead of sitting as empty decoration.",
        href: stylesHref,
        actionLabel: "Edit promo section",
      });
    }
  }

  if (socialFeed) {
    const images = Array.isArray(socialFeed.props?.images) ? socialFeed.props.images : [];
    if (images.length === 0) {
      issues.push({
        id: "social-feed-empty",
        title: "Social feed has no images",
        detail: "If this section stays on the homepage, it should show real visual proof instead of blank placeholders.",
        href: stylesHref,
        actionLabel: "Add feed images",
      });
    }
  }

  if (faq) {
    const faqs = Array.isArray(faq.props?.faqs) ? faq.props.faqs : [];
    if (faqs.length === 0) {
      issues.push({
        id: "faq-empty",
        title: "FAQ section is empty",
        detail: "This section works best when it answers real purchase blockers like delivery, payment, or returns.",
        href: stylesHref,
        actionLabel: "Add FAQs",
      });
    }
  }

  if (trust) {
    const badges = Array.isArray(trust.props?.badges) ? trust.props.badges : [];
    if (badges.length === 0) {
      issues.push({
        id: "trust-empty",
        title: "Trust section needs signals",
        detail: "Merchants should show delivery, support, payment, or authenticity cues if this section is visible.",
        href: stylesHref,
        actionLabel: "Add trust badges",
      });
    }
  }

  if (testimonials) {
    const reviews = Array.isArray(testimonials.props?.reviews) ? testimonials.props.reviews : [];
    if (reviews.length === 0) {
      issues.push({
        id: "testimonials-empty",
        title: "Testimonials need real proof",
        detail: "If this section is on, it should contain believable customer proof instead of an empty shell.",
        href: stylesHref,
        actionLabel: "Add testimonials",
      });
    }
  }

  return {
    score: Math.max(0, 100 - issues.length * 14),
    issueCount: issues.length,
    issues,
    sectionCount: visibleBlocks.length,
  };
}

export default function OnlineStoreHub() {
  const { activeStoreId, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

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

  const { data: readiness } = useQuery({
    queryKey: ["online-store-hub-readiness", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null;

      const { data: homepagePage } = await supabase
        .from("store_pages")
        .select("id")
        .eq("store_id", activeStoreId)
        .eq("is_homepage", true)
        .maybeSingle();

      if (!homepagePage?.id) {
        return buildReadinessSnapshot(activeStoreId, []);
      }

      const { data: blocks, error } = await supabase
        .from("store_page_blocks")
        .select("block_type, props, layout_variant, is_visible")
        .eq("store_id", activeStoreId)
        .eq("page_id", homepagePage.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return buildReadinessSnapshot(activeStoreId, (blocks ?? []) as ReadinessBlockRow[]);
    },
    enabled: Boolean(activeStoreId),
  });

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
          <Button variant="outline" asChild className="gap-2">
            <Link to={activeStoreId ? `/admin/onboarding?storeId=${encodeURIComponent(activeStoreId)}` : "/admin/onboarding"}>
              <Rocket className="h-4 w-4" />
              Open Onboarding
            </Link>
          </Button>
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
          <TabsTrigger value="overview" className="gap-2">
            <Compass className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="styles" className="gap-2">
            <Shapes className="h-4 w-4" />
            Section Styles
          </TabsTrigger>
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

        <TabsContent value="overview" className="space-y-6">
          {/* Live Store Overview Banner */}
          <Card className="border-border bg-gradient-to-r from-primary/5 via-card to-card overflow-hidden">
            <CardContent className="p-6">
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Storefront Active
                    </Badge>
                  </div>
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    {storeMeta?.name || "Your Merchant Store"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {storeMeta?.custom_domain ? `Custom domain: https://${storeMeta.custom_domain}` : `Subdomain URL: ${storeUrl}`}
                  </p>
                  <div className="grid gap-3 pt-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Launch guidance</p>
                      <p className="mt-1 text-sm font-medium text-foreground">Keep onboarding editable</p>
                      <p className="mt-1 text-xs text-muted-foreground">Let merchants revisit launch choices without digging through scattered settings.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Homepage flow</p>
                      <p className="mt-1 text-sm font-medium text-foreground">Refine section order and tone</p>
                      <p className="mt-1 text-xs text-muted-foreground">Hero and main catalog stay steady. Optional sections should be intentional.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Global reuse</p>
                      <p className="mt-1 text-sm font-medium text-foreground">Swap shared block styles</p>
                      <p className="mt-1 text-xs text-muted-foreground">Use global hero, promo, and catalog section variants across templates.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button size="lg" asChild className="gap-2 shadow-lg shadow-primary/20">
                    <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>
                      <Palette className="h-4 w-4" />
                      Open Drag & Drop Builder
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => setSearchParams({ tab: "styles" }, { replace: true })} className="gap-2">
                    <Shapes className="h-4 w-4" />
                    Open Section Styles
                  </Button>
                  <Button variant="outline" size="lg" asChild className="gap-2">
                    <Link to={buildSiteSettingsPath("navigation", activeStoreId)}>
                      <LayoutTemplate className="h-4 w-4" />
                      Open Header Settings
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Recommended next work</CardTitle>
                <CardDescription>
                  Use this as the merchant-friendly sequence so the storefront gets stronger without making the admin feel fragmented.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-primary" />
                      Onboarding and launch
                    </CardTitle>
                    <CardDescription>Reopen the guided launch flow and keep homepage extra sections easy to manage later.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full justify-between" asChild>
                      <Link to={activeStoreId ? `/admin/onboarding?storeId=${encodeURIComponent(activeStoreId)}` : "/admin/onboarding"}>
                        Continue onboarding <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shapes className="h-4 w-4 text-primary" />
                      Global section styles
                    </CardTitle>
                    <CardDescription>Swap hero, promo, category, and featured product styles from the shared block system.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full justify-between" onClick={() => setSearchParams({ tab: "styles" }, { replace: true })}>
                      Open style studio <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Pages and structure
                    </CardTitle>
                    <CardDescription>Adjust homepage composition, legal pages, and long-form sections from the main builder.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full justify-between" asChild>
                      <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>
                        Open page builder <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4 text-primary" />
                      Templates and support content
                    </CardTitle>
                    <CardDescription>Switch presets, add custom pages, and keep media and blog content aligned with the storefront.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      <Button variant="outline" className="justify-between" onClick={() => setSearchParams({ tab: "templates" }, { replace: true })}>
                        Browse templates <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="justify-between" onClick={() => setSearchParams({ tab: "pages" }, { replace: true })}>
                        Manage pages <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {readiness && readiness.issueCount === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  Storefront readiness
                </CardTitle>
                <CardDescription>
                  This keeps the merchant focused on what is still incomplete instead of guessing where the weak spots are.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Readiness score</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{readiness?.score ?? 100}/100</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {readiness?.sectionCount ?? 0} homepage sections active
                    {readiness && readiness.issueCount > 0 ? ` · ${readiness.issueCount} items need attention` : " · no major issues detected"}
                  </p>
                </div>
                {readiness && readiness.issueCount > 0 ? (
                  <div className="space-y-3">
                    {readiness.issues.slice(0, 4).map((issue) => (
                      <div key={issue.id} className="rounded-xl border border-border bg-background/80 p-3">
                        <p className="text-sm font-medium text-foreground">{issue.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
                        <Button variant="outline" size="sm" className="mt-3 w-full justify-between" asChild>
                          <Link to={issue.href}>
                            {issue.actionLabel} <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700">
                    The homepage looks structurally healthy from here. Next refinements are more about polish and conversion quality than missing basics.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="styles" className="space-y-6">
          <StorefrontSectionStyleStudio />
        </TabsContent>

        <TabsContent value="design" className="space-y-6">
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
                  <LayoutTemplate className="h-4 w-4 text-primary" /> Storefront Template
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
