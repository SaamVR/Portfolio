"use client";

import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useAuth } from "@/hooks/auth-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProductCategories } from "@/hooks/useProductCategories";
import { storefrontPath } from "@/lib/slug";

export function ThreadsHeader({ embedded = false }: { embedded?: boolean }) {
  const store = useOptionalStore();
  const { totalItems, setIsCartOpen } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { data: categories = [] } = useProductCategories(store?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const home = storefrontPath("/", store?.slug);
  const shop = storefrontPath("/shop", store?.slug);
  const announcement = store?.siteSettings?.announcement_bar as { enabled?: boolean; text?: string } | undefined;
  const showAnnouncement = announcement?.enabled !== false && Boolean(announcement?.text?.trim());
  const nav = [
    { label: "New In", href: `${shop}?sort=newest` },
    { label: "Shop", href: shop },
    ...categories.slice(0, 3).map((category) => ({ label: category.name, href: `${shop}?category=${encodeURIComponent(category.name)}` })),
    { label: "Our Story", href: storefrontPath("/about", store?.slug) },
  ];

  return (
    <>
      {showAnnouncement ? <div className="bg-foreground px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-background">{announcement!.text}</div> : null}
      <header className={`${embedded ? "relative" : "sticky top-0"} z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl`}>
        <div className="mx-auto grid h-[70px] max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center px-4 md:h-[78px] md:px-8 lg:px-12">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center lg:hidden" aria-label="Open menu"><Menu className="h-[19px] w-[19px]" /></button>
            <nav className="hidden items-center gap-6 text-[11px] font-semibold uppercase tracking-[.14em] lg:flex" aria-label="Threads navigation">
              {nav.slice(0, 4).map((item) => <Link key={`${item.label}-${item.href}`} to={item.href} className="transition hover:text-primary">{item.label}</Link>)}
            </nav>
          </div>

          <Link to={home} className="max-w-[42vw] truncate text-center text-[22px] font-black uppercase tracking-[-.045em] text-foreground md:text-[26px]">{store?.name || "Threads"}</Link>

          <div className="flex items-center justify-end gap-0.5">
            <button type="button" onClick={() => setSearchOpen((value) => !value)} className="grid h-11 w-11 place-items-center" aria-label="Search"><Search className="h-[18px] w-[18px]" /></button>
            <Link to={storefrontPath("/wishlist", store?.slug)} className="relative hidden h-11 w-11 place-items-center sm:grid" aria-label="Wishlist"><Heart className="h-[18px] w-[18px]" />{mounted && wishlistCount > 0 ? <span className="absolute right-1 top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">{wishlistCount}</span> : null}</Link>
            <Link to={user ? storefrontPath("/account", store?.slug) : storefrontPath(`/auth?next=${encodeURIComponent(storefrontPath("/account", store?.slug))}`, store?.slug)} className="hidden h-11 w-11 place-items-center sm:grid" aria-label="Account"><User className="h-[18px] w-[18px]" /></Link>
            <button type="button" onClick={() => setIsCartOpen(true)} className="relative grid h-11 w-11 place-items-center" aria-label="Open bag"><ShoppingBag className="h-[18px] w-[18px]" />{mounted && totalItems > 0 ? <span className="absolute right-1 top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">{totalItems}</span> : null}</button>
          </div>
        </div>
        {searchOpen ? <div className="border-t border-border/70 px-4 py-4 md:px-8"><form action={shop} method="get" className="mx-auto flex max-w-3xl items-center rounded-full border border-border bg-card px-4"><Search className="mr-3 h-4 w-4 text-muted-foreground" /><input name="q" autoFocus placeholder="Search the collection" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /><button type="button" onClick={() => setSearchOpen(false)} className="grid h-10 w-10 place-items-center" aria-label="Close search"><X className="h-4 w-4" /></button></form></div> : null}
      </header>

      {menuOpen ? <div className="fixed inset-0 z-[90] lg:hidden"><button className="absolute inset-0 bg-foreground/35" onClick={() => setMenuOpen(false)} aria-label="Close menu overlay" /><aside className="absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto bg-background p-6 shadow-2xl"><div className="mb-10 flex items-center justify-between"><span className="text-xl font-black uppercase tracking-[-.04em]">{store?.name || "Threads"}</span><button onClick={() => setMenuOpen(false)} className="grid h-11 w-11 place-items-center" aria-label="Close menu"><X className="h-5 w-5" /></button></div><nav className="space-y-1">{nav.map((item) => <Link key={`${item.label}-${item.href}`} to={item.href} onClick={() => setMenuOpen(false)} className="block border-b border-border/70 py-4 text-xl font-semibold tracking-[-.03em]">{item.label}</Link>)}</nav></aside></div> : null}
    </>
  );
}
