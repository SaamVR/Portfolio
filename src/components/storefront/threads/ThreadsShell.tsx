"use client";

import type { ReactNode } from "react";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { ThreadsHeader } from "@/components/storefront/threads/ThreadsHeader";
import { ThreadsFooter } from "@/components/storefront/threads/ThreadsFooter";

export function ThreadsShell({ children, embedded = false }: { children: ReactNode; embedded?: boolean }) {
  return <div data-storefront-template="threads" data-threads-presentation="earthy-editorial" className="min-h-screen overflow-x-clip bg-background text-foreground antialiased">{!embedded ? <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-background focus:px-4 focus:py-3">Skip to content</a> : null}<ThreadsHeader embedded={embedded} /><main id="main-content">{children}</main><ThreadsFooter />{!embedded ? <><CartDrawer /><WhatsAppButton /></> : null}</div>;
}
