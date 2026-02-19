import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Search, X, ChevronDown, Heart, User, Sun, Moon } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import SearchBar from "@/components/SearchBar";
import MobileMenu from "@/components/MobileMenu";
import { productTypes } from "@/data/products";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop", hasDropdown: true },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const Navbar = ({ announcementVisible = false }: { announcementVisible?: boolean }) => {
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);

  const isDark = theme === "dark";

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <nav
        className={`fixed left-0 right-0 z-50 border-b border-border glass-effect ${announcementVisible ? "top-9" : "top-0"}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <MobileMenu />
            <Link to="/" className="font-heading text-xl font-bold tracking-wider text-foreground">
              THREAD<span className="text-primary">BD</span>
            </Link>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <div
                key={link.to}
                className="relative"
                onMouseEnter={() => link.hasDropdown && setShopDropdownOpen(true)}
                onMouseLeave={() => link.hasDropdown && setShopDropdownOpen(false)}
              >
                <Link
                  to={link.to}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="h-3 w-3" />}
                </Link>

                {link.hasDropdown && shopDropdownOpen && (
                  <div className="absolute left-0 top-full pt-2">
                    <div className="min-w-[180px] rounded-lg border border-border bg-card p-2 premium-shadow">
                      {productTypes.map((t) => (
                        <Link
                          key={t.value}
                          to={t.value === "All" ? "/shop" : `/shop?type=${t.value}`}
                          className="block rounded-md px-3 py-2 text-sm text-muted-foreground smooth-hover hover:bg-secondary hover:text-foreground"
                        >
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme toggle — full pill on desktop, icon-only on mobile */}
            {/* Desktop pill toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="relative hidden h-8 w-14 rounded-full border border-border bg-secondary transition-colors duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:inline-flex"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Sun
                className={`absolute left-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent transition-all duration-300 ${isDark ? "opacity-30 scale-75" : "opacity-100 scale-100"}`}
              />
              <Moon
                className={`absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary transition-all duration-300 ${isDark ? "opacity-100 scale-100" : "opacity-30 scale-75"}`}
              />
              <span
                className={`absolute top-0.5 h-7 w-7 rounded-full bg-foreground shadow-md transition-transform duration-300 ease-out ${isDark ? "translate-x-[26px]" : "translate-x-0.5"}`}
              />
            </button>

            {/* Mobile icon-only toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground md:hidden"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Sun
                className={`absolute h-5 w-5 transition-all duration-300 ${isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}`}
              />
              <Moon
                className={`absolute h-5 w-5 transition-all duration-300 ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`}
              />
            </button>

            <div className="hidden md:block">
              {searchOpen ? (
                <div className="flex items-center gap-2">
                  <SearchBar className="w-64" onClose={() => setSearchOpen(false)} />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="text-muted-foreground hover:text-foreground smooth-hover"
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="text-muted-foreground hover:text-foreground smooth-hover"
                  aria-label="Open search"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
            </div>

            <Link
              to={user ? "/account" : "/auth"}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={user ? "My account" : "Sign in"}
            >
              <User className="h-5 w-5" />
            </Link>

            <Link
              to="/wishlist"
              className="relative flex items-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground animate-bounce-in"
                  aria-live="polite"
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              className="relative flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Shopping cart with ${totalItems} items`}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground animate-bounce-in"
                  aria-live="polite"
                >
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
