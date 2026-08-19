import { useState, useEffect } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { Home, ShoppingBag, Heart, User, Store, MessageCircle } from "lucide-react";
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

type BottomNavLink = {
  to: string;
  icon: typeof Home;
  label: string;
  exact: boolean;
  badge?: number;
  kind?: "cart";
};

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems, setIsCartOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const currentStore = useOptionalStore();
  const { data: navigation } = useSiteSettings<NavigationSettings>("navigation", currentStore?.id);
  const wishlistCount = wishlistItems.length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const links: BottomNavLink[] = [
    { to: storefrontPath("/", currentStore?.slug), icon: Home, label: experience.homeLabel, exact: true },
    ...(experience.showCatalog
      ? [{ to: storefrontPath("/shop", currentStore?.slug), icon: Store, label: catalogLabel, exact: false }]
      : []),
    ...(showCart
      ? [{
          to: storefrontPath("/cart", currentStore?.slug),
          icon: ShoppingBag,
          label: experience.cartLabel,
          exact: false,
          badge: displayTotalItems,
          kind: "cart" as const,
        }]
      : []),
    ...(showWishlist
      ? [{
          to: storefrontPath("/wishlist", currentStore?.slug),
          icon: Heart,
          label: experience.wishlistLabel,
          exact: false,
          badge: displayWishlistCount,
        }]
      : []),
    ...(!experience.showCatalog && !showCart
      ? [{
          to: storefrontPath("/contact", currentStore?.slug),
          icon: MessageCircle,
          label: experience.primaryActionLabel,
          exact: false,
        }]
      : []),
    ...(showAccount
      ? [{ to: storefrontPath("/account", currentStore?.slug), icon: User, label: experience.accountLabel, exact: false }]
      : []),
  ];

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 glass-panel bg-background/92 supports-[backdrop-filter]:bg-background/70 pb-safe md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="safe-area-inset-bottom flex min-h-[72px] items-center justify-around px-3 py-2">
        {links.map(({ to, icon: Icon, label, exact, badge, kind }) => {
          const active = isActive(to, exact);
          const innerContent = (
            <>
              <div className="relative">
                <Icon className={cn("h-[1.35rem] w-[1.35rem] transition-all duration-200", active && "scale-110")} />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -right-2.5 -top-2.5 flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className={cn("max-w-[72px] truncate text-[11px] font-medium leading-none transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
              {active && <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />}
            </>
          );

          if (kind === "cart") {
            return (
              <button
                key={`${kind}-${to}`}
                onClick={() => setIsCartOpen(true)}
                className={cn("relative flex min-h-14 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}
                aria-label={label}
              >
                {innerContent}
              </button>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              className={cn("relative flex min-h-14 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {innerContent}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
