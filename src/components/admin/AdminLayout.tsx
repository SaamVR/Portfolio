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
import { LayoutDashboard, LineChart, Moon, Rocket, Search, Settings, ShoppingCart, SlidersHorizontal, SquarePen, SquareStack, SunMedium, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminRecoveryPanel from "./AdminRecoveryPanel";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";
import { useTheme } from "next-themes";
import { getAdminWorkspaceChips } from "@/lib/admin/admin-navigation";

const workspaceLabels: Array<{ path: string; label: string; description: string }> = [
  { path: "/admin/launch", label: "Launch Readiness", description: "Final go-live blockers, warnings, and launch confidence" },
  { path: "/admin/notifications", label: "Notifications", description: "Delivery health, alert configuration, and recent sends" },
  { path: "/admin/diagnostics", label: "Diagnostics", description: "Domain, payment, billing, and operator health" },
  { path: "/admin/recovery", label: "Cart Recovery", description: "Recover signed-in carts and inspect anonymous drop-off signals" },
  { path: "/admin/page-builder/basic", label: "Guided Editing", description: "Safer storefront content, visibility, and theme edits" },
  { path: "/admin/page-builder/advanced", label: "Expert Editing", description: "Full page structure, templates, revisions, and deeper block controls" },
  { path: "/admin/page-builder", label: "Guided Editing", description: "Safer storefront content, visibility, and theme edits" },
  { path: "/admin/onboarding", label: "Guided Setup", description: "Initial setup, template seeding, and guided launch flow" },
  { path: "/admin/templates", label: "Templates", description: "Browse storefront templates, preview directions, and apply the right launch pattern" },
  { path: "/admin/cms", label: "Page Builder", description: "Storefront pages, blocks, and live preview" },
  { path: "/admin/products", label: "Products", description: "Catalog, stock, and merchandising" },
  { path: "/admin/orders", label: "Orders", description: "Fulfillment and customer purchases" },
  { path: "/admin/analytics", label: "Analytics", description: "Traffic, search intent, product interest, and conversion funnel" },
  { path: "/admin/blog", label: "Blog", description: "Markdown-first articles, SEO posts, and storefront content marketing" },
  { path: "/admin/qr", label: "QR Codes", description: "Generate scannable storefront links for products, pages, and promos" },
  { path: "/admin/messages", label: "Messages", description: "Customer contact inbox" },
  { path: "/admin/reviews", label: "Reviews", description: "Moderation and storefront trust" },
  { path: "/admin/media", label: "Media Library", description: "Images and reusable storefront assets" },
  { path: "/admin/site-settings", label: "Site Settings", description: "Brand, SEO, announcements, and domain" },
];

const isActiveAdminRoute = (pathname: string, target: string) =>
  target === "/admin" ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);

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
  const mobileAdminRoutes = getAdminWorkspaceChips({
    activeStoreId,
    cmsEnabled: true,
    advancedEditingEnabled: true,
    backupEnabled: true,
    mediaEnabled: true,
    isAdmin: true,
    isOwner: true,
    isPlatformAdmin: role === "admin",
    supportUrl: "/contact",
    supportIsExternal: false,
  });
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
            <div className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none]">
              <div className="flex min-w-max snap-x snap-mandatory items-center gap-2">
                {mobileAdminRoutes.map((route) => {
                  const routeTo = route.to.startsWith("/admin/page-builder") ? withStoreId(route.to, activeStoreId) : route.to;
                  const active = isActiveAdminRoute(location.pathname, route.to);
                  const Icon = route.icon;
                  return (
                    <Link
                      key={route.to}
                      to={routeTo}
                      className={cn(
                        "inline-flex h-9 snap-start items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-background/90 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{route.mobileShortLabel ?? route.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
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
