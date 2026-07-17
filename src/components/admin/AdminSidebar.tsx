import type { ComponentType } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Package,
  Settings,
  PanelsTopLeft,
  SquarePen,
  SlidersHorizontal,
  Globe,
  KeyRound,
  LogOut,
  ArrowLeft,
  Rocket,
  WandSparkles,
  Users,
  ShoppingCart,
  Mail,
  Tag,
  MessageSquare,
  FolderTree,
  Images,
  HardDriveDownload,
  Shield,
  CreditCard,
  HelpCircle,
  ExternalLink,
  FilePlus2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";
import { getSupportUrl, isExternalSupportUrl } from "@/lib/platform/support";
import { absoluteStoreUrl } from "@/lib/siteUrl";

type SidebarLink = {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  show: boolean;
  badge?: number;
  external?: boolean;
  match?: string[];
};

type StorePageNavRow = {
  id: string;
  title: string;
  slug: string;
  is_homepage: boolean | null;
};

type ActiveStoreMeta = {
  slug: string;
  custom_domain?: string | null;
};

function inferPagePlacement(page: StorePageNavRow) {
  if (page.is_homepage || page.slug === "/") return "Homepage / main navigation";
  if (page.slug.includes("faq")) return "Footer / help links";
  if (page.slug.includes("about")) return "Footer / brand links";
  if (page.slug.includes("policy") || page.slug.includes("return") || page.slug.includes("contact")) return "Footer / support links";
  if (page.slug.includes("product")) return "Product journey";
  return "Custom page";
}

const AdminSidebar = () => {
  const { role, platformRole, user, signOut , activeStoreId} = useAuth();
  const location = useLocation();
  const isAdmin = role === "admin";
  const isPlatformAdmin = platformRole === "admin";
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const supportUrl = getSupportUrl();
  const supportIsExternal = isExternalSupportUrl(supportUrl);

  // Fetch unread message count
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

  // Fetch pending reviews count
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

  const cmsEnabled = isAdmin && getFeatureEnabled(entitlementData?.featureMap, "cms_pages", false);
  const { data: storePages = [] } = useQuery({
    queryKey: ["sidebar-store-pages", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return [] as StorePageNavRow[];
      const { data, error } = await supabase
        .from("store_pages")
        .select("id, title, slug, is_homepage")
        .eq("store_id", activeStoreId as string)
        .order("is_homepage", { ascending: false })
        .order("slug");
      if (error) throw error;
      return (data ?? []) as StorePageNavRow[];
    },
    enabled: Boolean(activeStoreId) && cmsEnabled,
  });
  const { data: activeStoreMeta } = useQuery({
    queryKey: ["sidebar-active-store-meta", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null as ActiveStoreMeta | null;
      const { data, error } = await supabase
        .from("stores")
        .select("slug, custom_domain")
        .eq("id", activeStoreId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as ActiveStoreMeta | null) ?? null;
    },
    enabled: Boolean(activeStoreId) && cmsEnabled,
  });
  const navSections: Array<{ title: string; links: SidebarLink[] }> = [
    {
      title: "Operations",
      links: [
        { to: "/admin", icon: LayoutDashboard, label: "Dashboard", show: true },
        { to: "/admin/products", icon: Package, label: "Products", show: true },
        { to: "/admin/orders", icon: ShoppingCart, label: "Orders", show: true },
        { to: "/admin/messages", icon: Mail, label: "Messages", show: true, badge: unreadCount },
        { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", show: true, badge: pendingReviewsCount },
        { to: "/admin/coupons", icon: Tag, label: "Coupons", show: true },
        { to: "/admin/categories", icon: FolderTree, label: "Categories & Types", show: isAdmin },
      ],
    },
    {
      title: "Storefront",
      links: [
        { to: withStoreId("/admin/site-settings", activeStoreId), icon: Rocket, label: "Store Settings", show: isAdmin },
        { to: "/admin/onboarding", icon: WandSparkles, label: "Onboarding", show: isAdmin },
        { to: buildPageBuilderPath("basic"), icon: SquarePen, label: "Basic Editing", show: cmsEnabled, match: ["/admin/page-builder", "/admin/page-builder/basic"] },
        { to: buildPageBuilderPath("advanced"), icon: SlidersHorizontal, label: "Advanced Editing", show: cmsEnabled, match: ["/admin/page-builder/advanced"] },
        { to: "/admin/media", icon: Images, label: "Media Library", show: isAdmin && getFeatureEnabled(entitlementData?.featureMap, "media_library", false) },
        { to: "/admin/backup", icon: HardDriveDownload, label: "Backup & Import", show: isAdmin && getFeatureEnabled(entitlementData?.featureMap, "backup_import", false) },
        { to: withStoreId("/admin/site-settings?tab=domain", activeStoreId), icon: Globe, label: "Domains", show: isAdmin, match: ["/admin/site-settings"] },
        { to: "/admin/site-settings", icon: Settings, label: "Site Settings", show: isAdmin },
      ],
    },
    {
      title: "Admin",
      links: [
        { to: "/admin/invite-codes", icon: KeyRound, label: "Invite Codes", show: isAdmin },
        { to: "/admin/billing", icon: CreditCard, label: "Billing & Plan", show: isAdmin },
        { to: "/admin/users", icon: Users, label: "Users", show: isAdmin },
        { to: "/cms-admin", icon: Shield, label: "CMS Admin", show: isPlatformAdmin },
        { to: supportUrl, icon: HelpCircle, label: "Help & Support", show: true, external: supportIsExternal },
      ],
    },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link to="/" className="font-heading text-lg font-bold text-foreground">
          Store<span className="text-primary">Admin</span>
        </Link>
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {isAdmin ? "Owner" : "Staff"}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-5 p-4">
        {navSections.map((section) => {
          const visibleLinks = section.links.filter((link) => link.show);
          if (visibleLinks.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {section.title}
              </p>
              {visibleLinks.map((link) => {
                const active = link.external
                  ? false
                  : (link.match ?? [link.to]).some((match) => location.pathname === match || location.pathname.startsWith(`${match}/`));

                return (
                  <div key={link.to}>
                    {link.external ? (
                      <a
                        href={link.to}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                        {link.badge !== undefined && link.badge > 0 && (
                          <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {link.badge > 99 ? "99+" : link.badge}
                          </span>
                        )}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {cmsEnabled ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 px-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Store Pages
              </p>
              <Link
                to={buildPageBuilderPath("advanced", { storeId: activeStoreId })}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                New Page
              </Link>
            </div>
            {storePages.length > 0 ? storePages.map((page) => (
              <div key={page.id} className="rounded-lg border border-border/70 bg-background/50 px-3 py-2">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{page.title}</p>
                      {page.is_homepage ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Home</span> : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{page.slug}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{inferPagePlacement(page)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        to={buildPageBuilderPath("basic", { storeId: activeStoreId, pageId: page.id })}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      {activeStoreMeta?.slug ? (
                        <a
                          href={absoluteStoreUrl(
                            { slug: activeStoreMeta.slug, customDomain: activeStoreMeta.custom_domain ?? null },
                            page.is_homepage || page.slug === "/" ? "/" : page.slug,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Visit
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                No pages found yet. Open Advanced Editing to create your first custom page.
              </div>
            )}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-border p-4 space-y-2">
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






