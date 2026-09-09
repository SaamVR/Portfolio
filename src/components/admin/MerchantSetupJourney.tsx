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
  Rocket,
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
    return <Skeleton className="h-[220px] w-full rounded-3xl" />;
  }

  const completedCount = steps.filter((step) => step.complete).length;
  const progressPercent = Math.round((completedCount / Math.max(1, steps.length)) * 100);
  const nextStep = steps.find((step) => !step.complete) ?? steps[steps.length - 1];
  const registrationSections = Array.isArray(registration?.selected_sections)
    ? registration.selected_sections.length
    : 0;

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" data-testid="merchant-setup-journey">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
            <Sparkles className="mr-1 h-3 w-3" /> Setup progress
          </Badge>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">Finish your launch foundation</h2>
            <span className="text-sm font-semibold text-muted-foreground">{completedCount}/{steps.length} complete</span>
          </div>
        </div>
        <span className="text-sm font-bold text-primary">{progressPercent}%</span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-label={`Setup progress ${progressPercent}%`}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Next step</p>
          <h3 className="mt-2 font-heading text-lg font-bold text-foreground">{nextStep.label}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{nextStep.description}</p>
          <Button asChild className="mt-4 w-full justify-between sm:w-auto">
            <Link to={nextStep.href}>
              {nextStep.action}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-2" aria-label="Setup milestones">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isNext = step.id === nextStep.id && !step.complete;
            return (
              <Link
                key={step.id}
                to={step.href}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
                  step.complete
                    ? "border-transparent bg-secondary/35 text-muted-foreground"
                    : isNext
                      ? "border-primary/25 bg-background text-foreground hover:bg-secondary/35"
                      : "border-border bg-background/60 text-foreground hover:bg-secondary/35",
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                  step.complete ? "bg-primary/10 text-primary" : isNext ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}>
                  {step.complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-semibold", step.complete && "font-medium")}>{step.label}</p>
                  <p className="text-[11px] text-muted-foreground">{step.complete ? "Complete" : isNext ? "Recommended next" : `Step ${index + 1}`}</p>
                </div>
                {!step.complete ? <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
              </Link>
            );
          })}
        </div>
      </div>

      {hasRegistrationSnapshot ? (
        <details className="mt-4 rounded-2xl border border-border bg-background/45 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Registration details</summary>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <div><span className="block">Status</span><strong className="mt-1 block text-foreground">{registrationDone ? "Complete" : "Needs review"}</strong></div>
            <div><span className="block">Design tone</span><strong className="mt-1 block text-foreground">{formatTone(registration?.design_tone)}</strong></div>
            <div><span className="block">Sections chosen</span><strong className="mt-1 block text-foreground">{registrationSections}</strong></div>
            <div><span className="block">Starters</span><strong className="mt-1 block text-foreground">WhatsApp {registration?.whatsapp_enabled ? "on" : "off"} · Delivery {registration?.delivery_enabled ? "on" : "off"}</strong></div>
          </div>
        </details>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Circle className="h-3.5 w-3.5" /> Registration Wizard is not required for this legacy or manually-created store.
        </div>
      )}
    </section>
  );
}
