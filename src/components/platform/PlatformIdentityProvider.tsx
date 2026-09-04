"use client";

import { createContext, useContext, type ReactNode } from "react";

export type PlatformIdentityValue = {
  siteName: string;
  legalOperatorName: string | null;
};

const fallback: PlatformIdentityValue = { siteName: "EZComo", legalOperatorName: null };
const PlatformIdentityContext = createContext<PlatformIdentityValue>(fallback);

export function PlatformIdentityProvider({ identity, children }: { identity: PlatformIdentityValue; children: ReactNode }) {
  return <PlatformIdentityContext.Provider value={identity}>{children}</PlatformIdentityContext.Provider>;
}

export function usePlatformIdentity() {
  return useContext(PlatformIdentityContext);
}
