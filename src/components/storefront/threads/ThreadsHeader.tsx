"use client";

import { useEffect, useState } from "react";
import { Heart, HelpCircle, Menu, Search, ShoppingBag, User, X } from "lucide-react";
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
  const isReferencePreview = store?.id === "preview-threads";
  const brandName = isReferencePreview ? "EZCOMO" : (store?.name || "EZCOMO");
  const categoryNav = categories.slice(0, 5).map((category) => [category.name, `${shop}?category=${encodeURIComponent(category.name)}`] as const);
  const nav = isReferencePreview
    ? ([
        ["Women", `${shop}?category=Women`],
        ["Men", `${shop}?category=Men`],
        ["Accessories", `${shop}?category=Accessories`],
        ["Home & Living", `${shop}?category=Home%20%26%20Living`],
        ["Sale", `${shop}?sale=1`],
        ["New", `${shop}?sort=newest`],
        ["Stories", storefrontPath("/about", store?.slug)],
      ] as const)
    : ([
        ...categoryNav,
        ["New", `${shop}?sort=newest`] as const,
        ["Stories", storefrontPath("/about", store?.slug)] as const,
      ]);

  return <>
    <div className="hidden h-8 items-center justify-between bg-primary px-8 text-[10px] text-primary-foreground md:flex lg:px-14">
      <div className="flex items-center gap-7">{isReferencePreview ? <><span>♧ &nbsp; Free shipping on orders over ৳2000</span><span>♡ &nbsp; Easy returns within 14 days</span></> : <><span>♧ &nbsp; Thoughtful shopping with {brandName}</span><span>♡ &nbsp; Secure checkout and order support</span></>}</div>
      <div className="flex items-center gap-4"><Link to={storefrontPath("/track-order", store?.slug)}>Track Order</Link><span className="opacity-35">|</span><Link to={storefrontPath("/faq", store?.slug)} className="flex items-center gap-1"><HelpCircle className="h-3 w-3" /> Help</Link><span className="opacity-35">|</span><span>EN⌄</span></div>
    </div>
    <header className={`${embedded ? "relative" : "sticky top-0"} z-50 border-b border-border bg-background/95 backdrop-blur`}>
      <div className="mx-auto grid h-[58px] max-w-[1480px] grid-cols-[1fr_auto_1fr] items-center px-4 md:h-[64px] md:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <Link to={home} className="hidden sm:block">
            <div className="font-serif text-[25px] font-semibold uppercase leading-none tracking-[-.04em]">{brandName}</div>
            <div className="mt-1 text-[6px] uppercase tracking-[.17em] text-muted-foreground">People · Places · A Brighter Tomorrow</div>
          </Link>
        </div>
        <nav className="hidden items-center gap-6 text-[11px] font-semibold lg:flex" aria-label="Threads navigation">
          {nav.map(([label, href]) => <Link key={label} to={href} className="whitespace-nowrap transition hover:text-primary">{label}</Link>)}
        </nav>
        <Link to={home} className="truncate text-center font-serif text-[21px] font-semibold uppercase tracking-[-.035em] sm:hidden">{brandName}</Link>
        <div className="flex items-center justify-end gap-0.5">
          <button type="button" onClick={() => setSearchOpen(v => !v)} className="grid h-11 w-11 place-items-center" aria-label="Search"><Search className="h-[18px] w-[18px]" /></button>
          <Link to={user ? storefrontPath("/account", store?.slug) : storefrontPath(`/auth?next=${encodeURIComponent(storefrontPath("/account", store?.slug))}`, store?.slug)} className="hidden h-11 w-11 place-items-center sm:grid" aria-label="Account"><User className="h-[18px] w-[18px]" /></Link>
          <Link to={storefrontPath("/wishlist", store?.slug)} className="relative hidden h-11 w-11 place-items-center sm:grid" aria-label="Wishlist"><Heart className="h-[18px] w-[18px]" />{mounted && wishlistCount > 0 ? <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">{wishlistCount}</span> : null}</Link>
          <button type="button" onClick={() => setIsCartOpen(true)} className="relative grid h-11 w-11 place-items-center" aria-label="Open bag"><ShoppingBag className="h-[18px] w-[18px]" />{mounted && totalItems > 0 ? <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">{totalItems}</span> : null}</button>
        </div>
      </div>
      {searchOpen ? <div className="border-t border-border bg-background px-4 py-3"><form action={shop} className="mx-auto flex max-w-2xl items-center border-b border-foreground/25"><Search className="mr-2 h-4 w-4 text-muted-foreground" /><input name="q" autoFocus placeholder="Search products" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></form></div> : null}
    </header>
    {menuOpen ? <div className="fixed inset-0 z-[90] lg:hidden"><button className="absolute inset-0 bg-foreground/35" onClick={() => setMenuOpen(false)} aria-label="Close menu overlay" /><aside className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-background p-6 shadow-2xl"><div className="mb-7 flex items-center justify-between"><span className="font-serif text-2xl uppercase">{brandName}</span><button onClick={() => setMenuOpen(false)} className="grid h-11 w-11 place-items-center" aria-label="Close menu"><X className="h-5 w-5" /></button></div><nav>{nav.map(([label, href]) => <Link key={label} to={href} onClick={() => setMenuOpen(false)} className="block border-b border-border py-4 text-lg">{label}</Link>)}</nav></aside></div> : null}
  </>;
}