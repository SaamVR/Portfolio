"use client";

import type { ReactNode } from "react";
import CartDrawer from "@/components/CartDrawer";
import { FashionV3CookieConsent } from "@/components/storefront/fashion-v3/FashionV3CookieConsent";
import WhatsAppButton from "@/components/WhatsAppButton";
import { FashionV3Header } from "@/components/storefront/fashion-v3/FashionV3Header";
import { FashionV3Footer } from "@/components/storefront/fashion-v3/FashionV3Footer";

export function FashionV3Shell({ children, embedded = false }: { children: ReactNode; embedded?: boolean }) {
  return (
    <div data-storefront-template="fashion" data-fashion-presentation="v3" className="min-h-screen bg-[#fbfbf8] text-[#171717] antialiased">
      {!embedded ? <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:bg-white focus:px-4 focus:py-3">Skip to content</a> : null}
      <FashionV3Header embedded={embedded} />
      <main id="main-content">{children}</main>
      <FashionV3Footer />
      {!embedded ? <><CartDrawer /><WhatsAppButton /><FashionV3CookieConsent /></> : null}
    </div>
  );
}
