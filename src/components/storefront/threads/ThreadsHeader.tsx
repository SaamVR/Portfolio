"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
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
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => menuCloseButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  const home = storefrontPath("/", store?.slug);
  const shop = storefrontPath("/shop", store?.slug);
  const account = user
    ? storefrontPath("/account", store?.slug)
    : storefrontPath(
        `/auth?next=${encodeURIComponent(storefrontPath("/account", store?.slug))}`,
        store?.slug,
      );
  const wishlist = storefrontPath("/wishlist", store?.slug);
  const isReferencePreview = store?.id === "preview-threads";
  const brandName = isReferencePreview ? "EZCOMO" : store?.name || "THREADS";
  const brandSubmark = isReferencePreview
    ? "PEOPLE · PLACES · A BRIGHTER TOMORROW"
    : "ART · CULTURE · EVERYDAY";
  const defaultNav = [
    ["Shop", shop],
    ["Categories", `${home}#categories`],
    ["Our Story", storefrontPath("/about", store?.slug)],
    ["Journal", storefrontPath("/blog", store?.slug)],
  ] as const;
  const referenceNav = [
    ["Women", `${shop}?category=${encodeURIComponent("Women")}`],
    ["Men", `${shop}?category=${encodeURIComponent("Men")}`],
    ["Accessories", `${shop}?category=${encodeURIComponent("Accessories")}`],
    [
      "Home & Living",
      `${shop}?category=${encodeURIComponent("Home & Living")}`,
    ],
    ["Sale", `${shop}?sale=1`],
    ["New", `${shop}?sort=newest`],
    ["Stories", storefrontPath("/blog", store?.slug)],
  ] as const;
  const nav = isReferencePreview ? referenceNav : defaultNav;

  return (
    <>
      <header
        className={`${embedded ? "relative" : "sticky top-0"} z-50 border-b border-border/70 bg-background/95 backdrop-blur-md`}
      >
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto grid min-h-7 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center px-4 text-[8px] sm:px-5 md:px-8 min-[900px]:min-h-5">
            <span className="hidden md:block" />
            <div className="flex items-center justify-center gap-5 whitespace-nowrap text-[8px] font-medium">
              <span>
                {isReferencePreview
                  ? "♧  Free shipping on orders over ৳2000"
                  : "New season · Everyday essentials"}
              </span>
              <span className="hidden sm:inline">
                {isReferencePreview
                  ? "◇  Easy returns within 14 days"
                  : "Thoughtfully designed"}
              </span>
            </div>
            <div className="hidden items-center justify-end gap-3 text-primary-foreground/82 md:flex">
              <Link
                to={storefrontPath("/track-order", store?.slug)}
                className="relative inline-flex h-7 items-center hover:text-primary-foreground before:absolute before:-inset-x-2 before:-inset-y-3 min-[900px]:h-5"
              >
                Track Order
              </Link>
              <span className="opacity-35">|</span>
              <Link
                to={storefrontPath("/faq", store?.slug)}
                className="relative inline-flex h-7 items-center hover:text-primary-foreground before:absolute before:-inset-x-2 before:-inset-y-3 min-[900px]:h-5"
              >
                Help
              </Link>
              <span className="opacity-35">|</span>
              <span className="inline-flex items-center gap-1">
                EN <ChevronDown className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto grid min-h-12 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-5 md:px-8 min-[900px]:min-h-11">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-11 w-11 place-items-center lg:hidden md:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="threads-mobile-menu"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <Link to={home} className="hidden min-h-11 flex-col justify-center md:flex">
              <div className="font-serif text-[25px] font-semibold uppercase leading-[.78] tracking-[-.045em]">
                {brandName}
              </div>
              <div className="mt-1 text-[5px] font-semibold uppercase leading-none tracking-[.16em] text-muted-foreground">
                {brandSubmark}
              </div>
            </Link>
          </div>

          <nav
            className="hidden items-center gap-3 text-[8px] font-semibold md:flex lg:gap-5 lg:text-[9px] xl:gap-7"
            aria-label="Threads navigation"
          >
            {nav.map(([label, href]) => (
              <Link
                key={label}
                to={href}
                className="inline-flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap px-1 transition hover:text-primary min-[900px]:min-h-11"
              >
                {label}
              </Link>
            ))}
          </nav>

          <Link to={home} className="flex min-h-11 flex-col items-center justify-center text-center md:hidden">
            <div className="font-serif text-[20px] font-semibold uppercase leading-[.82] tracking-[-.035em]">
              {brandName}
            </div>
            <div className="mt-1 text-[5px] uppercase leading-none tracking-[.11em] text-muted-foreground">
              {brandSubmark}
            </div>
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="grid h-11 w-11 place-items-center min-[900px]:h-11 min-[900px]:w-11"
              aria-label="Search"
              aria-expanded={searchOpen}
            >
              <Search className="h-[17px] w-[17px]" />
            </button>
            <Link
              to={account}
              className="hidden h-11 w-11 place-items-center sm:grid min-[900px]:h-11 min-[900px]:w-11"
              aria-label="Account"
            >
              <User className="h-[17px] w-[17px]" />
            </Link>
            <Link
              to={wishlist}
              className="relative hidden h-11 w-11 place-items-center sm:grid min-[900px]:h-11 min-[900px]:w-11"
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
              className="relative grid h-11 w-11 place-items-center min-[900px]:h-11 min-[900px]:w-11"
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
          <div className="border-t border-border/70 bg-background px-4 py-2.5">
            <form
              action={shop}
              className="mx-auto flex max-w-2xl items-center border-b border-foreground/25"
            >
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                autoFocus
                placeholder="Search products"
                aria-label="Search products"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </form>
          </div>
        ) : null}
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[90] md:hidden">
          <button
            className="absolute inset-0 bg-foreground/35"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu overlay"
          />
          <aside
            id="threads-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="threads-mobile-menu-title"
            className="absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-y-auto bg-background p-6 shadow-2xl"
          >
            <div className="mb-7 flex items-center justify-between">
              <div>
                <div
                  id="threads-mobile-menu-title"
                  className="font-serif text-2xl uppercase leading-none"
                >
                  {brandName}
                </div>
                <div className="mt-1 text-[7px] uppercase tracking-[.12em] text-muted-foreground">
                  {brandSubmark}
                </div>
              </div>
              <button
                ref={menuCloseButtonRef}
                onClick={() => setMenuOpen(false)}
                className="grid h-11 w-11 place-items-center"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Mobile Threads navigation">
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
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-border pt-5">
              <Link
                to={account}
                onClick={() => setMenuOpen(false)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-border px-3 text-[9px] font-bold uppercase tracking-[.08em]"
              >
                <User className="h-4 w-4" /> Account
              </Link>
              <Link
                to={wishlist}
                onClick={() => setMenuOpen(false)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-border px-3 text-[9px] font-bold uppercase tracking-[.08em]"
              >
                <Heart className="h-4 w-4" /> Wishlist
                {mounted && wishlistCount > 0 ? ` (${wishlistCount})` : ""}
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
