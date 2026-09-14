"use client";

import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useAuth } from "@/hooks/auth-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildAutoNavbarItems } from "@/lib/cms/page-listing-preferences";
import { storefrontPath } from "@/lib/slug";

type FashionNavSettings = {
  primary_links?: Array<{ label?: string; url?: string; children?: Array<{ label?: string; url?: string }> }>;
  shop_label?: string;
  show_search?: boolean;
  show_account?: boolean;
  show_wishlist?: boolean;
  show_cart?: boolean;
};

type FashionNavItem = { label: string; href: string; children?: Array<{ label: string; href: string }> };

export function FashionV3Header({ embedded = false }: { embedded?: boolean }) {
  const store = useOptionalStore();
  const { totalItems, setIsCartOpen } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { data: categories = [] } = useProductCategories(store?.id);
  const { data: products = [] } = useProducts(store?.id);
  const { data: navigation } = useSiteSettings<FashionNavSettings>("navigation", store?.id);
  const categoryNames = categories.length > 0
    ? categories.map((category) => category.name)
    : Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const announcement = store?.siteSettings?.announcement_bar as { enabled?: boolean; text?: string } | undefined;
  const showAnnouncement = announcement?.enabled !== false && Boolean(announcement?.text?.trim());
  const home = storefrontPath("/", store?.slug);
  const shop = storefrontPath("/shop", store?.slug);
  const fallbackNav: FashionNavItem[] = [
    { label: "New In", href: `${shop}?sort=newest` },
    { label: navigation?.shop_label?.trim() || "Shop", href: shop },
    { label: "About", href: storefrontPath("/about", store?.slug) },
    { label: "Journal", href: storefrontPath("/blog", store?.slug) },
  ];
  const manualNav: FashionNavItem[] = navigation?.primary_links?.length
    ? navigation.primary_links
        .filter((item): item is { label: string; url: string; children?: Array<{ label?: string; url?: string }> } => Boolean(item?.label && item?.url))
        .map((item) => ({
          label: item.label,
          href: storefrontPath(item.url, store?.slug),
          children: item.children
            ?.filter((child): child is { label: string; url: string } => Boolean(child?.label && child?.url))
            .map((child) => ({ label: child.label, href: storefrontPath(child.url, store?.slug) })),
        }))
    : fallbackNav;
  const autoNav = buildAutoNavbarItems(store).map((item) => ({
    label: item.label,
    href: storefrontPath(item.url, store?.slug),
    children: item.children?.map((child) => ({ label: child.label, href: storefrontPath(child.url, store?.slug) })),
  }));
  const nav = [...manualNav, ...autoNav.filter((item) => !manualNav.some((manual) => manual.href === item.href))];
  const showSearch = navigation?.show_search ?? true;
  const showAccount = navigation?.show_account ?? true;
  const showWishlist = navigation?.show_wishlist ?? true;
  const showCart = navigation?.show_cart ?? true;

  return (
    <>
      {showAnnouncement ? <div className="bg-foreground px-4 py-2 text-center text-[11px] font-medium tracking-[0.08em] text-background">{announcement!.text}</div> : null}
      <header className={`${embedded ? "relative" : "sticky top-0"} z-50 border-b border-border bg-background/95 backdrop-blur-md`}>
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 md:h-[72px] md:px-8 lg:px-12">
          <div className="flex min-w-0 items-center gap-3 md:w-1/3">
            <button type="button" onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center md:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <Link to={home} className="truncate text-[18px] font-semibold tracking-[-0.02em] text-foreground md:text-[21px]">{store?.name || "Store"}</Link>
          </div>

          <nav className="hidden items-center justify-center gap-7 text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground md:flex" aria-label="Fashion navigation">
            {nav.slice(0, 6).map((item) => (
              <div key={`${item.label}-${item.href}`} className="group relative">
                <Link to={item.href} className="block border-b border-transparent py-6 transition hover:border-primary">{item.label}</Link>
                {item.children?.length ? <div className="invisible absolute left-1/2 top-full min-w-52 -translate-x-1/2 border border-border bg-background p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">{item.children.map((child) => <Link key={`${child.label}-${child.href}`} to={child.href} className="block px-3 py-2.5 text-[11px] tracking-[0.08em] hover:bg-muted">{child.label}</Link>)}</div> : null}
              </div>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-0.5 md:w-1/3">
            {showSearch ? <button type="button" onClick={() => setSearchOpen((value) => !value)} className="grid h-11 w-11 place-items-center" aria-label="Search"><Search className="h-[18px] w-[18px]" /></button> : null}
            {showWishlist ? <Link to={storefrontPath("/wishlist", store?.slug)} className="relative hidden h-11 w-11 place-items-center sm:grid" aria-label="Wishlist"><Heart className="h-[18px] w-[18px]" />{mounted && wishlistCount > 0 ? <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">{wishlistCount}</span> : null}</Link> : null}
            {showAccount ? <Link to={user ? storefrontPath("/account", store?.slug) : storefrontPath(`/auth?next=${encodeURIComponent(storefrontPath("/account", store?.slug))}`, store?.slug)} className="hidden h-11 w-11 place-items-center sm:grid" aria-label="Account"><User className="h-[18px] w-[18px]" /></Link> : null}
            {showCart ? <button type="button" onClick={() => setIsCartOpen(true)} className="relative grid h-11 w-11 place-items-center" aria-label="Open bag"><ShoppingBag className="h-[18px] w-[18px]" />{mounted && totalItems > 0 ? <span className="absolute right-1 top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">{totalItems}</span> : null}</button> : null}
          </div>
        </div>

        {searchOpen ? (
          <div className="border-t border-border bg-background px-4 py-4 md:px-8">
            <form action={shop} method="get" className="mx-auto flex max-w-3xl items-center border-b border-foreground pb-2">
              <Search className="mr-3 h-4 w-4 text-muted-foreground" />
              <input name="q" autoFocus placeholder="Search products" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              <button type="button" onClick={() => setSearchOpen(false)} className="grid h-8 w-8 place-items-center" aria-label="Close search"><X className="h-4 w-4" /></button>
            </form>
          </div>
        ) : null}
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[90] md:hidden">
          <button className="absolute inset-0 bg-foreground/35" onClick={() => setMenuOpen(false)} aria-label="Close menu overlay" />
          <aside className="absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto bg-background p-6 shadow-2xl">
            <div className="mb-10 flex items-center justify-between"><span className="text-lg font-semibold">{store?.name || "Store"}</span><button onClick={() => setMenuOpen(false)} className="grid h-11 w-11 place-items-center" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
            <nav className="space-y-1 border-b border-border pb-8">
              {nav.map((item) => <div key={`${item.label}-${item.href}`}><Link to={item.href} onClick={() => setMenuOpen(false)} className="block py-3 text-2xl font-medium tracking-[-0.03em] text-foreground">{item.label}</Link>{item.children?.map((child) => <Link key={`${child.label}-${child.href}`} to={child.href} onClick={() => setMenuOpen(false)} className="block border-t border-border py-2.5 pl-4 text-sm text-muted-foreground">{child.label}</Link>)}</div>)}
            </nav>
            {categoryNames.length > 0 ? <div className="py-8"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Collections</p>{categoryNames.slice(0, 8).map((category) => <Link key={category} to={`${shop}?category=${encodeURIComponent(category)}`} onClick={() => setMenuOpen(false)} className="block border-t border-border py-3 text-sm text-foreground/80">{category}</Link>)}</div> : null}
            <div className="mt-6 flex gap-5 text-sm">{showAccount ? <Link to={storefrontPath("/account", store?.slug)}>Account</Link> : null}{showWishlist ? <Link to={storefrontPath("/wishlist", store?.slug)}>Wishlist</Link> : null}</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
