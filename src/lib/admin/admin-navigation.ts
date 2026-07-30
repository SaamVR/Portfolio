import type { ComponentType } from "react";
import {
  BarChart2,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Package,
  Rocket,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { withStoreId } from "@/lib/admin-paths";



export type AdminNavigationSection = "primary" | "secondary";

export type AdminNavigationItem = {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  section: AdminNavigationSection | "daily_operations" | "growth" | "storefront" | "platform_settings";
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

export const adminNavigationSectionLabels: Record<string, string> = {
  primary: "Main Menu",
  secondary: "Preferences",
  daily_operations: "Daily operations",
  growth: "Growth",
  storefront: "Storefront",
  platform_settings: "Platform settings",
};

export function getAdminNavigationItems(context: AdminNavigationContext): AdminNavigationItem[] {
  const compact = context.compact === true;
  const totalInboxBadge = (context.unreadCount ?? 0) + (context.pendingReviewsCount ?? 0);

  return [
    {
      to: "/admin",
      icon: LayoutDashboard,
      label: "Dashboard",
      section: "primary",
      show: true,
      match: ["/admin", "/admin/launch", "/admin/notifications", "/admin/diagnostics"],
      description: "Overview of sales stats, launch readiness, and critical store alerts.",
      mobileShortLabel: "Home",
    },
    {
      to: "/admin/orders",
      icon: ShoppingCart,
      label: "Orders",
      section: "primary",
      show: !compact,
      match: ["/admin/orders", "/admin/returns", "/admin/couriers"],
      description: "Fulfillment, orders list, returns & COD, and shipping couriers.",
      mobileShortLabel: "Orders",
    },
    {
      to: "/admin/products",
      icon: Package,
      label: "Products",
      section: "primary",
      show: !compact,
      match: ["/admin/products", "/admin/categories"],
      description: "Product inventory catalog, stock, and category management.",
      mobileShortLabel: "Products",
    },
    {
      to: "/admin/customers",
      icon: Users,
      label: "Customers & Messages",
      section: "primary",
      show: !compact,
      badge: totalInboxBadge,
      match: ["/admin/customers", "/admin/messages", "/admin/reviews"],
      description: "Central inbox for customer inquiries, reviews, and trust signals.",
      mobileShortLabel: "Inbox",
    },
    {
      to: "/admin/marketing",
      icon: Rocket,
      label: "Marketing",
      section: "primary",
      show: !compact,
      match: ["/admin/marketing", "/admin/coupons", "/admin/recovery", "/admin/qr"],
      description: "Growth tools: coupons, abandoned cart recovery, and QR codes.",
      mobileShortLabel: "Growth",
    },
    {
      to: "/admin/online-store",
      icon: Store,
      label: "Online Store",
      section: "primary",
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
      description: "Customize design, pick themes, manage pages, blog, and media in one place.",
      mobileShortLabel: "Website",
    },
    {
      to: "/admin/analytics",
      icon: BarChart2,
      label: "Analytics",
      section: "primary",
      show: !compact,
      match: ["/admin/analytics"],
      description: "Traffic, sales performance, product interest, and conversion funnel.",
      mobileShortLabel: "Stats",
    },
    {
      to: withStoreId("/admin/site-settings", context.activeStoreId),
      icon: Settings,
      label: "Settings",
      section: "secondary",
      show: context.isAdmin,
      match: [
        "/admin/site-settings",
        "/admin/billing",
        "/admin/users",
        "/admin/backup",
        "/admin/invite-codes",
        "/cms-admin",
      ],
      description: "Store profile, payments, custom domains, users, and backup.",
      mobileShortLabel: "Settings",
    },
    {
      to: "/admin/billing",
      icon: CreditCard,
      label: "Billing & Plans",
      section: "secondary",
      show: context.isOwner,
      match: ["/admin/billing"],
      description: "Subscription plan, usage limits, and payment method.",
      mobileShortLabel: "Billing",
    },
    {
      to: context.supportUrl,
      icon: HelpCircle,
      label: "Help & Support",
      section: "secondary",
      show: true,
      external: context.supportIsExternal,
      description: "Platform documentation and support helpline.",
      mobileShortLabel: "Help",
    },
  ];
}

export function getAdminNavigationSections(context: AdminNavigationContext) {
  const items = getAdminNavigationItems(context);

  return [
    {
      key: "primary" as const,
      title: "Main Menu",
      links: items.filter((item) => item.section === "primary" && item.show),
    },
    {
      key: "secondary" as const,
      title: "Preferences",
      links: items.filter((item) => item.section === "secondary" && item.show),
    },
  ];
}
