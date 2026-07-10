import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { ShoppingBag, Heart, User } from "lucide-react";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useAuth } from "@/hooks/auth-context";
import SearchBar from "@/components/SearchBar";
import { productTypes } from "@/data/products";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

const MobileMenu = () => {
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const location = useLocation();
  const [shopOpen, setShopOpen] = useState(false);
  const currentStore = useOptionalStore();
  const navLinks = [
    { label: "Home", to: storefrontPath("/", currentStore?.slug) },
    { label: "About", to: "/about" },
    { label: "Contact", to: storefrontPath("/contact", currentStore?.slug) },
    { label: "FAQ", to: "/faq" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full hover:bg-secondary transition-colors md:hidden"
          aria-label="Open navigation menu"
        >
          <span className="block h-0.5 w-5 bg-foreground transition-all duration-300" />
          <span className="block h-0.5 w-5 bg-foreground transition-all duration-300" />
          <span className="block h-0.5 w-3.5 self-end bg-foreground mr-2.5 transition-all duration-300" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-[340px] glass-panel border-r border-white/10 p-6 flex flex-col h-full bg-background/80">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="font-heading text-2xl font-bold tracking-tight text-foreground drop-shadow-sm">
            THREAD<span className="text-primary">BD</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 mb-6">
          <SearchBar className="w-full" />
        </div>

        <nav className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2 pb-6" aria-label="Mobile navigation">
          <Link
            to={storefrontPath("/", currentStore?.slug)}
            className={`rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-all ${
              location.pathname === "/"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            Home
          </Link>

          {/* Expandable Shop section */}
          <Collapsible open={shopOpen} onOpenChange={setShopOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-semibold text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all">
              Shop
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${shopOpen ? "rotate-180 text-primary" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 ml-4 flex flex-col gap-1 border-l-2 border-white/5 pl-4">
              {productTypes.map((t) => (
                <Link
                  key={t.value}
                  to={storefrontPath(t.value === "All" ? "/shop" : `/shop?type=${encodeURIComponent(t.value)}`, currentStore?.slug)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {t.label}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {navLinks.slice(1).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-all ${
                location.pathname === link.to
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-6 flex flex-col gap-2">
          <Link
            to={user ? storefrontPath("/account", currentStore?.slug) : "/auth"}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
          >
            <User className="h-5 w-5 text-primary/80" />
            {user ? "My Account" : "Sign In"}
          </Link>
          <Link
            to={storefrontPath("/wishlist", currentStore?.slug)}
            className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
          >
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary/80" />
              Wishlist
            </div>
            {wishlistCount > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link
            to={storefrontPath("/cart", currentStore?.slug)}
            className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-primary/80" />
              Cart
            </div>
            {totalItems > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
