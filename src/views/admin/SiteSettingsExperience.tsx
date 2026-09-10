"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Compass,
  CreditCard,
  LifeBuoy,
  Menu,
  MessageCircle,
  Palette,
  PanelsTopLeft,
  Search,
  Settings2,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import SiteSettingsCore from "@/views/admin/SiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Link, useSearchParams } from "@/lib/react-router-dom-shim";
import { buildPageBuilderPath } from "@/lib/admin-paths";
import {
  getAvailableSettingsTabs,
  type SettingsTabOption,
  type SettingsTabValue,
} from "@/lib/cms/site-settings-tabs";
import { resolveStorefrontTemplateSeed } from "@/lib/cms/storefront-template-seeds";
import {
  getStorefrontTemplateDefinition,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const essentialTabs: SettingsTabValue[] = [
  "brand_seo",
  "navigation",
  "themes",
  "payment",
  "delivery",
  "support",
  "contact",
];

const tabPresentation: Partial<Record<SettingsTabValue, { description: string; icon: typeof Settings2 }>> = {
  brand_seo: { description: "Name, logo and search presence", icon: Store },
  navigation: { description: "Header, menus and shopper shortcuts", icon: Menu },
  themes: { description: "Colors, typography and visual style", icon: Palette },
  payment: { description: "Payment methods and checkout setup", icon: CreditCard },
  delivery: { description: "Shipping fees and delivery rules", icon: Truck },
  support: { description: "WhatsApp and shopper help", icon: LifeBuoy },
  contact: { description: "Contact details and inquiry flow", icon: MessageCircle },
  notifications: { description: "Order alerts and customer updates", icon: Bell },
  analytics: { description: "Pixels and measurement connections", icon: Compass },
  domain: { description: "Connect the store to your web address", icon: Store },
  page_builder: { description: "Pages, blocks and storefront structure", icon: PanelsTopLeft },
};

const categoryCopy: Record<string, { title: string; description: string }> = {
  "Store Identity": { title: "Brand & navigation", description: "How shoppers recognize and move around your store." },
  "Design System": { title: "Look & feel", description: "Visual choices shared across the storefront." },
  Storefront: { title: "Pages & storefront", description: "Shop pages, homepage sections and editing tools." },
  "Checkout & Log": { title: "Selling & checkout", description: "Payment, delivery, loyalty and conversion tools." },
  Information: { title: "Support & communication", description: "Contact, FAQ, notifications and customer confidence." },
  Growth: { title: "Tracking & growth", description: "Measurement tools for understanding shopper activity." },
  "Legacy Fallbacks": { title: "Advanced compatibility", description: "Older fallback fields kept for existing storefronts." },
};

function tabMeta(tab: SettingsTabOption) {
  return tabPresentation[tab.value] ?? {
    description: tab.category === "Legacy Fallbacks" ? "Compatibility setting for older storefront content" : `Manage ${tab.label.toLowerCase()}`,
    icon: Settings2,
  };
}

export default function SiteSettingsExperience() {
  const { activeStoreId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [directoryOpen, setDirectoryOpen] = useState(false);

  const { data: settings = {} } = useQuery({
    queryKey: ["site-settings-experience-settings", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return {} as Record<string, any>;
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .eq("store_id", activeStoreId);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, any>;
    },
    enabled: Boolean(activeStoreId),
    staleTime: 300_000,
  });

  const templateId = (
    settings.storefront_profile?.template_id
    ?? settings.storefront_template?.template_id
    ?? "fashion"
  ) as StorefrontTemplateId;
  const templateSeed = useMemo(() => resolveStorefrontTemplateSeed(templateId), [templateId]);
  const templateDefinition = useMemo(() => getStorefrontTemplateDefinition(templateId), [templateId]);
  const availableTabs = useMemo(
    () => getAvailableSettingsTabs({
      businessFamily: templateSeed.businessFamily,
      catalogMode: templateSeed.catalogMode,
      templateId,
    }),
    [templateId, templateSeed.businessFamily, templateSeed.catalogMode],
  );

  const requestedTab = searchParams.get("tab") as SettingsTabValue | null;
  const activeTab: SettingsTabValue = requestedTab && availableTabs.some((tab) => tab.value === requestedTab)
    ? requestedTab
    : (availableTabs[0]?.value ?? "brand_seo");
  const activeDefinition = availableTabs.find((tab) => tab.value === activeTab);
  const essentials = essentialTabs
    .map((value) => availableTabs.find((tab) => tab.value === value))
    .filter(Boolean) as SettingsTabOption[];
  const normalizedSearch = search.trim().toLowerCase();
  const visibleTabs = normalizedSearch
    ? availableTabs.filter((tab) => `${tab.label} ${tab.category} ${tab.keywords}`.toLowerCase().includes(normalizedSearch))
    : availableTabs;
  const groups = Array.from(
    visibleTabs.reduce((map, tab) => {
      const existing = map.get(tab.category) ?? [];
      existing.push(tab);
      map.set(tab.category, existing);
      return map;
    }, new Map<string, SettingsTabOption[]>()),
  );
  const showDirectory = directoryOpen || Boolean(normalizedSearch);
  const pageBuilderPath = buildPageBuilderPath("basic", { storeId: activeStoreId ?? undefined });

  const chooseTab = (value: SettingsTabValue) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("tab", value);
      return next;
    });
    setSearch("");
    setDirectoryOpen(false);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.setTimeout(() => document.getElementById("settings-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Store setup
                </span>
                <span>{templateDefinition.label ?? templateId} template</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Site Settings</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Start with the essentials, then open deeper settings only when you need them.
              </p>
            </div>
            <Link to={pageBuilderPath} className="shrink-0">
              <Button className="min-h-11 w-full gap-2 sm:w-auto">
                <PanelsTopLeft className="h-4 w-4" /> Open page editor
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardHeader className="space-y-3 border-b border-border/60 bg-muted/20 p-4">
              <div>
                <CardTitle className="text-base">Where do you want to make changes?</CardTitle>
                <CardDescription className="mt-1">Choose a common job or search every setting.</CardDescription>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search settings…"
                  className="min-h-11 pl-9"
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {!normalizedSearch ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Essentials</p>
                    <span className="text-[11px] text-muted-foreground">Most used</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                    {essentials.map((tab) => {
                      const meta = tabMeta(tab);
                      const Icon = meta.icon;
                      const selected = activeTab === tab.value;
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => chooseTab(tab.value)}
                          className={cn(
                            "group min-h-[72px] rounded-2xl border p-3 text-left motion-safe:transition-all motion-safe:duration-200",
                            "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5",
                            selected ? "border-primary/50 bg-primary/10 shadow-sm" : "border-border/70 bg-background",
                          )}
                          aria-current={selected ? "page" : undefined}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className={cn("rounded-xl p-2", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary")}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-foreground">{tab.label}</span>
                              <span className="mt-1 hidden text-xs leading-4 text-muted-foreground sm:block lg:block">{meta.description}</span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setDirectoryOpen((value) => !value)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-3.5 py-3 text-left hover:border-primary/30 hover:bg-muted/30 lg:hidden"
                aria-expanded={showDirectory}
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">{normalizedSearch ? `Search results (${visibleTabs.length})` : "Browse all settings"}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Advanced, growth and compatibility settings</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 motion-safe:transition-transform", showDirectory && "rotate-180")} />
              </button>

              <div className={cn("space-y-3", !showDirectory && "hidden lg:block")}>
                {visibleTabs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No settings match “{search}”. Try a broader term such as payment, menu, domain or notification.
                  </div>
                ) : groups.map(([category, tabs]) => {
                  const copy = categoryCopy[category] ?? { title: category, description: "Related storefront settings." };
                  const legacy = category === "Legacy Fallbacks";
                  return (
                    <div key={category} className={cn("rounded-2xl border p-3", legacy ? "border-dashed border-border/60 bg-muted/15" : "border-border/60 bg-background/60")}>
                      <div className="mb-2.5">
                        <p className={cn("text-sm font-semibold", legacy ? "text-muted-foreground" : "text-foreground")}>{copy.title}</p>
                        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{copy.description}</p>
                      </div>
                      <div className="space-y-1.5">
                        {tabs.map((tab) => {
                          const selected = activeTab === tab.value;
                          return (
                            <button
                              key={tab.value}
                              type="button"
                              onClick={() => chooseTab(tab.value)}
                              className={cn(
                                "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm motion-safe:transition-colors",
                                selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                              )}
                              aria-current={selected ? "page" : undefined}
                            >
                              <span className="font-medium">{tab.label}</span>
                              <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-primary-foreground" : "text-muted-foreground")} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        <main id="settings-workspace" className="min-w-0 scroll-mt-20">
          <div className="mb-3 flex items-center gap-2 px-1 text-xs text-muted-foreground lg:hidden">
            <Settings2 className="h-3.5 w-3.5" />
            <span>Editing</span>
            <span className="font-semibold text-foreground">{activeDefinition?.label ?? "Site settings"}</span>
          </div>
          <div className="site-settings-core-shell">
            <SiteSettingsCore />
          </div>
        </main>
      </div>

      <style>{`
        .site-settings-core-shell > div {
          max-width: none !important;
          padding: 0 !important;
          gap: 0 !important;
        }
        .site-settings-core-shell > div > div:first-child {
          display: none !important;
        }
        .site-settings-core-shell > div > div:nth-child(2) {
          display: block !important;
        }
        .site-settings-core-shell > div > div:nth-child(2) > aside {
          display: none !important;
        }
        .site-settings-core-shell > div > div:nth-child(2) > div:last-child {
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}
