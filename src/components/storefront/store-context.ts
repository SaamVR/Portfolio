import { createContext, useContext } from "react";
import type { Store } from "@/lib/cms/schema";

export const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error("useStore must be used inside StoreProvider");
  }

  return store;
}

export function useOptionalStore() {
  return useContext(StoreContext);
}
