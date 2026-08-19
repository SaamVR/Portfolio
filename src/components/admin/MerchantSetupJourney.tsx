"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Circle,
  LayoutTemplate,
  ListChecks,
  Package,
  Palette,
  Rocket,
  Settings2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { useStoreHealth, useStorePageStats, useStoreProductStats } from "@/hooks/useDashboardQueries";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";

type RegistrationSnapshot = {
  completed?: boolean;
  completed_at?: string | null;
  selected_sections?: string[];
  design_tone?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  whatsapp_enabled?: boolean;
  delivery_enabled?: boolean;
};

type OnboardingSnapshot = {
  completed?: boolean;
  completed_at?: string | null;
  completed_via?: string | null;
};

type JourneyStep = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  href: string;
  action: string;
  icon: typeof WandSparkles;
};

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function formatTone(value?: string | null) {
  if (!value) return "Template default";
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export default function MerchantSetupJourney() {
  const { activeStoreId } = useAuth();
  const { data: productStatsData, isLoading: productsLoading } = useStoreProductStats(activeStoreId);
  const { data: pageStatsData, isLoading: pagesLoading } = useStorePageStats(activeStoreId);
  const { data: healthData, isLoading: healthLoading } = useStoreHealth(activeStoreId);

  const { data: setupState, isLoading: setupLoading } = useQuery({
    queryKey: ["merchant-setup-journey", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return { registration: null, onboarding: null };

      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .eq("store_id", activeStoreId)
        .in("key", ["registration_onboarding", "onboarding_status"]);

      if (error) throw error;

      const settings = new Map((data ?? []).map((row) => [row.key, row.value]));
      const registrationValue = settings.get("registration_onboarding");
      const onboardingValue = settings.get("onboarding_status");

      return {
        registration: registrationValue === undefined
          ? null
          : readObject(registrationValue) as RegistrationSnapshot,
        onboarding: onboardingValue === undefined
          ? null
          : readObject(onboardingValue) as OnboardingSnapshot,
      };
    },
    enabled: Boolean(activeStoreId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const productCount = productStatsData?.total ?? 0;
  const visibleHomepageBlocks = pageStatsData?.visibleHomepageBlocks ?? 0;
  const healthScore = healthData?.score ?? 0;
  const registration = setupState?.registration ?? null;
  const onboarding = setupState?.onboarding ?? null;
  const hasRegistrationSnapshot = registration !== null;
  const registrationDone = Boolean(registration?.completed);
  const onboardingDone = Boolean(onboarding?.completed);

  const steps = useMemo<JourneyStep[]>(() => {
    if (!activeStoreId) return [];
    const registrationStepSatisfied = registrationDone || !hasRegistrationSnapshot;

    return [
      {
        id: "registration-wizard",
        label: "Registration Onboarding Wizard",
        description: registrationDone
          ? "Your quick design, section, and starter-input choices were saved."
          : !hasRegistrationSnapshot
            ? "Not applicable for this legacy or manually-created store. Continue with full Onboarding."
            : "The registration questionnaire exists but is not marked complete yet.",
        complete: registrationStepSatisfied,
        href: withStoreId("/admin/onboarding", activeStoreId),
        action: registrationDone
          ? "Review in Onboarding"
          : !hasRegistrationSnapshot
            ? "Continue Onboarding"
            : "Open Onboarding",
        icon: WandSparkles,
      },
      {
        id: "full-onboarding",
        label: "Full Onboarding",
        description: onboardingDone
          ? "The deeper CMS setup has been completed."
          : "Continue the separate full setup for store details, flows, content, and launch controls.",
        complete: onboardingDone,
        href: withStoreId("/admin/onboarding", activeStoreId),
        action: onboardingDone ? "Review setup" : "Continue Onboarding",
        icon: ListChecks,
      },
      {
        id: "catalog",
        label: "Catalog",
        description: productCount > 0
          ? `${productCount} item${productCount === 1 ? "" : "s"} currently in the catalog.`
          : "Add the first product, service, room, listing, or catalog item.",
        complete: productCount > 0,
        href: withStoreId("/admin/products", activeStoreId),
        action: productCount > 0 ? "Manage catalog" : "Add first item",
        icon: Package,
      },
      {
        id: "storefront",
        label: "Storefront content",
        description: visibleHomepageBlocks >= 3
          ? `${visibleHomepageBlocks} homepage sections are visible.`
          : "Strengthen the homepage with at least three useful customer-facing sections.",
        complete: visibleHomepageBlocks >= 3,
        href: buildPageBuilderPath("basic", { storeId: activeStoreId }),
        action: visibleHomepageBlocks >= 3 ? "Edit storefront" : "Improve homepage",
        icon: LayoutTemplate,
      },
      {
        id: "launch-check",
        label: "Launch check",
        description: healthScore >= 85
          ? `Store health is ${healthScore}/100. The core launch checks look strong.`
          : `Store health is ${healthScore}/100. Review the remaining launch blockers before driving traffic.`,
        complete: healthScore >= 85,
        href: withStoreId("/admin/launch", activeStoreId),
        action: healthScore >= 85 ? "Review readiness" : "Fix launch blockers",
        icon: Rocket,
      },
    ];
  }, [activeStoreId, hasRegistrationSnapshot, healthScore, onboardingDone, productCount, registrationDone, visibleHomepageBlocks]);

  if (!activeStoreId) return null;

  if (productsLoading || pagesLoading || healthLoading || setupLoading) {
    return <Skeleton className="h-[260px] w-full rounded-3xl" />;
  }

  const completedCount = steps.filter((step) => step.complete).length;
  const progressPercent = Math.round((completedCount / Math.max(1, steps.length)) * 100);
  const nextStep = steps.find((step) => !step.complete) ?? steps[steps.length - 1];
  const registrationSections = Array.isArray(registration?.selected_sections)
    ? registration.selected_sections.length
    : 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm" data-testid="merchant-setup-journey">
      <div className="grid lg:grid-cols-[1fr_320px]">
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                  <Sparkles className="mr-1 h-3 w-3" /> Setup journey
                </Badge>
                {registrationDone ? <Badge variant="secondary">Registration ready</Badge> : null}
                {!hasRegistrationSnapshot ? <Badge variant="secondary">Legacy store</Badge> : null}
              </div>
              <h2 className="mt-3 font-heading text-xl font-bold text-foreground sm:text-2xl">Continue from where registration left off</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                The Registration Onboarding Wizard and full Onboarding are different. Your quick questionnaire creates the starting storefront; full Onboarding handles the deeper CMS setup afterward.
              </p>
            </div>

            <div className="min-w-[150px] rounded-2xl border border-border bg-background/70 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Setup progress</span>
                <span className="font-bold text-foreground">{completedCount}/{steps.length}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{progressPercent}% of the launch foundation is complete.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.id}
                  to={step.href}
                  className={cn(
                    "group rounded-2xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    step.complete ? "border-primary/20 bg-primary/5" : "border-border bg-background/55 hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", step.complete ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                      {step.complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Step {index + 1}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{step.label}</p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-muted-foreground">{step.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    {step.action} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-border bg-secondary/20 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Registration handoff</p>
          {registrationDone ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <Palette className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">Design tone</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatTone(registration?.design_tone)}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">Sections chosen</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{registrationSections}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between rounded-xl bg-background/55 px-3 py-2"><span>WhatsApp starter</span><span className="font-semibold text-foreground">{registration?.whatsapp_enabled ? "Enabled" : "Skipped"}</span></div>
                <div className="flex items-center justify-between rounded-xl bg-background/55 px-3 py-2"><span>Delivery starter</span><span className="font-semibold text-foreground">{registration?.delivery_enabled ? "Enabled" : "Skipped"}</span></div>
              </div>
            </>
          ) : hasRegistrationSnapshot ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <WandSparkles className="h-5 w-5 text-amber-600" />
              <p className="mt-3 text-sm font-semibold text-foreground">Registration questionnaire needs review</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">A registration snapshot exists but is not marked complete. Continue in full Onboarding to verify the store setup.</p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-4">
              <Circle className="h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-foreground">Legacy or manually created store</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">There is no Registration Onboarding Wizard snapshot. Nothing is broken, and this step does not reduce your setup progress. Continue using full Onboarding.</p>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next recommended action</p>
            <p className="mt-2 text-sm font-bold text-foreground">{nextStep.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{nextStep.description}</p>
            <Button asChild size="sm" className="mt-3 w-full justify-between">
              <Link to={nextStep.href}>
                {nextStep.action}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
