import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { ShoppingBag, Heart, MapPin, Sparkles, User } from "lucide-react";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useAuth } from "@/hooks/auth-context";
import SearchBar from "@/components/SearchBar";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
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
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildAutoNavbarItems } from "@/lib/cms/page-listing-preferences";
import { resolveStorefrontNavigationExperience } from "@/lib/cms/storefront-navigation-experience";
import { cn } from "@/lib/utils";

interface NavigationSettings {
  primary_links?: Array<{ label?: string; url?: string; children?: Array<{ label?: string; url?: string }> }>;
  shop_label?: string;
  nav_layout?: "brand-left" | "centered" | "compact";
  show_search?: boolean;
  show_account?: boolean;
  show_wishlist?: boolean;
  show_cart?: boolean;
}

interface ContactSettings {
  address?: string;
}

interface DeliverySettings {
  primary_zone_label?: string;
}

type MobileNavLink = {
  label: string;
  to: string;
  children?: Array<{ label: string; to: string }>;
};

const MobileMenu = () => {
  const { totalItems } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const location = useLocation();
  const [shopOpen, setShopOpen] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState<string | null>(null);
  const currentStore = useOptionalStore();
  const { data: navigation } = useSiteSettings<NavigationSettings>("navigation", currentStore?.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", currentStore?.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", currentStore?.id);
  const { data: dynamicProductTypes = [] } = useProductTypes(currentStore?.id);
  const { data: dynamicProductCategories = [] } = useProductCategories(currentStore?.id);
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore?.siteSettings?.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const experience = resolveStorefrontNavigationExperience(storefrontProfile);
  const homePath = storefrontPath("/", currentStore?.slug);
  const shopPath = storefrontPath("/shop", currentStore?.slug);
  const catalogLabel = navigation?.shop_label?.trim() || experience.catalogLabel;
  const fallbackShopLinks = [
    { label: `Browse ${catalogLabel}`, to: shopPath },
    { label: "Latest Additions", to: shopPath },
    { label: "Popular Picks", to: shopPath },
  ];
  const authPath = storefrontPath(
    `/auth?next=${encodeURIComponent(storefrontPath("/account", currentStore?.slug))}`,
    currentStore?.slug,
  );
  const shopLinks = dynamicProductCategories.length > 0
    ? dynamicProductCategories.slice(0, 6).map((category: any) => ({
        label: category.name,
        to: storefrontPath(`/shop?category=${encodeURIComponent(category.name)}`, currentStore?.slug),
      }))
    : dynamicProductTypes.length > 0
      ? dynamicProductTypes.slice(0, 6).map((type: any) => ({
          label: type.name,
          to: storefrontPath(`/shop?type=${encodeURIComponent(type.name)}`, currentStore?.slug),
        }))
      : fallbackShopLinks;
  const defaultNavLinks: MobileNavLink[] = [
    { label: experience.homeLabel, to: homePath },
    ...(experience.showCatalog ? [{ label: catalogLabel, to: shopPath }] : []),
    { label: "About", to: storefrontPath("/about", currentStore?.slug) },
    { label: "Contact", to: storefrontPath("/contact", currentStore?.slug) },
    { label: "FAQ", to: storefrontPath("/faq", currentStore?.slug) },
  ];
  const autoPageLinks: MobileNavLink[] = buildAutoNavbarItems(currentStore).map((item) => ({
    label: item.label,
    to: storefrontPath(item.url, currentStore?.slug),
    children: item.children?.map((child) => ({
      label: child.label,
      to: storefrontPath(child.url, currentStore?.slug),
    })),
  }));
  const manualNavLinks: MobileNavLink[] = navigation?.primary_links?.length
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
      }))
    : defaultNavLinks;
  const navLinks: MobileNavLink[] = [
    ...manualNavLinks,
    ...autoPageLinks.filter((link) => !manualNavLinks.some((manualLink) => manualLink.to === link.to)),
  ];
  const navLayout = navigation?.nav_layout ?? "brand-left";
  const homeLink = navLinks.find((link) => link.to === homePath) ?? { label: experience.homeLabel, to: homePath };
  const shopLink = navLinks.find((link) => link.to === shopPath);
  const secondaryLinks = navLinks.filter((link) => link.to !== homePath && link.to !== shopPath);
  const shopLabel = navigation?.shop_label?.trim() || shopLink?.label || experience.catalogLabel;
  const showSearch = navigation?.show_search ?? experience.showSearchByDefault;
  const showAccount = navigation?.show_account ?? true;
  const showWishlist = navigation?.show_wishlist ?? experience.showWishlistByDefault;
  const showCart = navigation?.show_cart ?? experience.showCartByDefault;
  const locationLabel = deliverySettings?.primary_zone_label?.trim() || contactSettings?.address?.trim() || "";

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
      <SheetContent side="left" className={cn("w-[85vw] glass-panel border-r border-white/10 p-6 flex flex-col h-full bg-background/80", navLayout === "compact" ? "max-w-[320px]" : "max-w-[340px]")}>
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className={cn("font-heading font-bold tracking-tight text-foreground drop-shadow-sm", navLayout === "compact" ? "text-xl" : "text-2xl", navLayout === "centered" ? "text-center" : "")}>
            {currentStore?.name || "Store"}
          </SheetTitle>
        </SheetHeader>

        {(currentStore?.description || locationLabel) ? (
          <div className="mb-4 rounded-lg border border-border/70 bg-card/70 p-4">
            {locationLabel ? (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{locationLabel}</span>
              </div>
            ) : null}
            {currentStore?.description ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {currentStore.description}
              </p>
            ) : null}
          </div>
        ) : null}

        {showSearch ? (
          <div className="mt-2 mb-6">
            <SearchBar className="w-full" />
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2 pb-6" aria-label="Mobile navigation">
          <Link
            to={homeLink.to}
            className={`rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-all ${
              location.pathname === homePath
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            {homeLink.label}
          </Link>

          {shopLink ? (
            experience.useCatalogDropdown ? (
              <Collapsible open={shopOpen} onOpenChange={setShopOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-semibold text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all">
                  {shopLabel}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${shopOpen ? "rotate-180 text-primary" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 ml-4 flex flex-col gap-1 border-l-2 border-white/5 pl-4">
                  <Link
                    to={shopLink.to}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    All {shopLabel}
                  </Link>
                  {shopLinks.map((link) => (
                    <Link
                      key={link.label}
                      to={link.to}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mt-2 rounded-lg border border-border/60 bg-card/60 px-3 py-3 text-xs leading-5 text-muted-foreground">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Start with what matters most
                    </span>
                    <p className="mt-1">Lead with the clearest categories first so shoppers are not forced to guess where to begin.</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Link
                to={shopLink.to}
                className={`rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-all ${
                  location.pathname.startsWith(shopLink.to)
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {shopLabel}
              </Link>
            )
          ) : null}

          {secondaryLinks.map((link) => (
            link.children?.length ? (
              <Collapsible key={link.to} open={pageMenuOpen === link.to} onOpenChange={(open) => setPageMenuOpen(open ? link.to : null)}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-semibold text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all">
                  {link.label}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${pageMenuOpen === link.to ? "rotate-180 text-primary" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 ml-4 flex flex-col gap-1 border-l-2 border-white/5 pl-4">
                  {link.children.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      {child.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
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
            )
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-6 flex flex-col gap-2">
          {showAccount ? (
            <Link
              to={user ? storefrontPath("/account", currentStore?.slug) : authPath}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
            >
              <User className="h-5 w-5 text-primary/80" />
              {user ? `My ${experience.accountLabel}` : "Sign In"}
            </Link>
          ) : null}
          {showWishlist ? (
            <Link
              to={storefrontPath("/wishlist", currentStore?.slug)}
              className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
            >
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-primary/80" />
                {experience.wishlistLabel}
              </div>
              {wishlistCount > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {wishlistCount}
                </span>
              )}
            </Link>
          ) : null}
          {showCart ? (
            <Link
              to={storefrontPath("/cart", currentStore?.slug)}
              className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-primary/80" />
                {experience.cartLabel}
              </div>
              {totalItems > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Link>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
