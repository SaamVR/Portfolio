import type { ComponentType } from "react";
import {
  BarChart2,
  BookOpen,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Package,
  PanelsTopLeft,
  Rocket,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";

export type AdminNavigationSection = "operate" | "grow" | "build" | "manage" | "help" | "contextual";

export type AdminNavigationItem = {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  section: AdminNavigationSection;
  show: boolean;
  badge?: number;
  external?: boolean;
  match?: string[];
  description?: string;
  mobileShortLabel?: string;
};

export type AdminNavigationContext = {
  activeStoreId?: string | null;
  cmsEnabled: boolean;
  advancedEditingEnabled: boolean;
  backupEnabled: boolean;
  mediaEnabled: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isPlatformAdmin: boolean;
  compact?: boolean;
  unreadCount?: number;
  pendingReviewsCount?: number;
  supportUrl: string;
  supportIsExternal: boolean;
};

export const adminNavigationSectionLabels: Record<AdminNavigationSection, string> = {
  operate: "Operate",
  grow: "Grow",
  build: "Build",
  manage: "Manage",
  help: "Help",
  contextual: "More tools",
};

export function getAdminNavigationItems(context: AdminNavigationContext): AdminNavigationItem[] {
  const compact = context.compact === true;
  const totalInboxBadge = (context.unreadCount ?? 0) + (context.pendingReviewsCount ?? 0);

  return [
    {
      to: "/admin",
      icon: LayoutDashboard,
      label: "Dashboard",
      section: "operate",
      show: true,
      match: ["/admin", "/admin/launch", "/admin/notifications", "/admin/diagnostics"],
      description: "Overview of sales stats, launch readiness, and critical store alerts.",
      mobileShortLabel: "Home",
    },
    {
      to: "/admin/orders",
      icon: ShoppingCart,
      label: "Orders",
      section: "operate",
      show: !compact,
      match: ["/admin/orders", "/admin/returns", "/admin/couriers"],
      description: "Fulfillment, orders list, returns & COD, and shipping couriers.",
      mobileShortLabel: "Orders",
    },
    {
      to: "/admin/products",
      icon: Package,
      label: "Products",
      section: "operate",
      show: !compact,
      match: ["/admin/products", "/admin/categories"],
      description: "Product inventory catalog, stock, and category management.",
      mobileShortLabel: "Products",
    },
    {
      to: "/admin/customers",
      icon: Users,
      label: "Customers",
      section: "operate",
      show: !compact,
      badge: totalInboxBadge,
      match: ["/admin/customers", "/admin/messages", "/admin/reviews"],
      description: "Customer records, inquiries, reviews, and trust signals.",
      mobileShortLabel: "Inbox",
    },
    {
      to: "/admin/marketing",
      icon: Rocket,
      label: "Marketing",
      section: "grow",
      show: !compact,
      match: ["/admin/marketing", "/admin/coupons", "/admin/recovery", "/admin/qr"],
      description: "Growth tools: coupons, abandoned cart recovery, and QR codes.",
      mobileShortLabel: "Growth",
    },
    {
      to: "/admin/analytics",
      icon: BarChart2,
      label: "Analytics",
      section: "grow",
      show: !compact,
      match: ["/admin/analytics", "/admin/blog-performance"],
      description: "Traffic, sales performance, product interest, and conversion funnel.",
      mobileShortLabel: "Stats",
    },
    {
      to: "/admin/online-store",
      icon: Store,
      label: "Online Store",
      section: "build",
      show: context.cmsEnabled,
      match: [
        "/admin/online-store",
        "/admin/page-builder",
        "/admin/page-builder/basic",
        "/admin/page-builder/advanced",
        "/admin/templates",
        "/admin/media",
        "/admin/blog",
        "/admin/onboarding",
      ],
      description: "Customize design, pick themes, manage pages, publish articles, and organize storefront media.",
      mobileShortLabel: "Website",
    },
    {
      to: withStoreId("/admin/site-settings", context.activeStoreId),
      icon: Settings,
      label: "Settings",
      section: "manage",
      show: context.isAdmin,
      match: [
        "/admin/site-settings",
        "/admin/billing",
        "/admin/users",
        "/admin/backup",
        "/admin/invite-codes",
        "/cms-admin",
      ],
      description: "Store profile, payments, custom domains, billing, users, and backup.",
      mobileShortLabel: "Settings",
    },
    {
      to: "/admin/guide",
      icon: HelpCircle,
      label: "How-To Guide",
      section: "help",
      show: true,
      match: ["/admin/guide", "/admin/help", "/admin/how-to"],
      description: "Step-by-step guidance on creating and managing your storefront.",
      mobileShortLabel: "Guide",
    },
    {
      to: context.supportUrl,
      icon: HelpCircle,
      label: "Help & Support",
      section: "help",
      show: true,
      external: context.supportIsExternal,
      description: "Platform documentation and support helpline.",
      mobileShortLabel: "Help",
    },
    {
      to: "/admin/blog",
      icon: BookOpen,
      label: "Blog",
      section: "contextual",
      show: context.cmsEnabled && !compact,
      match: ["/admin/blog"],
      description: "Publish SEO articles, buying guides, product stories, and shoppable content.",
      mobileShortLabel: "Blog",
    },
    {
      to: "/admin/blog-performance",
      icon: BarChart2,
      label: "Blog Performance",
      section: "contextual",
      show: context.cmsEnabled && !compact,
      match: ["/admin/blog-performance"],
      description: "See article readership, product clicks, carts, attributed orders, and blog-driven revenue.",
      mobileShortLabel: "Blog Stats",
    },
    {
      to: buildPageBuilderPath("basic", { storeId: context.activeStoreId }),
      icon: PanelsTopLeft,
      label: "Website editor",
      section: "contextual",
      show: context.cmsEnabled && !compact,
      match: ["/admin/page-builder/basic", "/admin/page-builder"],
      description: "Jump directly into the guided storefront editor.",
      mobileShortLabel: "Website",
    },
    {
      to: withStoreId("/admin/onboarding", context.activeStoreId),
      icon: Sparkles,
      label: "Onboarding",
      section: "contextual",
      show: context.cmsEnabled,
      match: ["/admin/onboarding"],
      description: "Reopen the guided setup flow for homepage sections, brand content, payments, and launch steps.",
      mobileShortLabel: "Setup",
    },
    {
      to: "/admin/billing",
      icon: CreditCard,
      label: "Billing & Plans",
      section: "contextual",
      show: context.isOwner,
      match: ["/admin/billing"],
      description: "Subscription plan, usage limits, and payment method.",
      mobileShortLabel: "Billing",
    },
  ];
}

export function getAdminNavigationSections(context: AdminNavigationContext) {
  const items = getAdminNavigationItems(context);
  const sectionOrder: Exclude<AdminNavigationSection, "contextual">[] = ["operate", "grow", "build", "manage", "help"];

  return sectionOrder
    .map((key) => ({
      key,
      title: adminNavigationSectionLabels[key],
      links: items.filter((item) => item.section === key && item.show),
    }))
    .filter((section) => section.links.length > 0);
}
