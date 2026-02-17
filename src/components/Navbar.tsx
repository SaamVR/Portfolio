import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Search, X, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import SearchBar from "@/components/SearchBar";
import MobileMenu from "@/components/MobileMenu";
import { productTypes } from "@/data/products";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop", hasDropdown: true },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const { totalItems } = useCart();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-border glass-effect"
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

                {/* Shop dropdown */}
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

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              {searchOpen ? (
                <div className="flex items-center gap-2">
                  <SearchBar className="w-52" onClose={() => setSearchOpen(false)} />
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
