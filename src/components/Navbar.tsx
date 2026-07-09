import { useState, useEffect } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { ShoppingBag, Search, X, ChevronDown, Heart, User, Sun, Moon } from "lucide-react";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useAuth } from "@/hooks/auth-context";
import { useTheme } from "next-themes";
import SearchBar from "@/components/SearchBar";
import MobileMenu from "@/components/MobileMenu";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop", hasDropdown: true },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const Navbar = ({ announcementVisible = false }: { announcementVisible?: boolean }) => {
  const { totalItems, setIsCartOpen } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const { data: brand } = useSiteSettings("brand_settings");
  const { data: dynamicProductTypes = [] } = useProductTypes();
  const { data: dynamicProductCategories = [] } = useProductCategories();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const brandName = brand?.name || "THREAD";
  const brandHighlight = brand?.highlight || "BD";

  const isDark = mounted ? theme === "dark" : false;
  const displayWishlistCount = mounted ? wishlistCount : 0;
  const displayTotalItems = mounted ? totalItems : 0;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <nav
        className={`fixed left-0 right-0 z-50 border-b border-border glass-panel transition-all duration-500 ${announcementVisible ? "top-9" : "top-0"}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <MobileMenu />
            <Link to="/" className="font-heading text-2xl font-bold tracking-tight text-foreground drop-shadow-sm transition-transform hover:scale-105 duration-300">
              {brandName}<span className="text-primary">{brandHighlight}</span>
            </Link>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <div
                key={link.to}
                className="relative group"
                onMouseEnter={() => link.hasDropdown && setShopDropdownOpen(true)}
                onMouseLeave={() => link.hasDropdown && setShopDropdownOpen(false)}
              >
                <Link
                  to={link.to}
                  className={`nav-link-anim relative flex items-center gap-1.5 py-2 text-[15px] font-semibold tracking-wide transition-colors ${
                    location.pathname === link.to || (link.to === "/shop" && location.pathname.startsWith("/shop"))
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />}
                </Link>

                {link.hasDropdown && shopDropdownOpen && (
                  <div className="absolute left-1/2 top-full mt-0 w-screen max-w-4xl -translate-x-1/2 pt-6">
                    <div className="grid grid-cols-3 gap-8 rounded-2xl border border-white/10 glass-panel p-8 premium-shadow animate-in fade-in slide-in-from-top-4 duration-300">
                      <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Types</h4>
                        <div className="flex flex-col gap-3">
                          <Link
                              key="all"
                              to="/shop"
                              className="text-sm text-muted-foreground transition-colors hover:text-primary"
                            >
                              All
                            </Link>
                          {dynamicProductTypes.map((t: any) => (
                            <Link
                              key={t.id}
                              to={`/shop?type=${encodeURIComponent(t.name)}`}
                              className="text-sm text-muted-foreground transition-colors hover:text-primary"
                            >
                              {t.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Categories</h4>
                        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                          {dynamicProductCategories.length > 0 ? dynamicProductCategories.map((c: any) => (
                            <Link
                              key={c.id}
                              to={`/shop?category=${encodeURIComponent(c.name)}`}
                              className="text-sm text-muted-foreground transition-colors hover:text-primary"
                            >
                              {c.name}
                            </Link>
                          )) : (
                            <>
                              <Link to="/shop?type=T-Shirts" className="hover:text-primary transition-colors">Premium Basics</Link>
                              <Link to="/shop?type=Drop%20Shoulders" className="hover:text-primary transition-colors">Streetwear Collection</Link>
                              <Link to="/shop" className="hover:text-primary transition-colors">New Arrivals</Link>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="relative overflow-hidden rounded-lg bg-secondary">
                        <img src={brand?.mega_menu_image || "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=80&w=600"} alt="New Collection" className="absolute inset-0 h-full w-full object-cover opacity-80 mix-blend-overlay transition-transform duration-700 hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                          <h4 className="text-lg font-bold text-white">{brand?.mega_menu_title || "Summer Drop"}</h4>
                          <p className="text-sm text-gray-300">{brand?.mega_menu_subtitle || "Explore the latest styles."}</p>
                        </div>
                      </div>
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
                className={`absolute top-0.5 h-7 w-7 rounded-full shadow-md transition-transform duration-300 ease-out ${isDark ? "translate-x-[26px] bg-foreground" : "translate-x-0.5 bg-card border border-border"}`}
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
              <SearchBar className="w-64" />
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
              aria-label={`Wishlist with ${displayWishlistCount} items`}
            >
              <Heart className="h-5 w-5" />
              {displayWishlistCount > 0 && (
                <span
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground animate-bounce-in"
                  aria-live="polite"
                >
                  {displayWishlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Shopping cart with ${displayTotalItems} items`}
            >
              <ShoppingBag className="h-5 w-5" />
              {displayTotalItems > 0 && (
                <span
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground animate-bounce-in"
                  aria-live="polite"
                >
                  {displayTotalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
