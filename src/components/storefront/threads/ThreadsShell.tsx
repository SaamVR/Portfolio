"use client";

import type { CSSProperties, ReactNode } from "react";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useOptionalStore } from "@/components/storefront/store-context";
import { ThreadsHeader } from "@/components/storefront/threads/ThreadsHeader";
import { ThreadsFooter } from "@/components/storefront/threads/ThreadsFooter";

const referencePalette = {
  "--background": "40 26% 93%",
  "--foreground": "135 8% 10%",
  "--card": "45 33% 98%",
  "--card-foreground": "135 8% 10%",
  "--popover": "45 33% 98%",
  "--popover-foreground": "135 8% 10%",
  "--primary": "140 28% 15%",
  "--primary-foreground": "45 33% 98%",
  "--secondary": "36 19% 84%",
  "--secondary-foreground": "135 8% 10%",
  "--muted": "35 29% 77%",
  "--muted-foreground": "124 8% 34%",
  "--accent": "140 28% 15%",
  "--accent-foreground": "45 33% 98%",
  "--border": "36 19% 84%",
  "--input": "36 19% 84%",
  "--ring": "140 28% 15%",
} as CSSProperties;

export function ThreadsShell({ children, embedded = false, contentAsMain = true }: { children: ReactNode; embedded?: boolean; contentAsMain?: boolean }) {
  const store = useOptionalStore();
  const style = store?.id === "preview-threads" ? referencePalette : undefined;
  return <div style={style} data-storefront-template="threads" data-threads-presentation="reference-editorial" className="min-h-screen overflow-x-clip bg-background text-foreground antialiased">
    {!embedded ? <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-background focus:px-4 focus:py-3">Skip to content</a> : null}
    <ThreadsHeader embedded={embedded} />
    {contentAsMain ? <main id="main-content">{children}</main> : <div id="main-content">{children}</div>}
    <ThreadsFooter />
    {!embedded ? <><CartDrawer /><WhatsAppButton /></> : null}
  </div>;
}