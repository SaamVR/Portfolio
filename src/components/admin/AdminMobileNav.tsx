"use client";

import React, { useState } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Package,
  PanelsTopLeft,
  ShoppingCart,
  Mail,
  MessageSquare,
  Tag,
  FolderTree,
  Settings,
  KeyRound,
  Users,
  LogOut,
  ArrowLeft,
  Menu,
  Rocket,
  Images,
  HardDriveDownload,
  Shield,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";

const AdminMobileNav = () => {
  const { role, platformRole, user, signOut , activeStoreId} = useAuth();
  const location = useLocation();
  const isAdmin = role === "admin";
  const isPlatformAdmin = platformRole === "admin";
  const [isOpen, setIsOpen] = useState(false);
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);

  // Fetch unread message count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages-count-mobile", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return 0;
      const { count } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("store_id", activeStoreId as string)
        .eq("is_read", false);
      return count ?? 0;
    },
    enabled: Boolean(activeStoreId),
    refetchInterval: 30000,
  });

  // Fetch pending reviews count
  const { data: pendingReviewsCount = 0 } = useQuery({
    queryKey: ["pending-reviews-count-mobile", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return 0;
      const { count } = await supabase
        .from("product_reviews" as any)
        .select("*", { count: "exact", head: true })
        .eq("store_id", activeStoreId as string)
        .eq("status", "pending");
      return count ?? 0;
    },
    enabled: Boolean(activeStoreId),
    refetchInterval: 30000,
  });

  const dockLinks = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/products", icon: Package, label: "Products" },
    { to: "/admin/orders", icon: ShoppingCart, label: "Orders" },
    { to: "/admin/messages", icon: Mail, label: "Messages", badge: unreadCount },
  ];

  const drawerLinks = [
    { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", show: true, badge: pendingReviewsCount },
    { to: "/admin/coupons", icon: Tag, label: "Coupons", show: true },
    { to: "/admin/categories", icon: FolderTree, label: "Categories & Types", show: isAdmin },
    { to: "/admin/onboarding", icon: Rocket, label: "Store Setup", show: isAdmin },
    { to: "/admin/cms", icon: PanelsTopLeft, label: "CMS Builder", show: isAdmin && getFeatureEnabled(entitlementData?.featureMap, "cms_pages", false) },
    { to: "/admin/media", icon: Images, label: "Media Library", show: isAdmin && getFeatureEnabled(entitlementData?.featureMap, "media_library", false) },
    { to: "/admin/backup", icon: HardDriveDownload, label: "Backup & Import", show: isAdmin && getFeatureEnabled(entitlementData?.featureMap, "backup_import", false) },
    { to: "/admin/site-settings", icon: Settings, label: "Site Settings", show: isAdmin },
    { to: "/admin/invite-codes", icon: KeyRound, label: "Invite Codes", show: isAdmin },
    { to: "/admin/billing", icon: CreditCard, label: "Billing & Plan", show: isAdmin },
    { to: "/admin/users", icon: Users, label: "Users", show: isAdmin },
    { to: "/cms-admin", icon: Shield, label: "CMS Admin", show: isPlatformAdmin },
    { to: "https://help.threadbd.com", icon: HelpCircle, label: "Help & Support", show: true, external: true },
  ];

  return (
    <>
      {/* Sticky Bottom Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/80 px-4 py-2 backdrop-blur-xl md:hidden pb-safe">
        <div className="flex items-center justify-around">
          {dockLinks.map((link) => {
            const active = location.pathname === link.to;
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl p-2 text-xs font-medium transition-all duration-300",
                  active ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="absolute -top-0.5 right-2.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Menu Drawer Trigger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl p-2 text-xs font-medium text-muted-foreground transition-all duration-300 hover:text-foreground",
                  isOpen && "text-primary scale-110"
                )}
              >
                <Menu className="h-5 w-5" />
                <span>Menu</span>
                {(pendingReviewsCount > 0) && (
                  <span className="absolute top-1.5 right-6 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2rem] border-t border-border/80 bg-card p-6 shadow-2xl">
              <SheetHeader className="text-left pb-4 border-b border-border/50">
                <SheetTitle className="flex items-center gap-3">
                  <span className="font-heading text-xl font-bold text-foreground">
                    THREAD<span className="text-primary">BD</span>
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {isAdmin ? "Owner" : "Staff"}
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-3 py-6">
                {drawerLinks
                  .filter((l) => l.show)
                  .map((link) => {
                    const active = location.pathname === link.to;
                    const Icon = link.icon;
                    return (
                      <SheetClose asChild key={link.to}>
                        <Link
                          to={link.to}
                          className={cn(
                            "flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-all duration-200 border border-transparent",
                            active
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{link.label}</span>
                          {link.badge !== undefined && link.badge > 0 && (
                            <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                              {link.badge > 99 ? "99+" : link.badge}
                            </span>
                          )}
                        </Link>
                      </SheetClose>
                    );
                  })}
              </div>

              <div className="border-t border-border/50 pt-4 space-y-4">
                <div className="px-2">
                  <p className="text-xs text-muted-foreground">Logged in as</p>
                  <p className="truncate text-sm font-medium text-foreground">{user?.email}</p>
                </div>
                <ChangePasswordDialog />
                <div className="flex gap-3">
                  <SheetClose asChild>
                    <Button variant="outline" size="lg" asChild className="flex-1 justify-center gap-2 rounded-xl">
                      <Link to="/">
                        <ArrowLeft className="h-4 w-4" />
                        Go to Store
                      </Link>
                    </Button>
                  </SheetClose>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => {
                      setIsOpen(false);
                      signOut();
                    }}
                    className="flex-1 justify-center gap-2 rounded-xl"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
};

export default AdminMobileNav;


