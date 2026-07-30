"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";
import AdminCommandMenu from "./AdminCommandMenu";
import StoreSwitcher from "./StoreSwitcher";
import { AdminPreviewStoreButton } from "./AdminPreviewStoreButton";
import { Moon, Search, SunMedium } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminRecoveryPanel from "./AdminRecoveryPanel";
import { useTheme } from "next-themes";

const workspaceLabels: Array<{ path: string; label: string; description: string }> = [
  { path: "/admin/launch", label: "Dashboard", description: "Store overview, launch checklist, and key alerts" },
  { path: "/admin/notifications", label: "Dashboard", description: "Delivery alerts and merchant notifications" },
  { path: "/admin/diagnostics", label: "Settings", description: "Domain, payment, billing, and store health" },
  { path: "/admin/marketing", label: "Marketing", description: "Coupons, abandoned cart recovery, and QR codes" },
  { path: "/admin/recovery", label: "Marketing", description: "Recover abandoned carts and inspect drop-off signals" },
  { path: "/admin/qr", label: "Marketing", description: "Generate scannable storefront links" },
  { path: "/admin/coupons", label: "Marketing", description: "Discount codes and campaigns" },
  { path: "/admin/online-store", label: "Online Store", description: "Design, themes, pages, blog, and media" },
  { path: "/admin/page-builder/basic", label: "Online Store", description: "Visual storefront editor" },
  { path: "/admin/page-builder/advanced", label: "Online Store", description: "Advanced page builder" },
  { path: "/admin/page-builder", label: "Online Store", description: "Visual storefront editor" },
  { path: "/admin/onboarding", label: "Online Store", description: "Guided setup and launch flow" },
  { path: "/admin/templates", label: "Online Store", description: "Browse and apply storefront templates" },
  { path: "/admin/cms", label: "Online Store", description: "Storefront pages and content blocks" },
  { path: "/admin/blog", label: "Online Store", description: "Blog posts and content marketing" },
  { path: "/admin/media", label: "Online Store", description: "Images and reusable store assets" },
  { path: "/admin/products", label: "Products", description: "Catalog, stock, and category management" },
  { path: "/admin/categories", label: "Products", description: "Category and product type organization" },
  { path: "/admin/orders", label: "Orders", description: "Fulfillment and customer purchases" },
  { path: "/admin/returns", label: "Orders", description: "Returns, refunds, and COD settlement" },
  { path: "/admin/couriers", label: "Orders", description: "Courier connections and shipments" },
  { path: "/admin/analytics", label: "Analytics", description: "Traffic, sales performance, product interest, and conversion funnel" },
  { path: "/admin/billing", label: "Billing & Plans", description: "Subscription plan, usage limits, and payment method" },
  { path: "/admin/customers", label: "Customers & Messages", description: "Customer inbox and product reviews" },
  { path: "/admin/messages", label: "Customers & Messages", description: "Customer contact inbox" },
  { path: "/admin/reviews", label: "Customers & Messages", description: "Product review moderation" },
  { path: "/admin/site-settings", label: "Settings", description: "Brand, payments, domains, and store configuration" },
];


const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, session, role, activeStoreId, loading, authRecovery, refreshRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";
  const currentWorkspace =
    workspaceLabels.find((workspace) => location.pathname === workspace.path || location.pathname.startsWith(`${workspace.path}/`)) ?? {
      label: "Store Dashboard",
      description: "Store operations and performance",
    };
  const isCmsWorkspace =
    location.pathname === "/admin/page-builder" ||
    location.pathname.startsWith("/admin/page-builder/") ||
    location.pathname === "/admin/cms" ||
    location.pathname.startsWith("/admin/cms/");
  const isGuidedSetupWorkspace = location.pathname === "/admin/onboarding" || location.pathname.startsWith("/admin/onboarding/");

  const { data: deletedStoreHistory } = useQuery({
    queryKey: ["deleted-store-history-redirect", user?.id ?? ""],
    enabled: Boolean(user?.id) && !role,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_deletion_records")
        .select("id")
        .eq("owner_user_id", user?.id as string)
        .limit(1);

      return Boolean(data?.length);
    },
  });

  if (loading) {
    const recoveryTitle =
      authRecovery.reason === "offline"
        ? "You are offline"
        : authRecovery.reason === "permission_timeout"
          ? "Permission check timed out"
          : "Restoring dashboard access";
    const recoveryDescription =
      authRecovery.reason === "offline"
        ? "The dashboard cannot finish restoring permissions until the connection comes back."
        : authRecovery.reason === "permission_timeout"
          ? "Your session came back, but the permission lookup is taking too long."
          : "Your session is loading while store permissions and workspace state come back.";

    return (
      <AdminRecoveryPanel
        title={recoveryTitle}
        description={recoveryDescription}
        loadingLabel="Reconnecting the admin dashboard."
        retryLabel="Refresh dashboard"
        secondaryLabel="Sign out"
        onRetry={() => void refreshRole()}
        onSecondary={() => void signOut()}
        fullHeight
        autoRetry
        statusHint={authRecovery.detail ?? undefined}
      />
    );
  }

  if (!loading && !session) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/admin/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!loading && session && user && !role && deletedStoreHistory) {
    return <Navigate to="/account/sites-removed" replace />;
  }

  if (!role || !user) {
    const noStoreState = authRecovery.reason === "no_store" && !deletedStoreHistory;
    return (
      <AdminRecoveryPanel
        title={noStoreState ? "No store workspace found" : authRecovery.reason === "offline" ? "You are offline" : "Refreshing dashboard access"}
        description={
          noStoreState
            ? "Your session is active, but this account does not have a store assigned yet."
            : authRecovery.reason === "offline"
              ? "The dashboard cannot restore store permissions until the internet connection comes back."
              : "Your session is still here, but the dashboard permissions did not restore cleanly."
        }
        loadingLabel={
          noStoreState
            ? "Create a store or ask an owner to invite this account."
            : "Checking the latest account and store permissions."
        }
        retryLabel={noStoreState ? "Check again" : "Retry access"}
        secondaryLabel={noStoreState ? "Create store" : "Sign out"}
        onRetry={() => void refreshRole()}
        onSecondary={() => {
          if (noStoreState) {
            navigate("/signup");
            return;
          }
          void signOut();
        }}
        fullHeight
        autoRetry={authRecovery.reason !== "no_store"}
        statusHint={authRecovery.detail ?? undefined}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar compact={isGuidedSetupWorkspace} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Workspace Search Header */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card/50 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="md:hidden rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {currentWorkspace.label}
            </span>
            <div className="hidden min-w-0 md:block">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {currentWorkspace.label}
                </span>
                {isCmsWorkspace ? (
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Wide workspace
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{currentWorkspace.description}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden md:block">
              <StoreSwitcher />
            </div>
            <AdminPreviewStoreButton />
            <button
              onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/80 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkTheme ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{isDarkTheme ? "Light" : "Dark"}</span>
            </button>
            <button
              onClick={() => setCommandOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
              aria-label="Search dashboard actions"
            >
              <Search className="h-4 w-4" />
            </button>
            {!isGuidedSetupWorkspace ? (
              <button
                onClick={() => setCommandOpen(true)}
                className="hidden w-44 items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-left text-xs text-muted-foreground transition-all hover:bg-secondary hover:text-foreground sm:flex sm:w-60 lg:w-72"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">Search dashboard actions...</span>
                <kbd className="hidden sm:inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[9px] font-medium opacity-60">
                  <span>Ctrl</span>K
                </kbd>
              </button>
            ) : null}
          </div>
        </header>
        <div className={cn("border-b border-border/60 bg-card/40 px-4 py-2.5 md:hidden", isGuidedSetupWorkspace && "hidden")}>
          <div className="space-y-3">

            <div className="rounded-2xl border border-border bg-background/90 px-3.5 py-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{currentWorkspace.label}</p>
                {isCmsWorkspace ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Wider editing workspace
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{currentWorkspace.description}</p>
            </div>
            <StoreSwitcher mobile />
          </div>
        </div>

        <div
          className={cn(
            "container mx-auto px-4 py-6 md:px-8 md:py-8",
            isCmsWorkspace ? "max-w-[1560px]" : "max-w-6xl",
          )}
        >
          {children}
        </div>
      </main>
      <AdminMobileNav onOpenCommand={() => setCommandOpen(true)} compact={isGuidedSetupWorkspace} />
      <AdminCommandMenu open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
};

export default AdminLayout;
