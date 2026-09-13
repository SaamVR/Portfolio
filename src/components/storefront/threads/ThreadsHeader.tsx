"use client";

import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useAuth } from "@/hooks/auth-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

export function ThreadsHeader({ embedded = false }: { embedded?: boolean }) {
  const store = useOptionalStore();
  const { totalItems, setIsCartOpen } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const home = storefrontPath("/", store?.slug);
  const shop = storefrontPath("/shop", store?.slug);
  const isReferencePreview = store?.id === "preview-threads";
  const brandName = isReferencePreview ? "CHAPCHITRA" : store?.name || "THREADS";
  const nav = [
    ["Shop", shop],
    ["Categories", `${home}#categories`],
    ["Our Story", storefrontPath("/about", store?.slug)],
    ["Journal", storefrontPath("/blog", store?.slug)],
  ] as const;

  const brandSubmark = isReferencePreview ? "ছাপচিত্র" : "Art · Culture · Everyday";

  return (
    <>
      <header
        className={`${embedded ? "relative" : "sticky top-0"} z-50 border-b border-border/70 bg-background/95 backdrop-blur-md`}
      >
        <div className="border-b border-primary-foreground/10 bg-primary text-primary-foreground">
          <div className="mx-auto flex h-7 max-w-[1280px] items-center justify-between gap-4 overflow-hidden px-4 text-[7px] font-semibold uppercase tracking-[.12em] sm:px-5 md:px-8 md:text-[8px]">
            <span className="truncate">Wear your story · Original art · Everyday pieces</span>
            <span className="hidden shrink-0 text-primary-foreground/70 sm:inline">Thoughtfully designed</span>
          </div>
        </div>

        <div className="mx-auto grid h-[58px] max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-5 md:h-[64px] md:px-8">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-11 w-11 place-items-center lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <Link to={home} className="hidden lg:block">
              <div className="font-serif text-[20px] font-semibold uppercase leading-[.9] tracking-[-.04em]">
                {brandName}
              </div>
              <div className="mt-1 text-center text-[6px] uppercase leading-none tracking-[.12em] text-muted-foreground">
                {brandSubmark}
              </div>
            </Link>
          </div>
          <nav
            className="hidden items-center gap-7 text-[10px] font-semibold lg:flex"
            aria-label="Threads navigation"
          >
            {nav.map(([label, href]) => (
              <Link
                key={label}
                to={href}
                className="whitespace-nowrap transition hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link to={home} className="text-center lg:hidden">
            <div className="font-serif text-[17px] font-semibold uppercase leading-[.9] tracking-[-.035em]">
              {brandName}
            </div>
            <div className="mt-1 text-[5px] uppercase leading-none tracking-[.1em] text-muted-foreground sm:text-[6px]">
              {brandSubmark}
            </div>
          </Link>
          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="grid h-11 w-11 place-items-center"
              aria-label="Search"
            >
              <Search className="h-[17px] w-[17px]" />
            </button>
            <Link
              to={
                user
                  ? storefrontPath("/account", store?.slug)
                  : storefrontPath(
                      `/auth?next=${encodeURIComponent(storefrontPath("/account", store?.slug))}`,
                      store?.slug,
                    )
              }
              className="hidden h-11 w-11 place-items-center sm:grid"
              aria-label="Account"
            >
              <User className="h-[17px] w-[17px]" />
            </Link>
            <Link
              to={storefrontPath("/wishlist", store?.slug)}
              className="relative hidden h-11 w-11 place-items-center sm:grid"
              aria-label="Wishlist"
            >
              <Heart className="h-[17px] w-[17px]" />
              {mounted && wishlistCount > 0 ? (
                <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">
                  {wishlistCount}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative grid h-11 w-11 place-items-center"
              aria-label="Open bag"
            >
              <ShoppingBag className="h-[17px] w-[17px]" />
              {mounted && totalItems > 0 ? (
                <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">
                  {totalItems}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        {searchOpen ? (
          <div className="border-t border-border/70 bg-background px-4 py-3">
            <form
              action={shop}
              className="mx-auto flex max-w-2xl items-center border-b border-foreground/25"
            >
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                autoFocus
                placeholder="Search products"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </form>
          </div>
        ) : null}
      </header>
      {menuOpen ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            className="absolute inset-0 bg-foreground/35"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu overlay"
          />
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-background p-6 shadow-2xl">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <div className="font-serif text-2xl uppercase leading-none">
                  {brandName}
                </div>
                <div className="mt-1 text-[8px] uppercase tracking-[.12em] text-muted-foreground">
                  {brandSubmark}
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="grid h-11 w-11 place-items-center"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav>
              {nav.map(([label, href]) => (
                <Link
                  key={label}
                  to={href}
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-border py-4 text-lg"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
