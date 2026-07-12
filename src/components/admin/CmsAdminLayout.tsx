"use client";

import { useState } from "react";
import { Link, Navigate, useLocation } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/admin/ChangePasswordDialog";
import { ArrowLeft, Building2, LayoutDashboard, Layers3, Loader2, LogOut, Search, Shield } from "lucide-react";
import AdminCommandMenu from "@/components/admin/AdminCommandMenu";

const cmsAdminLinks = [
  { to: "/cms-admin", icon: Shield, label: "CMS Control" },
  { to: "/cms-admin/libraries", icon: Layers3, label: "Shared Library" },
];

export default function CmsAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, platformRole, loading, signOut } = useAuth();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/admin/login?next=/cms-admin" replace />;
  }

  if (platformRole !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link to="/cms-admin" className="font-heading text-lg font-bold text-foreground">
            CMS<span className="text-primary">Admin</span>
          </Link>
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Platform
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {cmsAdminLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border p-4">
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <ChangePasswordDialog />
          <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 text-muted-foreground">
            <Link to="/admin">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Merchant Admin
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild className="flex-1 justify-start gap-2 text-muted-foreground">
              <Link to="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                Store
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-destructive hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/50 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary md:hidden" />
            <span className="font-heading text-lg font-bold text-foreground md:hidden">CMS Admin</span>
            <span className="hidden rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary md:inline-flex">
              CMS Admin Workspace
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/admin">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Merchant Admin
              </Link>
            </Button>
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden w-44 items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-left text-xs text-muted-foreground transition-all hover:bg-secondary hover:text-foreground sm:flex sm:w-56"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">Search admin (Ctrl+K)...</span>
            </button>
          </div>
        </header>

        <div className="container mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <AdminCommandMenu open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
}
