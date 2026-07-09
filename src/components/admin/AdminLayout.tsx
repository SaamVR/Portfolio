import { useState } from "react";
import { Navigate } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";
import AdminCommandMenu from "./AdminCommandMenu";
import StoreSwitcher from "./StoreSwitcher";
import { Loader2, Search } from "lucide-react";

const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  const [commandOpen, setCommandOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Workspace Search Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-xl px-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="md:hidden font-heading text-lg font-bold text-foreground">
              THREAD<span className="text-primary">BD</span>
            </span>
            <span className="hidden md:inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Merchant Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <StoreSwitcher />
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-secondary hover:text-foreground w-44 sm:w-56 text-left"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">Search sectors (Ctrl+K)...</span>
              <kbd className="hidden sm:inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[9px] font-medium opacity-60">
                <span>Ctrl</span>K
              </kbd>
            </button>
          </div>
        </header>

        <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8 md:px-8">
          {children}
        </div>
      </main>
      <AdminMobileNav />
      <AdminCommandMenu open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
};

export default AdminLayout;
