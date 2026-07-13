import { useState } from "react";
import { Navigate, useLocation } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";
import AdminCommandMenu from "./AdminCommandMenu";
import StoreSwitcher from "./StoreSwitcher";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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

const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, session, role, loading } = useAuth();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const currentWorkspace =
    workspaceLabels.find((workspace) => location.pathname === workspace.path || location.pathname.startsWith(`${workspace.path}/`)) ?? {
      label: "Merchant Dashboard",
      description: "Store operations and performance",
    };
  const isCmsWorkspace =
    location.pathname === "/admin/page-builder" ||
    location.pathname.startsWith("/admin/page-builder/") ||
    location.pathname === "/admin/cms" ||
    location.pathname.startsWith("/admin/cms/");

  const showBlockingLoader = loading || (!!session && (!user || !role));

  if (showBlockingLoader) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loading && !session) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Workspace Search Header */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-card/50 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="md:hidden font-heading text-lg font-bold text-foreground">
              Merchant<span className="text-primary">Admin</span>
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
            <StoreSwitcher />
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

        <div
          className={cn(
            "container mx-auto px-4 py-6 md:px-8 md:py-8",
            isCmsWorkspace ? "max-w-[1560px]" : "max-w-6xl",
          )}
        >
          {children}
        </div>
      </main>
      <AdminMobileNav />
      <AdminCommandMenu open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
};

export default AdminLayout;
