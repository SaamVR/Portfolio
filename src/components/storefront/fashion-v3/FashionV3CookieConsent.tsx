"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

export function FashionV3CookieConsent() {
  const store = useOptionalStore();
  const storageKey = getScopedStorefrontStorageKey("cookie-consent", store?.id);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    const timer = window.setTimeout(() => setVisible(true), 1800);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const choose = (value: "accepted" | "declined") => {
    localStorage.setItem(storageKey, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-border bg-background px-5 py-5 shadow-[0_-12px_40px_rgba(0,0,0,0.08)] md:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl pr-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Privacy</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">We use cookies to support the storefront experience and understand site traffic. Choose whether to allow optional cookies.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => choose("declined")} className="min-h-11 flex-1 border border-foreground px-5 text-xs font-semibold uppercase tracking-[0.12em] md:flex-none">Decline</button>
          <button onClick={() => choose("accepted")} className="min-h-11 flex-1 bg-primary px-5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground md:flex-none">Accept all</button>
        </div>
        <button onClick={() => choose("declined")} className="absolute right-2 top-2 grid h-10 w-10 place-items-center md:right-4" aria-label="Close privacy notice"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
