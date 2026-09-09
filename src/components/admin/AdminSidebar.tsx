import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { getSupportUrl, isExternalSupportUrl } from "@/lib/platform/support";
import { getAdminNavigationSections, type AdminNavigationItem } from "@/lib/admin/admin-navigation";
import { isPlatformRole } from "@/lib/platform/rbac";

const isRouteActive = (pathname: string, target: string) =>
  target === "/admin" ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);

const AdminSidebar = ({ compact = false }: { compact?: boolean }) => {
  const { role, platformRole, storeRole, user, signOut, activeStoreId } = useAuth();
  const location = useLocation();
  const isAdmin = role === "admin";
  const isPlatformAdmin = isPlatformRole(platformRole);
  const isOwner = storeRole === "owner" || isPlatformAdmin;
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const supportUrl = getSupportUrl();
  const supportIsExternal = isExternalSupportUrl(supportUrl);

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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const cmsEnabled = isAdmin && getFeatureEnabled(entitlementData?.featureMap, "cms_pages", false);
  const advancedEditingEnabled = cmsEnabled && getFeatureEnabled(entitlementData?.featureMap, "advanced_page_builder", false);
  const backupEnabled = isAdmin && getFeatureEnabled(entitlementData?.featureMap, "backup_import", false);
  const mediaEnabled = isAdmin && getFeatureEnabled(entitlementData?.featureMap, "media_library", false);

  const navSections = getAdminNavigationSections({
    activeStoreId,
    cmsEnabled,
    advancedEditingEnabled,
    backupEnabled,
    mediaEnabled,
    isAdmin,
    isOwner,
    isPlatformAdmin,
    compact,
    unreadCount,
    pendingReviewsCount,
    supportUrl,
    supportIsExternal,
  });

  const mainSections = navSections.filter((section) => section.key !== "help");
  const helpSection = navSections.find((section) => section.key === "help");

  const renderNavigationLink = (link: AdminNavigationItem) => {
    const active = link.external
      ? false
      : (link.match ?? [link.to]).some((match) => isRouteActive(location.pathname, match.split("?")[0] || match));

    if (link.external) {
      return (
        <a
          href={link.to}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <link.icon className="h-4 w-4 shrink-0" />
          <span>{link.label}</span>
        </a>
      );
    }

    return (
      <Link
        to={link.to}
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 font-semibold text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        <link.icon className="h-4 w-4 shrink-0" />
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
    <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link to="/" className="font-heading text-lg font-bold text-foreground">
          Store<span className="text-primary">Admin</span>
        </Link>
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {isOwner ? "Owner" : isAdmin ? "Admin" : "Staff"}
        </span>
      </div>

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto p-4">
        <div className="space-y-5">
          {mainSections.map((section) => (
            <section key={section.key} aria-label={section.title} className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {section.title}
              </p>
              {section.links.map((link) => (
                <div key={link.to}>{renderNavigationLink(link)}</div>
              ))}
            </section>
          ))}
        </div>

        {helpSection ? (
          <section aria-label={helpSection.title} className="mt-6 space-y-1.5 border-t border-border pt-3">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {helpSection.title}
            </p>
            {helpSection.links.map((link) => (
              <div key={link.to}>{renderNavigationLink(link)}</div>
            ))}
          </section>
        ) : null}
      </nav>

      <div className="space-y-2 border-t border-border p-4">
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        <ChangePasswordDialog />
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
