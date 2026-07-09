import { useState, useEffect } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { Home, ShoppingBag, Heart, User, Store } from "lucide-react";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems, setIsCartOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const wishlistCount = wishlistItems.length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const displayTotalItems = mounted ? totalItems : 0;
  const displayWishlistCount = mounted ? wishlistCount : 0;

  const links = [
    { to: "/", icon: Home, label: "Home", exact: true },
    { to: "/shop", icon: Store, label: "Shop", exact: false },
    { to: "/cart", icon: ShoppingBag, label: "Cart", exact: false, badge: displayTotalItems },
    { to: "/wishlist", icon: Heart, label: "Wishlist", exact: false, badge: displayWishlistCount },
    { to: "/account", icon: User, label: "Account", exact: false },
  ];

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 glass-panel bg-background/85 supports-[backdrop-filter]:bg-background/60 pb-safe"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {links.map(({ to, icon: Icon, label, exact, badge }) => {
          const active = isActive(to, exact);
          const isCart = to === "/cart";
          const innerContent = (
            <>
              <div className="relative">
                <Icon className={cn("h-5 w-5 transition-all duration-200", active && "scale-110")} />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium leading-none transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
              {active && <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />}
            </>
          );

          if (isCart) {
            return (
              <button
                key={to}
                onClick={() => setIsCartOpen(true)}
                className={cn("relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}
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
              className={cn("relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200", active ? "text-primary" : "text-muted-foreground")}
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
