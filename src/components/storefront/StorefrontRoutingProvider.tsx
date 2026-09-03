"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isDedicatedStorefrontHost } from "@/lib/slug";
import {
  toCanonicalStorefrontPath,
  toPublicStorefrontPath,
  type StorefrontRoutingMode,
} from "@/lib/storefront-routing";

type StorefrontRoutingContextValue = {
  mode: StorefrontRoutingMode;
  storeSlug: string | null;
};

const StorefrontRoutingContext = createContext<StorefrontRoutingContextValue>({
  mode: "scoped",
  storeSlug: null,
});

export function StorefrontRoutingProvider({
  children,
  storeSlug,
}: {
  children: React.ReactNode;
  storeSlug: string;
}) {
  const [mode, setMode] = useState<StorefrontRoutingMode>("scoped");

  useEffect(() => {
    setMode(isDedicatedStorefrontHost(storeSlug) ? "dedicated" : "scoped");
  }, [storeSlug]);

  return (
    <StorefrontRoutingContext.Provider value={{ mode, storeSlug }}>
      {children}
    </StorefrontRoutingContext.Provider>
  );
}

export function useStorefrontRouting() {
  return useContext(StorefrontRoutingContext);
}

export function useCanonicalStorefrontPath(path: string) {
  const { storeSlug } = useStorefrontRouting();
  return storeSlug ? toCanonicalStorefrontPath(path, storeSlug) : path;
}

export function usePublicStorefrontPath(path: string) {
  const { mode, storeSlug } = useStorefrontRouting();
  return storeSlug ? toPublicStorefrontPath(path, storeSlug, mode) : path;
}
