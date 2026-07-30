"use client";

import React, { useEffect } from "react";
import { useNavigate } from "@/lib/react-router-dom-shim";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Mail,
  MessageSquare,
  Tag,
  FolderTree,
  PanelsTopLeft,
  SquarePen,
  SlidersHorizontal,
  Settings,
  KeyRound,
  Users,
  Palette,
  CreditCard,
  Truck,
  HelpCircle,
  Info,
  Gift,
  Compass,
  Plus,
  Flame,
  MousePointerClick,
  Eye,
  Megaphone,
  Rocket,
  Images,
  HardDriveDownload,
  Shield,
  WandSparkles,
  LineChart,
  BellRing,
  HeartPulse,
  NotebookPen,
  QrCode,
  Undo2,
  LayoutTemplate,
  Store,
} from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";
import { getAdminNavigationItems, adminNavigationSectionLabels } from "@/lib/admin/admin-navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

interface AdminCommandMenuProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function AdminCommandMenu({ open, setOpen }: AdminCommandMenuProps) {
  const navigate = useNavigate();
  const { platformRole, role, storeRole, activeStoreId } = useAuth();
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const isPlatformAdmin = platformRole === "admin";
  const isAdmin = role === "admin";
  const isOwner = storeRole === "owner" || isPlatformAdmin;
  const cmsEnabled = isAdmin && getFeatureEnabled(entitlementData?.featureMap, "cms_pages", false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const runCommand = (action: () => void) => {
    setOpen(false);
    action();
  };

  const navItems = getAdminNavigationItems({
    activeStoreId,
    cmsEnabled,
    advancedEditingEnabled: cmsEnabled,
    backupEnabled: isAdmin && getFeatureEnabled(entitlementData?.featureMap, "backup_import", false),
    mediaEnabled: isAdmin && getFeatureEnabled(entitlementData?.featureMap, "media_library", false),
    isAdmin,
    isOwner,
    isPlatformAdmin,
    supportUrl: "/contact",
    supportIsExternal: false,
  })
    .filter((item) => item.show && !item.external)
    .map((item) => ({
      label: item.label,
      icon: item.icon,
      category: adminNavigationSectionLabels[item.section],
      action: () => navigate(item.to),
    }));

  const sectorItems = [
    { label: "Brand & SEO (Global Store Settings)", icon: Compass, action: () => navigate("/admin/site-settings?tab=brand_seo") },
    { label: "Homepage Blocks & Layouts", icon: LayoutDashboard, action: () => navigate(buildPageBuilderPath("advanced", { storeId: activeStoreId })) },
    { label: "Hero Banner, Media & Overlay Blocks", icon: Flame, action: () => navigate(buildPageBuilderPath("advanced", { storeId: activeStoreId })) },
    { label: "Media Library Assets Browser", icon: Images, action: () => navigate("/admin/media") },
    { label: "Store Backup Export & Import Tools", icon: HardDriveDownload, action: () => navigate("/admin/backup") },
    { label: "Promo Banner & Conversion Blocks", icon: Megaphone, action: () => navigate(buildPageBuilderPath("advanced", { storeId: activeStoreId })) },
    { label: "Announcement Rotating Messages Bar", icon: Megaphone, action: () => navigate("/admin/site-settings?tab=announcement") },
    { label: "Theme Preset Palettes, Fonts & Border Style", icon: Palette, action: () => navigate("/admin/site-settings?tab=themes") },
    { label: "Exit-Intent Popups & Upsells Builder", icon: MousePointerClick, action: () => navigate("/admin/site-settings?tab=upsells") },
    { label: "Payment Methods Setup", icon: CreditCard, action: () => navigate("/admin/site-settings?tab=payment") },
    { label: "Delivery Fee Settings", icon: Truck, action: () => navigate("/admin/site-settings?tab=delivery") },
    { label: "WhatsApp Support Helpline Number", icon: HelpCircle, action: () => navigate("/admin/site-settings?tab=support") },
    { label: "About Page Content & Custom Text", icon: Info, action: () => navigate("/admin/site-settings?tab=about") },
    { label: "FAQ & Refund Policy Editor", icon: HelpCircle, action: () => navigate("/admin/site-settings?tab=faq") },
    { label: "Loyalty Points Rewards Rules", icon: Gift, action: () => navigate("/admin/site-settings?tab=loyalty") },
    { label: "Contact Form Email Setup", icon: Mail, action: () => navigate("/admin/site-settings?tab=contact") },
    { label: "Footer Links, Copywrite & Brand Text", icon: Settings, action: () => navigate("/admin/site-settings?tab=footer") },
    { label: "Storefront Editor: Pages, Blocks & Revisions", icon: PanelsTopLeft, action: () => navigate(buildPageBuilderPath("advanced", { storeId: activeStoreId })) },
    { label: "Legacy Homepage Fallback Fields", icon: PanelsTopLeft, action: () => navigate("/admin/site-settings?tab=home_sections") },
  ];

  const quickActions = [
    { label: "Add New Product Drop", icon: Plus, action: () => navigate("/admin/products?action=add") },
    { label: "Create Promo Coupon Code", icon: Plus, action: () => navigate("/admin/coupons?action=create") },
    { label: "View Unread Inquiries", icon: Eye, action: () => navigate("/admin/messages?filter=unread") },
    { label: "Review Pending Product Ratings", icon: Eye, action: () => navigate("/admin/reviews?filter=pending") },
    { label: "Open Guided Editing", icon: SquarePen, action: () => navigate(buildPageBuilderPath("basic", { storeId: activeStoreId })) },
    { label: "Open Expert Editing", icon: SlidersHorizontal, action: () => navigate(buildPageBuilderPath("advanced", { storeId: activeStoreId })) },
    { label: "Open Guided Setup", icon: WandSparkles, action: () => navigate("/admin/onboarding") },
    { label: "Open Launch Readiness", icon: Rocket, action: () => navigate("/admin/launch") },
    { label: "Open Notification Control Center", icon: BellRing, action: () => navigate("/admin/notifications") },
    { label: "Open Diagnostics", icon: HeartPulse, action: () => navigate("/admin/diagnostics") },
    { label: "Open Store Settings", icon: Rocket, action: () => navigate(withStoreId("/admin/site-settings", activeStoreId)) },
    { label: "Open Analytics Report", icon: LineChart, action: () => navigate("/admin/analytics") },
    { label: "Open Cart Recovery", icon: Undo2, action: () => navigate("/admin/recovery") },
    { label: "Open Blog Workspace", icon: NotebookPen, action: () => navigate("/admin/blog") },
    { label: "Open QR Generator", icon: QrCode, action: () => navigate("/admin/qr") },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search dashboard sectors, pages, actions... (e.g. payments, hero, orders)" />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>No matching dashboard sectors or actions found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          {quickActions.map((item, idx) => (
            <CommandItem
              key={idx}
              onSelect={() => runCommand(item.action)}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4 text-primary shrink-0" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Admin navigation">
          {navItems.map((item, idx) => (
            <CommandItem
              key={idx}
              onSelect={() => runCommand(item.action)}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Site Settings & Customization Sectors">
          {sectorItems.map((item, idx) => (
            <CommandItem
              key={idx}
              onSelect={() => runCommand(item.action)}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">Site Settings Sector</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

