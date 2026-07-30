import { useState, useEffect } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { ShoppingBag, Search, X, ChevronDown, Heart, User, Sun, Moon, MapPin } from "lucide-react";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useAuth } from "@/hooks/auth-context";
import { useTheme } from "next-themes";
import SearchBar from "@/components/SearchBar";
import MobileMenu from "@/components/MobileMenu";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontContainerClass } from "@/lib/storefront-theme-customization";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { buildAutoNavbarItems } from "@/lib/cms/page-listing-preferences";

interface NavigationSettings {
  primary_links?: Array<{ label?: string; url?: string; children?: Array<{ label?: string; url?: string }> }>;
  shop_label?: string;
  shop_feature_title?: string;
  shop_feature_subtitle?: string;
  shop_feature_image?: string;
  show_search?: boolean;
  show_theme_toggle?: boolean;
  show_account?: boolean;
  show_wishlist?: boolean;
  show_cart?: boolean;
}

type NavbarLink = {
  label: string;
  to: string;
  hasDropdown: boolean;
  children?: Array<{ label: string; to: string }>;
};

interface DeliverySettings {
  primary_zone_label?: string;
}

interface ContactSettings {
  address?: string;
}

const Navbar = ({ announcementVisible = false }: { announcementVisible?: boolean }) => {
  const { totalItems, setIsCartOpen } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const currentStore = useOptionalStore();
  const { data: brand } = useSiteSettings("brand_settings", currentStore?.id);
  const { data: navigation } = useSiteSettings<NavigationSettings>("navigation", currentStore?.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", currentStore?.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", currentStore?.id);
  const { data: themeCustomization } = useStorefrontThemeCustomization(currentStore?.id);
  const { data: dynamicProductTypes = [] } = useProductTypes(currentStore?.id);
  const { data: dynamicProductCategories = [] } = useProductCategories(currentStore?.id);

  const [mounted, setMounted] = useState(false);
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (themeCustomization?.nav_style !== "hidden") {
      setHiddenOnScroll(false);
      return;
    }

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const shouldHide = currentScrollY > lastScrollY && currentScrollY > 120;
      setHiddenOnScroll(shouldHide);
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [themeCustomization?.nav_style]);

  const fallbackBrandName = currentStore?.name?.trim() || "Store";
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore?.siteSettings?.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    blueprintId: typeof storefrontProfile?.blueprint_id === "string" ? storefrontProfile.blueprint_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const brandName = brand?.name || fallbackBrandName;
  const brandHighlight = brand?.highlight || "";
  const containerClass = getStorefrontContainerClass(themeCustomization?.container_width);
  const fallbackCategoryLinks = [
    { label: "Browse Catalog", to: storefrontPath("/shop", currentStore?.slug) },
    { label: "Latest Additions", to: storefrontPath("/shop", currentStore?.slug) },
    { label: "Popular Picks", to: storefrontPath("/shop", currentStore?.slug) },
  ];
  const authPath = storefrontPath(
    `/auth?next=${encodeURIComponent(storefrontPath("/account", currentStore?.slug))}`,
    currentStore?.slug,
  );

  const isDark = mounted ? theme === "dark" : false;
  const displayWishlistCount = mounted ? wishlistCount : 0;
  const displayTotalItems = mounted ? totalItems : 0;
  const defaultNavLinks = [
    { label: "Home", to: storefrontPath("/", currentStore?.slug), hasDropdown: false },
    { label: "Shop", to: storefrontPath("/shop", currentStore?.slug), hasDropdown: true },
    { label: "About", to: storefrontPath("/about", currentStore?.slug), hasDropdown: false },
    { label: "Contact", to: storefrontPath("/contact", currentStore?.slug), hasDropdown: false },
  ] satisfies NavbarLink[];
  const autoPageLinks = buildAutoNavbarItems(currentStore).map((item) => ({
    label: item.label,
    to: storefrontPath(item.url, currentStore?.slug),
    children: item.children?.map((child) => ({
      label: child.label,
      to: storefrontPath(child.url, currentStore?.slug),
    })),
    hasDropdown: (item.children?.length ?? 0) > 1,
  }));
  const manualNavLinks: NavbarLink[] = navigation?.primary_links?.length
    ? navigation.primary_links
      .filter((link): link is { label: string; url: string; children?: Array<{ label?: string; url?: string }> } => Boolean(link?.label && link?.url))
      .map((link) => ({
        label: link.label,
        to: storefrontPath(link.url, currentStore?.slug),
        children: Array.isArray(link.children)
          ? link.children.filter((child): child is { label: string; url: string } => Boolean(child?.label && child?.url)).map((child) => ({
              label: child.label,
              to: storefrontPath(child.url, currentStore?.slug),
            }))
          : undefined,
        hasDropdown: link.url === "/shop" || (Array.isArray(link.children) && link.children.length > 0),
      }))
    : defaultNavLinks;
  const autoLinkKeys = new Set(autoPageLinks.map((link) => link.to));
  const navLinks: NavbarLink[] = [...manualNavLinks, ...autoPageLinks.filter((link) => !manualNavLinks.some((manualLink) => manualLink.to === link.to || autoLinkKeys.has(manualLink.to) && manualLink.label === link.label))];
  const shopLabel = navigation?.shop_label?.trim() || "Shop";
  const showSearch = navigation?.show_search ?? true;
  const showThemeToggle = navigation?.show_theme_toggle ?? true;
  const showAccount = navigation?.show_account ?? true;
  const showWishlist = navigation?.show_wishlist ?? true;
  const showCart = navigation?.show_cart ?? true;
  const foodLocationLabel = deliverySettings?.primary_zone_label?.trim() || contactSettings?.address?.trim() || "";
  const showFoodLocation = templateId === "food" && foodLocationLabel.length > 0;

  const topClass = themeCustomization?.nav_style === "static"
    ? "sticky top-0"
    : announcementVisible
      ? "top-9"
      : "top-0";
  const navModeClass = themeCustomization?.nav_style === "static"
    ? ""
    : "fixed left-0 right-0";

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <nav
        className={`${navModeClass} ${topClass} z-50 border-b border-border glass-panel transition-all duration-500 ${hiddenOnScroll ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className={`mx-auto flex h-16 items-center justify-between px-4 ${containerClass}`}>
          <div className="flex items-center gap-4">
            <MobileMenu />
            <Link to={storefrontPath("/", currentStore?.slug)} className="font-heading text-2xl font-bold tracking-tight text-foreground drop-shadow-sm transition-transform hover:scale-105 duration-300">
              <span className="flex items-center gap-3">
                {currentStore?.logoUrl ? (
                  <img
                    src={currentStore.logoUrl}
                    alt={`${brandName} logo`}
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                ) : null}
                <span>
                  {brandName}{brandHighlight ? <span className="text-primary">{brandHighlight}</span> : null}
                </span>
              </span>
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
                    location.pathname === link.to || (link.to.endsWith("/shop") && location.pathname.startsWith(link.to))
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.hasDropdown ? shopLabel : link.label}
                  {link.hasDropdown && <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />}
                </Link>

                {link.hasDropdown && link.to.endsWith("/shop") && shopDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-[640px] pt-1">
                    <div className="grid grid-cols-3 gap-6 rounded-2xl border border-white/15 bg-background/90 backdrop-blur-2xl p-5 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5 dark:ring-white/10">
                      <div>
                        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Types</h4>
                        <div className="flex flex-col gap-1.5">
                          <Link
                            key="all"
                            to={storefrontPath("/shop", currentStore?.slug)}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                          >
                            All Products
                          </Link>
                          {dynamicProductTypes.map((t: any) => (
                            <Link
                              key={t.id}
                              to={storefrontPath(`/shop?type=${encodeURIComponent(t.name)}`, currentStore?.slug)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                            >
                              {t.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Categories</h4>
                        <div className="flex flex-col gap-1.5">
                          {dynamicProductCategories.length > 0 ? (
                            dynamicProductCategories.map((c: any) => (
                              <Link
                                key={c.id}
                                to={storefrontPath(`/shop?category=${encodeURIComponent(c.name)}`, currentStore?.slug)}
                                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                              >
                                {c.name}
                              </Link>
                            ))
                          ) : (
                            <>
                              {fallbackCategoryLinks.map((link) => (
                                <Link
                                  key={link.label}
                                  to={link.to}
                                  className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                                >
                                  {link.label}
                                </Link>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="relative min-h-[160px] overflow-hidden rounded-xl bg-muted/50 border border-white/10 shadow-inner group/card">
                        <img
                          src={
                            navigation?.shop_feature_image ||
                            brand?.mega_menu_image ||
                            "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=80&w=600"
                          }
                          alt="Store highlight"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
                          <h4 className="text-sm font-bold text-white line-clamp-1">
                            {navigation?.shop_feature_title || brand?.mega_menu_title || "Store Highlights"}
                          </h4>
                          <p className="mt-0.5 text-[11px] leading-4 text-gray-200 line-clamp-2">
                            {navigation?.shop_feature_subtitle || brand?.mega_menu_subtitle || "Explore our top collections and featured items."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {link.hasDropdown && !link.to.endsWith("/shop") && link.children?.length ? (
                  <div className="absolute left-0 top-full mt-1 w-64 pt-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                    <div className="rounded-2xl border border-white/15 bg-background/95 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                      <div className="flex flex-col gap-1">
                        {link.children.map((child) => (
                          <Link
                            key={child.to}
                            to={child.to}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {showFoodLocation ? (
              <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm lg:inline-flex">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[180px] truncate">{foodLocationLabel}</span>
              </div>
            ) : null}
            {/* Theme toggle — full pill on desktop, icon-only on mobile */}
            {/* Desktop pill toggle */}
            {showThemeToggle ? (
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
            ) : null}

            {/* Mobile icon-only toggle */}
            {showThemeToggle ? (
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
            ) : null}

            {showSearch ? (
              <div className="hidden md:block">
                <SearchBar className="w-64" />
              </div>
            ) : null}

            {showAccount ? (
              <Link
                to={user ? storefrontPath("/account", currentStore?.slug) : authPath}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={user ? "My account" : "Sign in"}
              >
                <User className="h-5 w-5" />
              </Link>
            ) : null}

            {showWishlist ? (
              <Link
                to={storefrontPath("/wishlist", currentStore?.slug)}
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
            ) : null}

            {showCart ? (
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
            ) : null}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
