"use client";

import type { CSSProperties, ReactNode } from "react";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useOptionalStore } from "@/components/storefront/store-context";
import { ThreadsHeader } from "@/components/storefront/threads/ThreadsHeader";
import { ThreadsFooter } from "@/components/storefront/threads/ThreadsFooter";

const referencePalette = {
  "--background": "42 38% 97%",
  "--foreground": "165 26% 12%",
  "--card": "42 42% 99%",
  "--card-foreground": "165 26% 12%",
  "--popover": "42 42% 99%",
  "--popover-foreground": "165 26% 12%",
  "--primary": "160 58% 18%",
  "--primary-foreground": "42 42% 99%",
  "--secondary": "38 31% 91%",
  "--secondary-foreground": "165 26% 12%",
  "--muted": "36 23% 84%",
  "--muted-foreground": "158 10% 36%",
  "--accent": "17 48% 48%",
  "--accent-foreground": "42 42% 99%",
  "--border": "35 20% 82%",
  "--input": "35 20% 82%",
  "--ring": "160 58% 18%",
} as CSSProperties;

export function ThreadsShell({
  children,
  embedded = false,
  contentAsMain = true,
}: {
  children: ReactNode;
  embedded?: boolean;
  contentAsMain?: boolean;
}) {
  const store = useOptionalStore();
  const style = store?.id === "preview-threads" ? referencePalette : undefined;
  return (
    <div
      style={style}
      data-storefront-template="threads"
      data-threads-presentation="chapchitra-editorial"
      className="min-h-screen overflow-x-clip bg-background text-foreground antialiased"
    >
      {!embedded ? (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-background focus:px-4 focus:py-3"
        >
          Skip to content
        </a>
      ) : null}
      <ThreadsHeader embedded={embedded} />
      {contentAsMain ? (
        <main id="main-content">{children}</main>
      ) : (
        <div id="main-content">{children}</div>
      )}
      <ThreadsFooter />
      {!embedded ? (
        <>
          <CartDrawer />
          <WhatsAppButton />
        </>
      ) : null}
    </div>
  );
}
