"use client";

import React, { useState } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ArrowLeft, Menu, Search } from "lucide-react";
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
import { buildPageBuilderPath } from "@/lib/admin-paths";
import { getSupportUrl, isExternalSupportUrl } from "@/lib/platform/support";
import StoreSwitcher from "./StoreSwitcher";
import { getAdminNavigationItems, getAdminNavigationSections, type AdminNavigationItem } from "@/lib/admin/admin-navigation";
import { isPlatformRole } from "@/lib/platform/rbac";

type AdminMobileNavProps = {
  onOpenCommand: () => void;
  compact?: boolean;
};

type NavLinkItem = Pick<
  AdminNavigationItem,
  "to" | "icon" | "label" | "badge" | "show" | "external" | "mobileShortLabel"
>;

const isRouteActive = (pathname: string, target: string) =>
  target === "/admin" ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);

const AdminMobileNav = ({ onOpenCommand, compact = false }: AdminMobileNavProps) => {
  const { role, platformRole, user, signOut, activeStoreId } = useAuth();
  const location = useLocation();
  const isAdmin = role === "admin";
  const isPlatformAdmin = isPlatformRole(platformRole);
  const [isOpen, setIsOpen] = useState(false);
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const supportUrl = getSupportUrl();
  const supportIsExternal = isExternalSupportUrl(supportUrl);
  const cmsEnabled = isAdmin && getFeatureEnabled(entitlementData?.featureMap, "cms_pages", false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages-count", activeStoreId],
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

  const { data: pendingReviewsCount = 0 } = useQuery({
    queryKey: ["pending-reviews-count", activeStoreId],
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

  const advancedEditingEnabled = cmsEnabled && getFeatureEnabled(entitlementData?.featureMap, "advanced_page_builder", false);
  const backupEnabled = isAdmin && getFeatureEnabled(entitlementData?.featureMap, "backup_import", false);
  const mediaEnabled = isAdmin && getFeatureEnabled(entitlementData?.featureMap, "media_library", false);

  const navigationContext = {
    activeStoreId,
    cmsEnabled,
    advancedEditingEnabled,
    backupEnabled,
    mediaEnabled,
    isAdmin,
    isOwner: isAdmin || isPlatformAdmin,
    isPlatformAdmin,
    compact,
    unreadCount,
    pendingReviewsCount,
    supportUrl,
    supportIsExternal,
  };

  const allNavItems = getAdminNavigationItems(navigationContext);
  const drawerSections = getAdminNavigationSections(navigationContext);

  const dockLinks: NavLinkItem[] = allNavItems.filter((item) =>
    ["/admin", "/admin/orders", "/admin/products", buildPageBuilderPath("basic", { storeId: activeStoreId })].includes(item.to),
  );

  const renderLinkCard = (link: AdminNavigationItem) => {
    const active = !link.external && isRouteActive(location.pathname, link.to.split("?")[0] || link.to);
    const Icon = link.icon;

    return link.external ? (
      <a
        href={link.to}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-12 items-center gap-3 rounded-2xl border border-transparent bg-secondary/40 px-4 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{link.label}</span>
      </a>
    ) : (
      <Link
        to={link.to}
        onClick={() => setIsOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
          active
            ? "border-primary/20 bg-primary/10 font-semibold text-primary"
            : "border-transparent bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{link.label}</span>
        {link.badge !== undefined && link.badge > 0 ? (
          <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {link.badge > 99 ? "99+" : link.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/92 px-3 py-2 pb-safe backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around">
          {dockLinks.filter((link) => link.show !== false).map((link) => {
            const target = link.to.split("?")[0] || link.to;
            const active = isRouteActive(location.pathname, target);
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all duration-300",
                  active ? "scale-105 font-bold text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{link.mobileShortLabel ?? link.label}</span>
                {link.badge !== undefined && link.badge > 0 ? (
                  <span className="absolute right-1 top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open admin menu"
                className={cn(
                  "flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-300 hover:text-foreground",
                  isOpen && "scale-105 font-bold text-primary",
                )}
              >
                <Menu className="h-4.5 w-4.5" />
                <span>Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-[2rem] border-t border-border/80 bg-card p-6 shadow-2xl">
              <SheetHeader className="border-b border-border/50 pb-4 text-left">
                <SheetTitle className="flex items-center gap-3">
                  <span className="font-heading text-xl font-bold text-foreground">
                    Store<span className="text-primary">Admin</span>
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {isAdmin ? "Owner" : "Staff"}
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-5 py-6">
                <StoreSwitcher mobile />

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCommand();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-transparent bg-secondary/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
                >
                  <Search className="h-4 w-4 shrink-0 text-primary" />
                  <span>Search actions or tools (Ctrl+K)</span>
                </button>

                {drawerSections.map((section, index) => (
                  <section
                    key={section.key}
                    aria-label={section.title}
                    className={cn("space-y-3", index > 0 && "border-t border-border/50 pt-4")}
                  >
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {section.title}
                    </p>
                    <div className="space-y-2">
                      {section.links.map((link) => (
                        <SheetClose asChild key={link.to}>
                          {renderLinkCard(link)}
                        </SheetClose>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="space-y-4 border-t border-border/50 pt-4">
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
