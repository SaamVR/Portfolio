import { useState, useEffect } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { Home, ShoppingBag, Heart, User, Store } from "lucide-react";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { cn } from "@/lib/utils";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems, setIsCartOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const currentStore = useOptionalStore();
  const wishlistCount = wishlistItems.length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const displayTotalItems = mounted ? totalItems : 0;
  const displayWishlistCount = mounted ? wishlistCount : 0;

  const links = [
    { to: storefrontPath("/", currentStore?.slug), icon: Home, label: "Home", exact: true },
    { to: storefrontPath("/shop", currentStore?.slug), icon: Store, label: "Shop", exact: false },
    { to: storefrontPath("/cart", currentStore?.slug), icon: ShoppingBag, label: "Cart", exact: false, badge: displayTotalItems },
    { to: storefrontPath("/wishlist", currentStore?.slug), icon: Heart, label: "Wishlist", exact: false, badge: displayWishlistCount },
    { to: storefrontPath("/account", currentStore?.slug), icon: User, label: "Account", exact: false },
  ];

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 glass-panel bg-background/92 supports-[backdrop-filter]:bg-background/70 pb-safe md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="safe-area-inset-bottom flex min-h-[72px] items-center justify-around px-3 py-2">
        {links.map(({ to, icon: Icon, label, exact, badge }) => {
          const active = isActive(to, exact);
          const isCart = label === "Cart";
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
              <span className={cn("text-[11px] font-medium leading-none transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
              {active && <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />}
            </>
          );

          if (isCart) {
            return (
              <button
                key={to}
                onClick={() => setIsCartOpen(true)}
                className={cn("relative flex min-h-14 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}
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
              className={cn("relative flex min-h-14 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}
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
