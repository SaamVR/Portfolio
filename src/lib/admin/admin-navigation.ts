import type { ComponentType } from "react";
import {
  BellRing,
  CreditCard,
  FolderTree,
  Globe,
  HardDriveDownload,
  HeartPulse,
  HelpCircle,
  Images,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  LineChart,
  Mail,
  MessageSquare,
  NotebookPen,
  Package,
  QrCode,
  Rocket,
  Settings,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  SquarePen,
  Store,
  Tag,
  Truck,
  Undo2,
  Users,
  WandSparkles,
} from "lucide-react";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";

export type AdminNavigationItem = {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  section: "daily_operations" | "growth" | "storefront" | "platform_settings";
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

export const adminNavigationSectionLabels: Record<AdminNavigationItem["section"], string> = {
  daily_operations: "Daily operations",
  growth: "Growth",
  storefront: "Storefront",
  platform_settings: "Platform settings",
};

export function getAdminNavigationItems(context: AdminNavigationContext): AdminNavigationItem[] {
  const compact = context.compact === true;

  return [
    {
      to: "/admin",
      icon: LayoutDashboard,
      label: "Dashboard",
      section: "daily_operations",
      show: true,
      description: "Overview of orders, launch tasks, and current store activity.",
      mobileShortLabel: "Home",
    },
    {
      to: "/admin/orders",
      icon: ShoppingCart,
      label: "Orders",
      section: "daily_operations",
      show: !compact,
      description: "Fulfillment, booking, returns, and customer purchases.",
    },
    {
      to: "/admin/returns",
      icon: CreditCard,
      label: "Returns & COD",
      section: "daily_operations",
      show: context.isAdmin && !compact,
      description: "Handle returns, refunds, COD remittance, and courier settlement.",
    },
    {
      to: "/admin/notifications",
      icon: BellRing,
      label: "Notifications",
      section: "daily_operations",
      show: context.isAdmin && !compact,
      description: "Delivery health, retries, and merchant alerts.",
    },
    {
      to: "/admin/messages",
      icon: Mail,
      label: "Messages",
      section: "daily_operations",
      show: !compact,
      badge: context.unreadCount ?? 0,
      description: "Customer inbox and inquiry follow-up.",
    },
    {
      to: "/admin/reviews",
      icon: MessageSquare,
      label: "Reviews",
      section: "daily_operations",
      show: !compact,
      badge: context.pendingReviewsCount ?? 0,
      description: "Moderate product reviews and trust signals.",
    },
    {
      to: "/admin/recovery",
      icon: Undo2,
      label: "Cart Recovery",
      section: "daily_operations",
      show: context.isAdmin && !compact,
      description: "Recovery queue, automation, and outreach safety.",
    },
    {
      to: "/admin/couriers",
      icon: Truck,
      label: "Couriers",
      section: "daily_operations",
      show: context.isAdmin && !compact,
      description: "Connections, zones, booking, and shipments.",
    },
    {
      to: "/admin/launch",
      icon: Rocket,
      label: "Launch Readiness",
      section: "growth",
      show: context.isAdmin && !compact,
      description: "Go-live blockers, warnings, and next actions.",
      mobileShortLabel: "Launch",
    },
    {
      to: "/admin/diagnostics",
      icon: HeartPulse,
      label: "Diagnostics",
      section: "growth",
      show: context.isAdmin && !compact,
      description: "Domain, payment, billing, and operator health.",
    },
    {
      to: "/admin/analytics",
      icon: LineChart,
      label: "Analytics",
      section: "growth",
      show: !compact,
      description: "Traffic, search intent, funnel, privacy, and anomaly signals.",
      mobileShortLabel: "Analytics",
    },
    {
      to: "/admin/coupons",
      icon: Tag,
      label: "Coupons",
      section: "growth",
      show: !compact,
      description: "Discounts, incentives, and recovery offers.",
    },
    {
      to: "/admin/blog",
      icon: NotebookPen,
      label: "Blog",
      section: "growth",
      show: context.isAdmin && !compact,
      description: "Content marketing and SEO posts.",
    },
    {
      to: "/admin/qr",
      icon: QrCode,
      label: "QR Codes",
      section: "growth",
      show: context.isAdmin && !compact,
      description: "Scannable product, page, and promo links.",
    },
    {
      to: "/admin/products",
      icon: Package,
      label: "Products",
      section: "storefront",
      show: !compact,
      description: "Catalog, stock, and merchandising.",
      mobileShortLabel: "Catalog",
    },
    {
      to: "/admin/categories",
      icon: FolderTree,
      label: "Categories & Types",
      section: "storefront",
      show: context.isAdmin && !compact,
      description: "Navigation and collection structure.",
    },
    {
      to: "/admin/onboarding",
      icon: WandSparkles,
      label: "Guided Setup",
      section: "storefront",
      show: context.isAdmin,
      description: "Merchant launch flow and setup guidance.",
      mobileShortLabel: "Setup",
    },
    {
      to: buildPageBuilderPath("basic", { storeId: context.activeStoreId }),
      icon: SquarePen,
      label: "Edit Storefront",
      section: "storefront",
      show: context.cmsEnabled,
      match: ["/admin/page-builder", "/admin/page-builder/basic"],
      description: "Safer content and storefront edits.",
      mobileShortLabel: "Edit",
    },
    {
      to: "/admin/templates",
      icon: LayoutTemplate,
      label: "Templates",
      section: "storefront",
      show: context.cmsEnabled,
      description: "Storefront layouts and starting points.",
    },
    {
      to: "/admin/media",
      icon: Images,
      label: "Media Library",
      section: "storefront",
      show: context.mediaEnabled && !compact,
      description: "Reusable image and visual assets.",
    },
    {
      to: withStoreId("/admin/site-settings", context.activeStoreId),
      icon: Store,
      label: "Store Profile",
      section: "storefront",
      show: context.isAdmin,
      match: ["/admin/site-settings"],
      description: "Brand basics, core business info, and shared storefront settings.",
    },
    {
      to: withStoreId("/admin/site-settings?tab=payment", context.activeStoreId),
      icon: CreditCard,
      label: "Payments & Checkout",
      section: "platform_settings",
      show: context.isOwner,
      match: ["/admin/site-settings"],
      description: "Payment setup, checkout controls, and secure connections.",
    },
    {
      to: withStoreId("/admin/site-settings?tab=domain", context.activeStoreId),
      icon: Globe,
      label: "Domains",
      section: "platform_settings",
      show: context.isOwner && !compact,
      match: ["/admin/site-settings"],
      description: "Platform URL, custom domains, and SSL status.",
    },
    {
      to: "/admin/site-settings",
      icon: Settings,
      label: "All Site Settings",
      section: "platform_settings",
      show: context.isAdmin && !compact,
      description: "Brand, delivery, support, and merchant-wide settings.",
      mobileShortLabel: "Settings",
    },
    {
      to: "/admin/billing",
      icon: CreditCard,
      label: "Billing & Plan",
      section: "platform_settings",
      show: context.isOwner && !compact,
      description: "Subscription, invoices, and operator review state.",
    },
    {
      to: "/admin/users",
      icon: Users,
      label: "Users",
      section: "platform_settings",
      show: context.isAdmin && !compact,
      description: "Staff access and store roles.",
    },
    {
      to: buildPageBuilderPath("advanced", { storeId: context.activeStoreId }),
      icon: SlidersHorizontal,
      label: "Expert Editing",
      section: "platform_settings",
      show: context.advancedEditingEnabled && !compact,
      match: ["/admin/page-builder/advanced"],
      description: "Full page structure and deeper editing controls.",
      mobileShortLabel: "Expert",
    },
    {
      to: "/admin/backup",
      icon: HardDriveDownload,
      label: "Backup & Import",
      section: "platform_settings",
      show: context.backupEnabled && !compact,
      description: "Export, restore, and operational recovery.",
    },
    {
      to: "/admin/invite-codes",
      icon: KeyRound,
      label: "Invite Codes",
      section: "platform_settings",
      show: context.isOwner && !compact,
      description: "Owner-only team onboarding codes.",
    },
    {
      to: "/cms-admin",
      icon: Shield,
      label: "CMS Admin",
      section: "platform_settings",
      show: context.isPlatformAdmin && !compact,
      description: "Platform-wide CMS controls.",
    },
    {
      to: context.supportUrl,
      icon: HelpCircle,
      label: "Help & Support",
      section: "platform_settings",
      show: true,
      external: context.supportIsExternal,
      description: "Support and platform help.",
    },
  ];
}

export function getAdminNavigationSections(context: AdminNavigationContext) {
  const items = getAdminNavigationItems(context);

  return (Object.keys(adminNavigationSectionLabels) as Array<AdminNavigationItem["section"]>).map((sectionKey) => ({
    key: sectionKey,
    title: adminNavigationSectionLabels[sectionKey],
    links: items.filter((item) => item.section === sectionKey && item.show),
  }));
}

export function getAdminWorkspaceChips(context: AdminNavigationContext) {
  return getAdminNavigationItems(context)
    .filter((item) => item.show && ["daily_operations", "growth", "storefront"].includes(item.section))
    .filter((item) =>
      item.to === "/admin"
      || item.to === "/admin/launch"
      || item.to === "/admin/analytics"
      || item.to === withStoreId("/admin/site-settings", context.activeStoreId)
      || item.to === "/admin/onboarding"
      || item.to === buildPageBuilderPath("basic", { storeId: context.activeStoreId })
      || item.to === buildPageBuilderPath("advanced", { storeId: context.activeStoreId })
      || item.to === "/admin/products"
      || item.to === "/admin/orders",
    );
}
