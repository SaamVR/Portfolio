import { useEffect, useState } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { CalendarDays, Heart, Home, MessageCircle, ShoppingBag, Store, User } from "lucide-react";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { cn } from "@/lib/utils";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { resolveStorefrontNavigationExperience } from "@/lib/cms/storefront-navigation-experience";

interface NavigationSettings {
  shop_label?: string;
  show_account?: boolean;
  show_wishlist?: boolean;
  show_cart?: boolean;
}

interface WhatsAppSettings {
  enabled?: boolean;
  number?: string;
  message?: string;
}

type BottomNavLink = {
  to: string;
  icon: typeof Home;
  label: string;
  exact: boolean;
  badge?: number;
  kind?: "cart" | "external";
  primary?: boolean;
};

const contactActionTemplates = new Set(["inquiry-catalog", "service", "booking", "hotel", "real-estate", "landing"]);
const cartActionTemplates = new Set(["food", "subscriptions", "single-product"]);

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems, setIsCartOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const currentStore = useOptionalStore();
  const { data: navigation } = useSiteSettings<NavigationSettings>("navigation", currentStore?.id);
  const preloadedWhatsApp = currentStore?.siteSettings?.whatsapp_support as WhatsAppSettings | undefined;
  const { data: fetchedWhatsApp } = useSiteSettings<WhatsAppSettings>("whatsapp_support", currentStore?.id);
  const whatsapp = fetchedWhatsApp ?? preloadedWhatsApp;
  const wishlistCount = wishlistItems.length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayTotalItems = mounted ? totalItems : 0;
  const displayWishlistCount = mounted ? wishlistCount : 0;
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore?.siteSettings?.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const experience = resolveStorefrontNavigationExperience(storefrontProfile);
  const catalogLabel = navigation?.shop_label?.trim() || experience.catalogLabel;
  const showAccount = navigation?.show_account ?? true;
  const showWishlist = navigation?.show_wishlist ?? experience.showWishlistByDefault;
  const showCart = navigation?.show_cart ?? experience.showCartByDefault;
  const templateId = experience.templateId;
  const contactAction = contactActionTemplates.has(templateId);
  const cartPrimaryAction = cartActionTemplates.has(templateId);
  const digitalPrimaryAction = templateId === "digital-downloads";

  const whatsappHref = whatsapp?.enabled && whatsapp.number
    ? `https://wa.me/${whatsapp.number.replace(/\D/g, "")}?text=${encodeURIComponent(whatsapp.message || "Hi! I would like more information.")}`
    : null;
  const contactHref = storefrontPath("/contact", currentStore?.slug);
  const catalogHref = storefrontPath("/shop", currentStore?.slug);

  const links: BottomNavLink[] = [
    { to: storefrontPath("/", currentStore?.slug), icon: Home, label: experience.homeLabel, exact: true },
    ...(experience.showCatalog
      ? [{
          to: catalogHref,
          icon: Store,
          label: digitalPrimaryAction ? experience.primaryActionLabel : catalogLabel,
          exact: false,
          primary: digitalPrimaryAction,
        }]
      : []),
    ...(contactAction
      ? [{
          to: whatsappHref || contactHref,
          icon: templateId === "booking" || templateId === "hotel" ? CalendarDays : MessageCircle,
          label: experience.primaryActionLabel,
          exact: false,
          kind: whatsappHref ? "external" as const : undefined,
          primary: true,
        }]
      : showCart
        ? [{
            to: storefrontPath("/cart", currentStore?.slug),
            icon: ShoppingBag,
            label: cartPrimaryAction ? experience.primaryActionLabel : experience.cartLabel,
            exact: false,
            badge: displayTotalItems,
            kind: "cart" as const,
            primary: cartPrimaryAction,
          }]
        : []),
    ...(!contactAction && showWishlist
      ? [{
          to: storefrontPath("/wishlist", currentStore?.slug),
          icon: Heart,
          label: experience.wishlistLabel,
          exact: false,
          badge: displayWishlistCount,
        }]
      : []),
    ...(!experience.showCatalog && !contactAction && !showCart
      ? [{ to: contactHref, icon: MessageCircle, label: experience.primaryActionLabel, exact: false, primary: true }]
      : []),
    ...(showAccount ? [{ to: storefrontPath("/account", currentStore?.slug), icon: User, label: experience.accountLabel, exact: false }] : []),
  ].slice(0, 5);

  const isActive = (to: string, exact: boolean) => exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 glass-panel bg-background/92 pb-safe supports-[backdrop-filter]:bg-background/70 md:hidden" aria-label="Mobile navigation">
      <div className="safe-area-inset-bottom flex min-h-[72px] items-center justify-around gap-1 px-2 py-2">
        {links.map(({ to, icon: Icon, label, exact, badge, kind, primary }) => {
          const active = kind === "external" ? false : isActive(to, exact);
          const innerContent = (
            <>
              <div className="relative">
                <Icon className={cn("h-[1.35rem] w-[1.35rem] transition-all duration-200", active && "scale-110")} />
                {badge !== undefined && badge > 0 ? (
                  <span className={cn("absolute -right-2.5 -top-2.5 flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none", primary ? "bg-background text-foreground" : "bg-primary text-primary-foreground")}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </div>
              <span className={cn("max-w-[76px] truncate text-[10px] font-semibold leading-none transition-all duration-200 sm:text-[11px]", primary ? "text-primary-foreground" : active ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
              {active && !primary ? <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" /> : null}
            </>
          );
          const itemClass = cn(
            "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 transition-all duration-200",
            primary ? "bg-primary text-primary-foreground shadow-sm" : active ? "text-primary" : "text-muted-foreground",
          );

          if (kind === "cart") {
            return <button key={`${kind}-${to}`} onClick={() => setIsCartOpen(true)} className={itemClass} aria-label={label}>{innerContent}</button>;
          }

          if (kind === "external") {
            return <a key={to} href={to} target="_blank" rel="noopener noreferrer" className={itemClass} aria-label={label}>{innerContent}</a>;
          }

          return <Link key={`${to}-${label}`} to={to} className={itemClass} aria-label={label} aria-current={active ? "page" : undefined}>{innerContent}</Link>;
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
