"use client";

import React from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useStore } from "@/components/storefront/store-context";
import { useCart } from "@/context/useCart";
import { Button } from "@/components/ui/button";
import CartDrawer from "@/components/CartDrawer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { storefrontPath, storePageUrl } from "@/lib/slug";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontBaseTextSize, getStorefrontContainerClass } from "@/lib/storefront-theme-customization";

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const { totalItems, setIsCartOpen } = useCart();
  const { data: themeCustomization } = useStorefrontThemeCustomization(store.id);
  const containerClass = getStorefrontContainerClass(themeCustomization?.container_width);

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{ fontSize: getStorefrontBaseTextSize(themeCustomization?.text_size) }}
    >
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className={`mx-auto flex h-16 items-center justify-between px-4 ${containerClass}`}>
          <Link href={storefrontPath("/", store.slug)} className="font-heading font-bold text-xl tracking-tight">
            <span className="flex items-center gap-3">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={`${store.name} logo`}
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : null}
              <span>{store.name}</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {store.pages.map((page) => (
              <Link
                key={page.slug}
                href={page.isHomepage ? storefrontPath("/", store.slug) : storePageUrl(store.slug, page.slug)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {page.title}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)} className="relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <CartDrawer />
      
      <main className="flex-1 pb-16 md:pb-0" id="main-content">
        {children}
      </main>
      
      <footer className="border-t border-border bg-card py-8 mt-auto">
        <div className={`mx-auto px-4 text-center text-sm text-muted-foreground ${containerClass}`}>
          &copy; {new Date().getFullYear()} {store.name}. All rights reserved.
        </div>
      </footer>
      
      <MobileBottomNav />
    </div>
  );
}
