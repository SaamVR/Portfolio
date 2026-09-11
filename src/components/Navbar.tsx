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
import { resolveStorefrontNavigationExperience } from "@/lib/cms/storefront-navigation-experience";
import { buildAutoNavbarItems } from "@/lib/cms/page-listing-preferences";
import { cn } from "@/lib/utils";

interface NavigationSettings {
  primary_links?: Array<{ label?: string; url?: string; children?: Array<{ label?: string; url?: string }> }>;
  shop_label?: string;
  shop_feature_title?: string;
  shop_feature_subtitle?: string;
  shop_feature_image?: string;
  nav_layout?: "brand-left" | "centered" | "compact";
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
  const { theme, resolvedTheme, setTheme } = useTheme();
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
  const experience = resolveStorefrontNavigationExperience(storefrontProfile);
  const templateId = experience.templateId;
  const brandName = brand?.name || fallbackBrandName;
  const brandHighlight = brand?.highlight || "";
  const containerClass = getStorefrontContainerClass(themeCustomization?.container_width);
  const catalogLabel = navigation?.shop_label?.trim() || experience.catalogLabel;
  const authPath = storefrontPath(
    `/auth?next=${encodeURIComponent(storefrontPath("/account", currentStore?.slug))}`,
    currentStore?.slug,
  );

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = mounted ? (currentTheme === "dark" || resolvedTheme === "dark") : false;
  const displayWishlistCount = mounted ? wishlistCount : 0;
  const displayTotalItems = mounted ? totalItems : 0;
  const defaultNavLinks = [
    { label: experience.homeLabel, to: storefrontPath("/", currentStore?.slug), hasDropdown: false },
    ...(experience.showCatalog
      ? [{
          label: catalogLabel,
          to: storefrontPath("/shop", currentStore?.slug),
          hasDropdown: experience.useCatalogDropdown,
        }]
      : []),
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
        hasDropdown:
          (link.url === "/shop" && experience.useCatalogDropdown)
          || (Array.isArray(link.children) && link.children.length > 0),
      }))
    : defaultNavLinks;
  const autoLinkKeys = new Set(autoPageLinks.map((link) => link.to));
  const navLinks: NavbarLink[] = [...manualNavLinks, ...autoPageLinks.filter((link) => !manualNavLinks.some((manualLink) => manualLink.to === link.to || autoLinkKeys.has(manualLink.to) && manualLink.label === link.label))];
  const shopLabel = catalogLabel;
  const navLayout = navigation?.nav_layout ?? "brand-left";
  const showSearch = navigation?.show_search ?? experience.showSearchByDefault;
  const showThemeToggle = navigation?.show_theme_toggle ?? true;
  const showAccount = navigation?.show_account ?? true;
  const showWishlist = navigation?.show_wishlist ?? experience.showWishlistByDefault;
  const showCart = navigation?.show_cart ?? experience.showCartByDefault;
  const foodLocationLabel = deliverySettings?.primary_zone_label?.trim() || contactSettings?.address?.trim() || "";
  const showFoodLocation = templateId === "food" && foodLocationLabel.length > 0;
  const isFashion = templateId === "fashion";
  const shopFeatureImage = navigation?.shop_feature_image?.trim() || brand?.mega_menu_image?.trim() || "";
  const shopFeatureTitle = navigation?.shop_feature_title?.trim() || brand?.mega_menu_title?.trim() || "";
  const shopFeatureSubtitle = navigation?.shop_feature_subtitle?.trim() || brand?.mega_menu_subtitle?.trim() || "";
  const hasShopFeature = Boolean(shopFeatureImage);
  const megaMenuColumnCount = 1 + (dynamicProductCategories.length > 0 ? 1 : 0) + (hasShopFeature ? 1 : 0);
  const megaMenuGridClass = megaMenuColumnCount >= 3 ? "grid-cols-3" : megaMenuColumnCount === 2 ? "grid-cols-2" : "grid-cols-1";

  const topClass = themeCustomization?.nav_style === "static"
    ? "sticky top-0"
    : announcementVisible
      ? "top-9"
      : "top-0";
  const navModeClass = themeCustomization?.nav_style === "static"
    ? ""
    : "fixed left-0 right-0";
  const isCenteredNav = navLayout === "centered";
  const isCompactNav = navLayout === "compact";

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <nav
        className={cn(
          navModeClass,
          topClass,
          "z-50 border-b transition-all duration-500",
          isFashion ? "border-foreground/10 bg-background/95 backdrop-blur-md" : "border-border glass-panel",
          hiddenOnScroll ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100",
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className={cn(
          `mx-auto flex items-center justify-between gap-3 px-4 ${containerClass}`,
          isFashion ? (isCompactNav ? "h-14" : "h-[68px]") : (isCompactNav ? "h-14" : "h-16"),
          isCenteredNav ? "md:relative" : "",
        )}>
          <div className={cn("flex min-w-0 items-center gap-3", isCenteredNav ? "md:flex-1" : "")}>
            <MobileMenu />
            <Link
              to={storefrontPath("/", currentStore?.slug)}
              className={cn(
                "min-w-0 font-heading tracking-tight text-foreground transition-opacity duration-300 hover:opacity-75",
                isFashion ? "font-semibold" : "font-bold drop-shadow-sm",
                isCenteredNav ? "md:absolute md:left-1/2 md:-translate-x-1/2" : "",
                isCompactNav ? "text-xl" : "text-2xl",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                {currentStore?.logoUrl ? (
                  <img
                    src={currentStore.logoUrl}
                    alt={`${brandName} logo`}
                    className={cn("h-8 w-8 object-cover sm:h-9 sm:w-9", isFashion ? "rounded-none" : "rounded-lg")}
                  />
                ) : null}
                <span className={cn("min-w-0 truncate", isCompactNav ? "text-lg sm:text-xl" : "text-xl sm:text-2xl")}>
                  {brandName}{brandHighlight ? <span className="text-primary">{brandHighlight}</span> : null}
                </span>
              </span>
            </Link>
          </div>

          <div className={cn(
            "hidden items-center md:flex",
            isFashion ? (isCompactNav ? "gap-4 lg:gap-5" : "gap-5 lg:gap-7") : (isCompactNav ? "gap-4 lg:gap-5" : "gap-6 lg:gap-8"),
            isCenteredNav ? "md:flex-1 md:justify-center" : "",
          )}>
            {navLinks.map((link) => (
              <div
                key={link.to}
                className="relative group"
                onMouseEnter={() => link.hasDropdown && setShopDropdownOpen(true)}
                onMouseLeave={() => link.hasDropdown && setShopDropdownOpen(false)}
                onFocus={() => link.hasDropdown && setShopDropdownOpen(true)}
                onBlur={(event) => {
                  if (link.hasDropdown && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setShopDropdownOpen(false);
                  }
                }}
              >
                <Link
                  to={link.to}
                  className={cn(
                    "nav-link-anim relative flex items-center gap-1.5 py-2 transition-colors",
                    isFashion
                      ? `${isCompactNav ? "text-[11px]" : "text-xs"} font-semibold uppercase tracking-[0.13em]`
                      : `${isCompactNav ? "text-sm" : "text-[15px]"} font-semibold tracking-wide`,
                    location.pathname === link.to || (link.to.endsWith("/shop") && location.pathname.startsWith(link.to))
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.to.endsWith("/shop") ? shopLabel : link.label}
                  {link.hasDropdown && <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />}
                </Link>

                {link.hasDropdown && link.to.endsWith("/shop") && shopDropdownOpen && (
                  <div className={cn("absolute left-0 top-full pt-1", isFashion ? "w-[720px]" : "w-[640px]")}>
                    <div
                      className={cn(
                        "grid gap-6 border bg-background/95 p-5 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200",
                        isFashion ? "rounded-none border-foreground/10" : "rounded-2xl border-white/15 ring-1 ring-black/5 dark:ring-white/10",
                        megaMenuGridClass,
                      )}
                    >
                      <div>
                        <h4 className={cn("mb-3 font-bold uppercase text-primary", isFashion ? "text-[10px] tracking-[0.22em]" : "text-[11px] tracking-[0.18em]")}>
                          {isFashion ? "Shop by type" : "Types"}
                        </h4>
                        <div className="flex flex-col gap-1.5">
                          <Link
                            to={storefrontPath("/shop", currentStore?.slug)}
                            className={cn("px-2 py-1 text-xs font-semibold text-muted-foreground transition-all hover:text-primary", !isFashion && "rounded-md hover:bg-primary/10")}
                          >
                            All {shopLabel}
                          </Link>
                          {dynamicProductTypes.map((t: any) => (
                            <Link
                              key={t.id}
                              to={storefrontPath(`/shop?type=${encodeURIComponent(t.name)}`, currentStore?.slug)}
                              className={cn("px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-primary", !isFashion && "rounded-md hover:bg-primary/10")}
                            >
                              {t.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                      {dynamicProductCategories.length > 0 ? (
                        <div>
                          <h4 className={cn("mb-3 font-bold uppercase text-primary", isFashion ? "text-[10px] tracking-[0.22em]" : "text-[11px] tracking-[0.18em]")}>
                            {isFashion ? "Collections" : "Categories"}
                          </h4>
                          <div className="flex flex-col gap-1.5">
                            {dynamicProductCategories.map((c: any) => (
                              <Link
                                key={c.id}
                                to={storefrontPath(`/shop?category=${encodeURIComponent(c.name)}`, currentStore?.slug)}
                                className={cn("px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-primary", !isFashion && "rounded-md hover:bg-primary/10")}
                              >
                                {c.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {hasShopFeature ? (
                        <div className={cn("relative min-h-[180px] overflow-hidden bg-muted/50 shadow-inner group/card", isFashion ? "rounded-none" : "rounded-xl border border-white/10")}>
                          <img
                            src={shopFeatureImage}
                            alt={shopFeatureTitle || `${shopLabel} feature`}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.035]"
                          />
                          {(shopFeatureTitle || shopFeatureSubtitle) ? (
                            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/20 to-transparent p-4">
                              {shopFeatureTitle ? <h4 className="line-clamp-1 text-sm font-bold text-white">{shopFeatureTitle}</h4> : null}
                              {shopFeatureSubtitle ? <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/75">{shopFeatureSubtitle}</p> : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
                {link.hasDropdown && !link.to.endsWith("/shop") && link.children?.length ? (
                  <div className="pointer-events-none absolute left-0 top-full mt-1 w-64 pt-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                    <div className={cn("border bg-background/95 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl", isFashion ? "rounded-none border-foreground/10" : "rounded-2xl border-white/15")}>
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

          <div className={cn("flex shrink-0 items-center", isCompactNav ? "gap-0.5 sm:gap-1.5" : "gap-0.5 sm:gap-2", isCenteredNav ? "md:flex-1 md:justify-end" : "")}>
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
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground md:hidden"
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
              <div className="hidden lg:block">
                <SearchBar className={isCompactNav ? "w-52" : "w-64"} />
              </div>
            ) : null}

            {showAccount ? (
              <Link
                to={user ? storefrontPath("/account", currentStore?.slug) : authPath}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                aria-label={user ? `My ${experience.accountLabel}` : "Sign in"}
              >
                <User className="h-5 w-5" />
              </Link>
            ) : null}

            {showWishlist ? (
              <Link
                to={storefrontPath("/wishlist", currentStore?.slug)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                aria-label={`${experience.wishlistLabel} with ${displayWishlistCount} items`}
              >
                <Heart className="h-5 w-5" />
                {displayWishlistCount > 0 && (
                  <span
                    className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-bounce-in"
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
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                aria-label={`${experience.cartLabel} with ${displayTotalItems} items`}
              >
                <ShoppingBag className="h-5 w-5" />
                {displayTotalItems > 0 && (
                  <span
                    className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-bounce-in"
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
