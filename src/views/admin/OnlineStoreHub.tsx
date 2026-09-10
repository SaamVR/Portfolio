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
  ChevronRight,
  Compass,
  ExternalLink,
  FileCode2,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  Rocket,
  Settings2,
  Shapes,
  ShieldCheck,
  Store as StoreIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CmsPagesManager from "./CmsPagesManager";
import BlogManager from "./BlogManager";
import MediaLibraryManager from "@/components/admin/MediaLibraryManager";
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

type HubTab = "overview" | "styles" | "templates" | "pages" | "blog" | "media";

const validTabs = new Set<HubTab>(["overview", "styles", "templates", "pages", "blog", "media"]);

const designTabs: Array<{ id: HubTab; label: string; icon: typeof Compass }> = [
  { id: "overview", label: "Overview", icon: Compass },
  { id: "styles", label: "Sections", icon: Shapes },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
];

const contentTabs: Array<{ id: HubTab; label: string; icon: typeof FileText }> = [
  { id: "pages", label: "Pages", icon: FileText },
  { id: "blog", label: "Blog", icon: FileCode2 },
  { id: "media", label: "Media", icon: ImageIcon },
];

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|\/)/i.test(value.trim());
}

function buildReadinessSnapshot(storeId: string, homepageBlocks: ReadinessBlockRow[]): ReadinessSnapshot {
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
      detail: "Add a clear opening section so shoppers immediately understand what this store offers.",
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
      issues.push({ id: "hero-title", title: "Hero headline is empty", detail: "Give the opening section a clear store promise.", href: stylesHref, actionLabel: "Edit hero" });
    }
    if ((hero.layout_variant === "full-bleed" || hero.layout_variant === "editorial") && !heroMedia) {
      issues.push({ id: "hero-media", title: "Hero media is missing", detail: "This hero style depends on an image or video to look complete.", href: stylesHref, actionLabel: "Add hero media" });
    }
    if ((heroCtaText && !heroCtaLink) || (!heroCtaText && heroCtaLink) || (heroCtaLink && !looksLikeUrl(heroCtaLink))) {
      issues.push({ id: "hero-cta", title: "Hero action is incomplete", detail: "The primary button needs both clear text and a valid destination.", href: stylesHref, actionLabel: "Fix hero action" });
    }
  }

  if (promo && !(typeof promo.props?.title === "string" && promo.props.title.trim())) {
    issues.push({ id: "promo-title", title: "Promo section needs a message", detail: "Tell shoppers exactly what the promotion is offering.", href: stylesHref, actionLabel: "Edit promo" });
  }
  if (socialFeed && (!Array.isArray(socialFeed.props?.images) || socialFeed.props.images.length === 0)) {
    issues.push({ id: "social-feed-empty", title: "Social feed has no images", detail: "Add real brand or social imagery, or hide this section until it is ready.", href: stylesHref, actionLabel: "Edit social feed" });
  }
  if (faq && (!Array.isArray(faq.props?.faqs) || faq.props.faqs.length === 0)) {
    issues.push({ id: "faq-empty", title: "FAQ section is empty", detail: "Answer common questions about delivery, payment, booking, returns, or support.", href: stylesHref, actionLabel: "Add FAQs" });
  }
  if (trust && (!Array.isArray(trust.props?.badges) || trust.props.badges.length === 0)) {
    issues.push({ id: "trust-empty", title: "Trust section needs signals", detail: "Add delivery, support, payment, authenticity, or service-confidence cues.", href: stylesHref, actionLabel: "Add trust signals" });
  }
  if (testimonials && (!Array.isArray(testimonials.props?.reviews) || testimonials.props.reviews.length === 0)) {
    issues.push({ id: "testimonials-empty", title: "Testimonials need real proof", detail: "Add real customer feedback or hide the section until proof is available.", href: stylesHref, actionLabel: "Edit testimonials" });
  }

  return {
    score: Math.max(0, 100 - issues.length * 14),
    issueCount: issues.length,
    issues,
    sectionCount: visibleBlocks.length,
  };
}

function MobileWorkspaceGroup({
  title,
  items,
  activeTab,
  onChange,
}: {
  title: string;
  items: Array<{ id: HubTab; label: string; icon: typeof Compass }>;
  activeTab: HubTab;
  onChange: (tab: HubTab) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${selected ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" : "border-border bg-card text-foreground hover:border-primary/30"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OnlineStoreHub() {
  const { activeStoreId, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: HubTab = requestedTab && validTabs.has(requestedTab as HubTab) ? requestedTab as HubTab : "overview";

  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const cmsEnabled = role === "admin" && getFeatureEnabled(entitlementData?.featureMap, "cms_pages", false);
  const advancedEditingEnabled = cmsEnabled && getFeatureEnabled(entitlementData?.featureMap, "advanced_page_builder", false);

  const { data: storeMeta } = useQuery({
    queryKey: ["online-store-hub-meta", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug, custom_domain, is_published")
        .eq("id", activeStoreId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeStoreId),
  });

  const { data: readiness } = useQuery({
    queryKey: ["online-store-hub-readiness", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null;
      const { data: homepagePage, error: pageError } = await supabase
        .from("store_pages")
        .select("id")
        .eq("store_id", activeStoreId)
        .eq("is_homepage", true)
        .maybeSingle();
      if (pageError) throw pageError;
      if (!homepagePage?.id) return buildReadinessSnapshot(activeStoreId, []);

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

  const storeUrl = storeMeta?.slug ? absoluteStoreUrl({ slug: storeMeta.slug, customDomain: storeMeta.custom_domain ?? null }, "/") : "#";

  const changeTab = (tab: HubTab) => {
    setSearchParams(activeStoreId ? { tab, storeId: activeStoreId } : { tab }, { replace: true });
  };

  if (!activeStoreId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Online Store</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a store before editing its storefront.</p>
        </div>
        <Card className="border-dashed border-border">
          <CardContent className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
            <StoreIcon className="h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">No active store selected</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Select a store from the dashboard store switcher, then return here to edit its storefront.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const templateWorkspaceHref = `/admin/templates?storeId=${encodeURIComponent(activeStoreId)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-bold text-foreground">Online Store</h1>
            {storeMeta ? (
              <Badge variant="outline" className={storeMeta.is_published ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" : "border-amber-500/20 bg-amber-500/10 text-amber-700"}>
                {storeMeta.is_published ? "Published" : "Draft"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Manage what shoppers see, starting with the homepage and then moving into sections, content, and media.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto">
          <Button asChild className="min-h-11 gap-2 lg:order-2">
            <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}><Palette className="h-4 w-4" />Edit homepage</Link>
          </Button>
          {storeMeta?.slug ? (
            <Button variant="outline" asChild className="min-h-11 gap-2 lg:order-1">
              <a href={storeUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />View store</a>
            </Button>
          ) : <span />}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => changeTab(value as HubTab)} className="space-y-6">
        <div className="space-y-4 sm:hidden">
          <div>
            <p className="text-sm font-semibold text-foreground">What do you want to manage?</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a clear workspace instead of swiping through a hidden tab row.</p>
          </div>
          <MobileWorkspaceGroup title="Design" items={designTabs} activeTab={activeTab} onChange={changeTab} />
          <MobileWorkspaceGroup title="Content" items={contentTabs} activeTab={activeTab} onChange={changeTab} />
        </div>

        <TabsList className="hidden h-auto w-full grid-cols-6 gap-1 border border-border bg-secondary/40 p-1 sm:grid">
          <TabsTrigger value="overview" className="min-h-11 gap-2"><Compass className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="styles" className="min-h-11 gap-2"><Shapes className="h-4 w-4" />Sections</TabsTrigger>
          <TabsTrigger value="templates" className="min-h-11 gap-2"><LayoutTemplate className="h-4 w-4" />Templates</TabsTrigger>
          <TabsTrigger value="pages" className="min-h-11 gap-2"><FileText className="h-4 w-4" />Pages</TabsTrigger>
          <TabsTrigger value="blog" className="min-h-11 gap-2"><FileCode2 className="h-4 w-4" />Blog</TabsTrigger>
          <TabsTrigger value="media" className="min-h-11 gap-2"><ImageIcon className="h-4 w-4" />Media</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <Card className="overflow-hidden border-border">
            <CardContent className="p-5 sm:p-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] xl:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Storefront control center</p>
                  <h2 className="mt-2 truncate font-heading text-xl font-bold text-foreground">{storeMeta?.name || "Your store"}</h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{storeMeta?.custom_domain ? `https://${storeMeta.custom_domain}` : storeUrl}</p>
                  <div className="mt-5 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-muted/20">
                    <div className="p-3 text-center"><p className="text-xs text-muted-foreground">Readiness</p><p className="mt-1 text-lg font-semibold text-foreground">{readiness?.score ?? 100}/100</p></div>
                    <div className="p-3 text-center"><p className="text-xs text-muted-foreground">Sections</p><p className="mt-1 text-lg font-semibold text-foreground">{readiness?.sectionCount ?? 0}</p></div>
                    <div className="min-w-0 p-3 text-center"><p className="text-xs text-muted-foreground">Address</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{storeMeta?.custom_domain ? "Custom" : "EZComo"}</p></div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <Button size="lg" asChild className="min-h-12 justify-between gap-2"><Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>Edit homepage <ChevronRight className="h-4 w-4" /></Link></Button>
                  <Button size="lg" variant="outline" onClick={() => changeTab("styles")} className="min-h-12 justify-between gap-2">Edit section styles <ChevronRight className="h-4 w-4" /></Button>
                  <Button size="lg" variant="outline" asChild className="min-h-12 justify-between gap-2 sm:col-span-2 xl:col-span-1"><Link to={buildSiteSettingsPath("navigation", activeStoreId)}>Header & navigation <ChevronRight className="h-4 w-4" /></Link></Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Storefront tools</CardTitle>
                <CardDescription>Go straight to the next thing you want shoppers to see differently.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-auto min-h-16 justify-start gap-3 p-4 text-left" asChild><Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}><Palette className="h-5 w-5 shrink-0 text-primary" /><span><span className="block font-semibold">Homepage layout</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Reorder and edit storefront sections</span></span></Link></Button>
                <Button variant="outline" className="h-auto min-h-16 justify-start gap-3 p-4 text-left" onClick={() => changeTab("styles")}><Shapes className="h-5 w-5 shrink-0 text-primary" /><span><span className="block font-semibold">Section styles</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Hero, promo, catalog and shared variants</span></span></Button>
                <Button variant="outline" className="h-auto min-h-16 justify-start gap-3 p-4 text-left" asChild><Link to={templateWorkspaceHref}><LayoutTemplate className="h-5 w-5 shrink-0 text-primary" /><span><span className="block font-semibold">Templates</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Preview and apply a storefront preset</span></span></Link></Button>
                <Button variant="outline" className="h-auto min-h-16 justify-start gap-3 p-4 text-left" asChild><Link to={buildSiteSettingsPath("navigation", activeStoreId)}><Settings2 className="h-5 w-5 shrink-0 text-primary" /><span><span className="block font-semibold">Header & navigation</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Menus, links and navigation behavior</span></span></Link></Button>
                <Button variant="outline" className="h-auto min-h-16 justify-start gap-3 p-4 text-left sm:col-span-2" asChild><Link to={`/admin/onboarding?storeId=${encodeURIComponent(activeStoreId)}`}><Rocket className="h-5 w-5 shrink-0 text-primary" /><span><span className="block font-semibold">Review store setup</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Revisit guided launch choices when you need them</span></span></Link></Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {readiness && readiness.issueCount === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  Storefront readiness
                </CardTitle>
                <CardDescription>{readiness?.issueCount ? `${readiness.issueCount} item${readiness.issueCount === 1 ? "" : "s"} need attention.` : "No major structural issues detected."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {readiness && readiness.issueCount > 0 ? readiness.issues.slice(0, 4).map((issue) => (
                  <div key={issue.id} className="rounded-xl border border-border bg-muted/10 p-3">
                    <p className="text-sm font-medium text-foreground">{issue.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{issue.detail}</p>
                    <Button variant="ghost" className="mt-2 min-h-11 w-full justify-between px-2" asChild><Link to={issue.href}>{issue.actionLabel} <ChevronRight className="h-4 w-4" /></Link></Button>
                  </div>
                )) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">The homepage structure looks healthy.</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-700/80 dark:text-emerald-300/80">Focus next on product content, imagery, copy, and conversion polish.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="styles" className="space-y-6"><StorefrontSectionStyleStudio /></TabsContent>
        <TabsContent value="templates" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><LayoutTemplate className="h-4 w-4 text-primary" />Template workspace</CardTitle>
              <CardDescription>Preview templates, then apply the selected layout into a real store draft before saving.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Button asChild className="min-h-11 gap-2"><Link to={templateWorkspaceHref}>Browse & apply templates <ChevronRight className="h-4 w-4" /></Link></Button>
              <Button variant="outline" asChild className="min-h-11 gap-2"><Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>Edit current homepage <Palette className="h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pages" className="space-y-4"><CmsPagesManager /></TabsContent>
        <TabsContent value="blog" className="space-y-4"><BlogManager /></TabsContent>
        <TabsContent value="media" className="space-y-4"><MediaLibraryManager /></TabsContent>
      </Tabs>

      {advancedEditingEnabled ? (
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Advanced theme code</CardTitle>
                  <CardDescription className="mt-0.5 text-xs">Expert-only raw template and code controls.</CardDescription>
                </div>
              </div>
              <Button variant="ghost" asChild className="min-h-11 justify-between gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Link to={buildPageBuilderPath("advanced", { storeId: activeStoreId })}>Open expert editor <ChevronRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}