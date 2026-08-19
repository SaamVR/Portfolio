"use client";

import { useEffect, useState } from "react";
import { BarChart3, LayoutDashboard, Sparkles } from "lucide-react";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MerchantSetupJourney from "@/components/admin/MerchantSetupJourney";
import MerchantCommandCenter from "@/components/admin/MerchantCommandCenter";
import DashboardPage from "@/views/admin/Dashboard";
import { cn } from "@/lib/utils";

type DashboardWorkspace = "home" | "reports";

export default function MerchantDashboardHome() {
  const [searchParams] = useSearchParams();
  const requestedDetailedTab = searchParams.get("tab");
  const [workspace, setWorkspace] = useState<DashboardWorkspace>(() => requestedDetailedTab ? "reports" : "home");

  useEffect(() => {
    if (requestedDetailedTab) setWorkspace("reports");
  }, [requestedDetailedTab]);

  return (
    <div className="space-y-5" data-testid="merchant-dashboard-home">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
              <Sparkles className="mr-1 h-3 w-3" /> Merchant workspace
            </Badge>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {workspace === "home" ? "Your store, without the clutter" : "Reports, analytics & deeper tools"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {workspace === "home"
              ? "Start with what needs attention now. Open the detailed workspace only when you need deeper analysis or specialist tools."
              : "The full dashboard remains available here with analytics, launch readiness, activity, diagnostics, and operational shortcuts."}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 rounded-2xl border border-border bg-background/70 p-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setWorkspace("home")}
            className={cn("gap-2 rounded-xl", workspace === "home" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
          >
            <LayoutDashboard className="h-4 w-4" /> Home
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setWorkspace("reports")}
            className={cn("gap-2 rounded-xl", workspace === "reports" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
          >
            <BarChart3 className="h-4 w-4" /> Reports & tools
          </Button>
        </div>
      </div>

      {workspace === "home" ? (
        <div className="space-y-6">
          <MerchantSetupJourney />
          <MerchantCommandCenter />
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-background/20 p-1 sm:p-2">
          <DashboardPage />
        </div>
      )}
    </div>
  );
}
