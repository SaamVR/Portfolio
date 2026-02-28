import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Heart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
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

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "FAQ", to: "/faq" },
];

const MobileMenu = () => {
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const location = useLocation();
  const [shopOpen, setShopOpen] = useState(false);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex flex-col gap-1.5 md:hidden"
          aria-label="Open navigation menu"
        >
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-3.5 bg-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] bg-background border-border">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold text-foreground">
            THREAD<span className="text-primary">BD</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <SearchBar className="w-full" />
        </div>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile navigation">
          <Link
            to="/"
            className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname === "/"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Home
          </Link>

          {/* Expandable Shop section */}
          <Collapsible open={shopOpen} onOpenChange={setShopOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
              Shop
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${shopOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-3 flex flex-col gap-0.5 border-l border-border pl-3 pt-1">
              {productTypes.map((t) => (
                <Link
                  key={t.value}
                  to={t.value === "All" ? "/shop" : `/shop?type=${t.value}`}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
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
              className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-border pt-4 flex flex-col gap-1">
          <Link
            to={user ? "/account" : "/auth"}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <User className="h-5 w-5" />
            {user ? "My Account" : "Sign In"}
          </Link>
          <Link
            to="/wishlist"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Heart className="h-5 w-5" />
            Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
          </Link>
          <Link
            to="/cart"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ShoppingBag className="h-5 w-5" />
            Cart {totalItems > 0 && `(${totalItems})`}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
