import { useState } from "react";
import { Link, Navigate, useLocation } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";
import AdminCommandMenu from "./AdminCommandMenu";
import StoreSwitcher from "./StoreSwitcher";
import { LayoutDashboard, PanelsTopLeft, Search, Settings, ShoppingCart, SquareStack } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminRecoveryPanel from "./AdminRecoveryPanel";

const workspaceLabels: Array<{ path: string; label: string; description: string }> = [
  { path: "/admin/page-builder", label: "Page Builder", description: "Storefront pages, blocks, and live preview" },
  { path: "/admin/cms", label: "Page Builder", description: "Storefront pages, blocks, and live preview" },
  { path: "/admin/products", label: "Products", description: "Catalog, stock, and merchandising" },
  { path: "/admin/orders", label: "Orders", description: "Fulfillment and customer purchases" },
  { path: "/admin/messages", label: "Messages", description: "Customer contact inbox" },
  { path: "/admin/reviews", label: "Reviews", description: "Moderation and storefront trust" },
  { path: "/admin/media", label: "Media Library", description: "Images and reusable storefront assets" },
  { path: "/admin/site-settings", label: "Site Settings", description: "Brand, SEO, announcements, and domain" },
];

const mobileAdminRoutes = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/site-settings", label: "Settings", icon: Settings },
  { to: "/admin/page-builder", label: "Builder", icon: PanelsTopLeft },
  { to: "/admin/products", label: "Catalog", icon: SquareStack },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
];

const isActiveAdminRoute = (pathname: string, target: string) =>
  target === "/admin" ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);

const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, session, role, loading, refreshRole, signOut } = useAuth();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
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

  if (loading) {
    return (
      <AdminRecoveryPanel
        title="Restoring dashboard access"
        description="Your session is loading while store permissions and workspace state come back."
        loadingLabel="Reconnecting the admin dashboard."
        retryLabel="Refresh dashboard"
        secondaryLabel="Sign out"
        onRetry={() => void refreshRole()}
        onSecondary={() => void signOut()}
        fullHeight
      />
    );
  }

  if (!loading && !session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!role || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="font-heading text-xl font-semibold text-foreground">Refreshing dashboard access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your session is still here, but the dashboard permissions did not restore cleanly.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => void refreshRole()}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Retry access
            </button>
            <button
              onClick={() => void signOut()}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
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
            <button
              onClick={() => setCommandOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
              aria-label="Search dashboard actions"
            >
              <Search className="h-4 w-4" />
            </button>
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
          </div>
        </header>
        <div className="border-b border-border/60 bg-card/40 px-4 py-2.5 md:hidden">
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <div className="flex min-w-max items-center gap-2 pb-1">
                {mobileAdminRoutes.map((route) => {
                  const active = isActiveAdminRoute(location.pathname, route.to);
                  const Icon = route.icon;
                  return (
                    <Link
                      key={route.to}
                      to={route.to}
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-background/90 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{route.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-background/90 px-3.5 py-3 shadow-sm">
              <p className="text-sm font-semibold text-foreground">{currentWorkspace.label}</p>
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
      <AdminMobileNav onOpenCommand={() => setCommandOpen(true)} />
      <AdminCommandMenu open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
};

export default AdminLayout;
