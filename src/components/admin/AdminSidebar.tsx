import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Package,
  Settings,
  KeyRound,
  LogOut,
  ArrowLeft,
  Users,
  ShoppingCart,
  Mail,
  Tag,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const AdminSidebar = () => {
  const { role, user, signOut } = useAuth();
  const location = useLocation();
  const isAdmin = role === "admin";

  // Fetch unread message count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Fetch pending reviews count
  const { data: pendingReviewsCount = 0 } = useQuery({
    queryKey: ["pending-reviews-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("product_reviews" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const links = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", show: true },
    { to: "/admin/products", icon: Package, label: "Products", show: true },
    { to: "/admin/orders", icon: ShoppingCart, label: "Orders", show: true },
    { to: "/admin/messages", icon: Mail, label: "Messages", show: true, badge: unreadCount },
    { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", show: true, badge: pendingReviewsCount },
    { to: "/admin/coupons", icon: Tag, label: "Coupons", show: true },
    { to: "/admin/site-settings", icon: Settings, label: "Site Settings", show: isAdmin },
    { to: "/admin/invite-codes", icon: KeyRound, label: "Invite Codes", show: isAdmin },
    { to: "/admin/users", icon: Users, label: "Users", show: isAdmin },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link to="/" className="font-heading text-lg font-bold text-foreground">
          THREAD<span className="text-primary">BD</span>
        </Link>
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {isAdmin ? "Admin" : "Co-Admin"}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {links
          .filter((l) => l.show)
          .map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-border p-4 space-y-2">
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
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
  );
};

export default AdminSidebar;

