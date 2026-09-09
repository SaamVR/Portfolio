"use client";

import { useEffect, useState } from "react";
import { BarChart3, LayoutDashboard } from "lucide-react";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {workspace === "home" ? "Dashboard" : "Reports & tools"}
          </h1>
          <p className="mt-1 text-sm text-foreground/65">
            {workspace === "home" ? "Focus on the next action that moves your store forward." : "Analytics, diagnostics, activity, and deeper operational tools."}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 rounded-2xl border border-primary/20 bg-background/85 p-1 shadow-sm">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setWorkspace("home")}
            className={cn(
              "gap-2 rounded-xl",
              workspace === "home"
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                : "text-foreground/70 hover:bg-primary/10 hover:text-foreground",
            )}
          >
            <LayoutDashboard className="h-4 w-4" /> Home
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setWorkspace("reports")}
            className={cn(
              "gap-2 rounded-xl",
              workspace === "reports"
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                : "text-foreground/70 hover:bg-primary/10 hover:text-foreground",
            )}
          >
            <BarChart3 className="h-4 w-4" /> Reports & tools
          </Button>
        </div>
      </div>

      {workspace === "home" ? (
        <div className="space-y-5">
          <MerchantSetupJourney />
          <MerchantCommandCenter />
        </div>
      ) : (
        <DashboardPage />
      )}
    </div>
  );
}
