import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "co_admin" | null;
export type StoreRole = "owner" | "admin" | "editor" | "viewer" | null;
export type PlatformRole = "admin" | "co_admin" | null;
export type StoreMembership = {
  storeId: string;
  role: NonNullable<StoreRole>;
};
export type AuthRecoveryReason =
  | "ready"
  | "restoring"
  | "offline"
  | "permission_timeout"
  | "no_store"
  | "session_expired";
export type AuthRecoveryState = {
  reason: AuthRecoveryReason;
  usingCachedAccess: boolean;
  detail?: string | null;
};

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  platformRole: PlatformRole;
  storeRole: StoreRole;
  storeMemberships: StoreMembership[];
  activeStoreId: string | null;
  loading: boolean;
  authRecovery: AuthRecoveryState;
  canManageStore: (storeId: string) => boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  setActiveStoreId: (id: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  platformRole: null,
  storeRole: null,
  storeMemberships: [],
  activeStoreId: null,
  loading: true,
  authRecovery: {
    reason: "restoring",
    usingCachedAccess: false,
    detail: null,
  },
  canManageStore: () => false,
  signOut: async () => {},
  refreshRole: async () => {},
  setActiveStoreId: () => {},
});

export const useAuth = () => useContext(AuthContext);

