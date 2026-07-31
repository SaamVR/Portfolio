import { useEffect, useState, useCallback, useRef, type ReactNode, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { AuthContext, type AppRole, type AuthRecoveryState, type PlatformRole, type StoreMembership, type StoreRole } from "@/hooks/auth-context";

const ACTIVE_STORE_STORAGE_KEY = "commerce-engine-active-store-id";
const ACCESS_CACHE_STORAGE_KEY = "commerce-engine-access-cache";
const ROLE_FETCH_TIMEOUT_MS = 20_000;
const VISIBILITY_REFRESH_COOLDOWN_MS = 5_000;
const SESSION_CLEAR_GRACE_MS = 1_500;

type ResolvedAccessState = {
  memberships: StoreMembership[];
  resolvedStoreId: string | null;
  nextStoreRole: StoreRole;
  nextPlatformRole: PlatformRole;
  nextRole: AppRole;
};

type MembershipAccessRow = Pick<Tables<"store_memberships">, "role" | "store_id">;
type OwnedStoreAccessRow = Pick<Tables<"stores">, "id">;

type CachedAccessState = ResolvedAccessState & {
  userId: string;
  updatedAt: string;
};

export function deriveAppRole(nextPlatformRole: PlatformRole, nextStoreRole: StoreRole): AppRole {
  if (nextPlatformRole) {
    if (["super_admin", "admin", "billing_admin", "support_agent"].includes(nextPlatformRole)) {
      return "admin";
    }
    if (nextPlatformRole === "co_admin") {
      return "co_admin";
    }
  }

  if (nextStoreRole) {
    return nextStoreRole === "viewer" ? "co_admin" : "admin";
  }

  return null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function readCachedAccessState(userId: string): ResolvedAccessState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACCESS_CACHE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedAccessState>;
    if (parsed.userId !== userId || !Array.isArray(parsed.memberships)) {
      return null;
    }

    return {
      memberships: parsed.memberships,
      resolvedStoreId: typeof parsed.resolvedStoreId === "string" ? parsed.resolvedStoreId : null,
      nextStoreRole: (parsed.nextStoreRole as StoreRole) ?? null,
      nextPlatformRole: (parsed.nextPlatformRole as PlatformRole) ?? null,
      nextRole: (parsed.nextRole as AppRole) ?? null,
    };
  } catch {
    return null;
  }
}

function writeCachedAccessState(userId: string, resolved: ResolvedAccessState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    ACCESS_CACHE_STORAGE_KEY,
    JSON.stringify({
      userId,
      updatedAt: new Date().toISOString(),
      ...resolved,
    } satisfies CachedAccessState),
  );
}

function clearCachedAccessState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_CACHE_STORAGE_KEY);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [platformRole, setPlatformRole] = useState<PlatformRole>(null);
  const [storeRole, setStoreRole] = useState<StoreRole>(null);
  const [storeMemberships, setStoreMemberships] = useState<StoreMembership[]>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRecovery, setAuthRecovery] = useState<AuthRecoveryState>({
    reason: "restoring",
    usingCachedAccess: false,
    detail: null,
  });
  const mountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);
  const permissionRequestIdRef = useRef(0);
  const blockingPermissionRequestIdRef = useRef<number | null>(null);
  const lastPassiveRefreshAtRef = useRef(0);
  const passivePermissionRefreshRef = useRef<Promise<void> | null>(null);
  const initializingAuthRef = useRef(false);
  const resolvedAccessStateRef = useRef<ResolvedAccessState | null>(null);
  const sessionClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingSessionClear = useCallback(() => {
    if (sessionClearTimeoutRef.current) {
      clearTimeout(sessionClearTimeoutRef.current);
      sessionClearTimeoutRef.current = null;
    }
  }, []);

  const setActiveStoreId = useCallback((storeId: string | null) => {
    setActiveStoreIdState(storeId);
    if (typeof window === "undefined") return;

    if (storeId) {
      window.localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, storeId);
    } else {
      window.localStorage.removeItem(ACTIVE_STORE_STORAGE_KEY);
    }
  }, []);

  const applyResolvedAccessState = useCallback((resolved: ResolvedAccessState) => {
    resolvedAccessStateRef.current = resolved;
    setActiveStoreId(resolved.resolvedStoreId);
    setStoreMemberships(resolved.memberships);
    setStoreRole(resolved.nextStoreRole);
    setPlatformRole(resolved.nextPlatformRole);
    setRole(resolved.nextRole);
  }, [setActiveStoreId]);

  const setRecoveryState = useCallback((nextState: SetStateAction<AuthRecoveryState>) => {
    setAuthRecovery(nextState);
  }, []);

  const fetchRole = useCallback(async (userId: string): Promise<ResolvedAccessState> => {
    const [
      { data: platformRole, error: platformRoleError },
      { data: memberships, error: membershipsError },
      { data: ownedStores, error: ownedStoresError },
    ] =
      await withTimeout(
        Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("store_memberships")
            .select("role, store_id")
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
          supabase
            .from("stores")
            .select("id")
            .eq("owner_id", userId)
            .order("created_at", { ascending: true }),
        ]),
        ROLE_FETCH_TIMEOUT_MS,
        "Timed out while refreshing account permissions",
      );

    if (platformRoleError) throw platformRoleError;
    if (membershipsError) throw membershipsError;
    if (ownedStoresError) throw ownedStoresError;

    const membershipRows = ((memberships ?? []) as MembershipAccessRow[]).filter(
      (membership): membership is { role: NonNullable<StoreRole>; store_id: string } => Boolean(membership.role && membership.store_id),
    );
    const ownedStoreRows = ((ownedStores ?? []) as OwnedStoreAccessRow[]).filter((store): store is OwnedStoreAccessRow => Boolean(store.id));
    const membershipMap = new Map<string, StoreMembership>();

    membershipRows.forEach((membership) => {
      membershipMap.set(membership.store_id, {
        storeId: membership.store_id,
        role: membership.role,
      });
    });

    ownedStoreRows.forEach((store) => {
      if (!membershipMap.has(store.id)) {
        membershipMap.set(store.id, {
          storeId: store.id,
          role: "owner",
        });
      }
    });

    const mappedMemberships = Array.from(membershipMap.values());
    const preferredStoreId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_STORE_STORAGE_KEY)
        : null;
    const preferredMembership = preferredStoreId
      ? mappedMemberships.find((membership) => membership.storeId === preferredStoreId)
      : null;
    const membership = preferredMembership ?? mappedMemberships[0] ?? null;
    const resolvedStoreId = membership?.storeId ?? null;
    const nextStoreRole = (membership?.role as StoreRole) ?? null;
    const nextPlatformRole = (platformRole?.role as PlatformRole) ?? null;
    const nextRole = deriveAppRole(nextPlatformRole, nextStoreRole);

    return {
      memberships: mappedMemberships,
      resolvedStoreId,
      nextStoreRole,
      nextPlatformRole,
      nextRole,
    };
  }, []);

  const clearAccessState = useCallback((options?: { preserveRecoveryState?: boolean }) => {
    cancelPendingSessionClear();
    resolvedAccessStateRef.current = null;
    setRole(null);
    setPlatformRole(null);
    setStoreRole(null);
    setStoreMemberships([]);
    setActiveStoreId(null);
    if (!options?.preserveRecoveryState) {
      setRecoveryState({
        reason: "restoring",
        usingCachedAccess: false,
        detail: null,
      });
    }
    clearCachedAccessState();
  }, [cancelPendingSessionClear, setActiveStoreId, setRecoveryState]);

  const resolvePermissions = useCallback(
    async (
      nextUserId: string | null,
      options?: {
        blockUi?: boolean;
        preserveExistingOnError?: boolean;
      },
    ) => {
      const requestId = ++permissionRequestIdRef.current;
      const blockUi = options?.blockUi ?? false;
      const preserveExistingOnError = options?.preserveExistingOnError ?? false;

      if (blockUi && mountedRef.current) {
        blockingPermissionRequestIdRef.current = requestId;
        setLoading(true);
      }

      try {
        if (!nextUserId) {
          if (mountedRef.current && requestId === permissionRequestIdRef.current) {
            clearAccessState();
          }
          return;
        }

        const resolved = await fetchRole(nextUserId);
        if (!mountedRef.current || requestId !== permissionRequestIdRef.current) {
          return;
        }

        applyResolvedAccessState(resolved);
        writeCachedAccessState(nextUserId, resolved);
        setRecoveryState({
          reason: resolved.nextRole || resolved.memberships.length > 0 || resolved.nextPlatformRole ? "ready" : "no_store",
          usingCachedAccess: false,
          detail: resolved.nextRole || resolved.memberships.length > 0 || resolved.nextPlatformRole
            ? null
            : "Your account is signed in, but no store workspace is assigned yet.",
        });
      } catch (error) {
        const message = getErrorMessage(error);
        const isTimeout = message.includes("Timed out while refreshing account permissions");
        if (!mountedRef.current || requestId !== permissionRequestIdRef.current) {
          return;
        }

        if (!isTimeout) {
          console.error("Auth permission refresh error:", error);
        }

        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        setRecoveryState({
          reason: offline ? "offline" : "permission_timeout",
          usingCachedAccess: preserveExistingOnError && Boolean(resolvedAccessStateRef.current),
          detail: offline
            ? "Reconnect to the internet to finish restoring dashboard access."
            : message || "The dashboard took too long to restore account permissions.",
        });

        if (!preserveExistingOnError || !nextUserId) {
          clearAccessState({ preserveRecoveryState: true });
        }
      } finally {
        if (blockUi && mountedRef.current && blockingPermissionRequestIdRef.current === requestId) {
          blockingPermissionRequestIdRef.current = null;
          setLoading(false);
        }
      }
    },
    [applyResolvedAccessState, clearAccessState, fetchRole, setRecoveryState],
  );

  const refreshRole = useCallback(async () => {
    if (user) await resolvePermissions(user.id, { blockUi: false, preserveExistingOnError: true });
  }, [resolvePermissions, user]);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      initializingAuthRef.current = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const nextUserId = session?.user?.id ?? null;
        const cachedAccess = nextUserId ? readCachedAccessState(nextUserId) : null;

        if (mountedRef.current) {
          setSession(session);
          setUser(session?.user ?? null);
          userIdRef.current = nextUserId;
          if (cachedAccess) {
            applyResolvedAccessState(cachedAccess);
            setRecoveryState({
              reason: "ready",
              usingCachedAccess: true,
              detail: "Using your last known dashboard access while permissions revalidate.",
            });
            setLoading(false);
          }
        }
        if (cachedAccess) {
          void resolvePermissions(nextUserId, {
            blockUi: false,
            preserveExistingOnError: true,
          });
        } else {
          await resolvePermissions(nextUserId, {
            blockUi: true,
            preserveExistingOnError: false,
          });
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAccessState();
      } finally {
        initializingAuthRef.current = false;
        if (mountedRef.current && blockingPermissionRequestIdRef.current === null) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        if (event === "INITIAL_SESSION" && initializingAuthRef.current) return;
        
        const nextUserId = session?.user?.id ?? null;
        const isSameUser = Boolean(nextUserId && userIdRef.current === nextUserId);

        setSession(session);
        setUser(session?.user ?? null);
        userIdRef.current = nextUserId;
        
        if (session?.user) {
          cancelPendingSessionClear();
          const cachedAccess = readCachedAccessState(session.user.id);
          if (event === "TOKEN_REFRESHED" && isSameUser) {
            if (!resolvedAccessStateRef.current && cachedAccess) {
              applyResolvedAccessState(cachedAccess);
              setRecoveryState({
                reason: "ready",
                usingCachedAccess: true,
                detail: "Using your last known dashboard access while permissions refresh.",
              });
              if (mountedRef.current) setLoading(false);
            }
            return;
          }

          if (!isSameUser) {
            if (cachedAccess) {
              applyResolvedAccessState(cachedAccess);
              setRecoveryState({
                reason: "ready",
                usingCachedAccess: true,
                detail: "Using your last known dashboard access while permissions refresh.",
              });
              if (mountedRef.current) setLoading(false);
            } else {
              clearAccessState();
            }
          }

          const shouldBlockForAccess = !isSameUser && !cachedAccess && !resolvedAccessStateRef.current;
          const refreshPromise = resolvePermissions(session.user.id, {
            blockUi: shouldBlockForAccess,
            preserveExistingOnError: isSameUser,
          });
          if (shouldBlockForAccess) {
            await refreshPromise;
          } else {
            void refreshPromise;
          }
        } else {
          cancelPendingSessionClear();
          sessionClearTimeoutRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            clearAccessState();
            userIdRef.current = null;
            setSession(null);
            setUser(null);
            setRecoveryState({
              reason: "session_expired",
              usingCachedAccess: false,
              detail: "Your admin session expired. Please sign in again.",
            });
            setLoading(false);
          }, SESSION_CLEAR_GRACE_MS);
        }
      }
    );

    const refreshVisiblePermissions = () => {
      const visibleUserId = userIdRef.current;
      if (!visibleUserId) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastPassiveRefreshAtRef.current < VISIBILITY_REFRESH_COOLDOWN_MS) return;
      if (passivePermissionRefreshRef.current) return;

      const refreshPromise = resolvePermissions(visibleUserId, {
        blockUi: false,
        preserveExistingOnError: true,
      }).finally(() => {
        lastPassiveRefreshAtRef.current = Date.now();
        if (passivePermissionRefreshRef.current === refreshPromise) {
          passivePermissionRefreshRef.current = null;
        }
      });

      passivePermissionRefreshRef.current = refreshPromise;
      void refreshPromise;
    };

    const handleVisibilityChange = () => {
      refreshVisiblePermissions();
    };

    const handleWindowFocus = () => {
      refreshVisiblePermissions();
    };

    const handleOnline = () => {
      setRecoveryState((current) => current.reason === "offline"
        ? { reason: "restoring", usingCachedAccess: current.usingCachedAccess, detail: "Connection restored. Retrying dashboard access." }
        : current);
      refreshVisiblePermissions();
    };

    const handleOffline = () => {
      setRecoveryState((current) => ({
        reason: "offline",
        usingCachedAccess: current.usingCachedAccess,
        detail: "Dashboard permissions cannot refresh while this device is offline.",
      }));
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      mountedRef.current = false;
      cancelPendingSessionClear();
      subscription.unsubscribe();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleWindowFocus);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [applyResolvedAccessState, cancelPendingSessionClear, clearAccessState, resolvePermissions, setRecoveryState]);

  const signOut = async () => {
    cancelPendingSessionClear();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    clearAccessState();
    userIdRef.current = null;
  };

  const canManageStore = useCallback(
    (storeId: string) => {
      if (!storeId) return false;
      if (platformRole && ["super_admin", "admin", "billing_admin", "support_agent"].includes(platformRole)) return true;
      return storeMemberships.some(
        (membership) =>
          membership.storeId === storeId &&
          (membership.role === "owner" || membership.role === "admin" || membership.role === "editor"),
      );
    },
    [platformRole, storeMemberships],
  );

  return (
    <AuthContext.Provider value={{ user, session, role, platformRole, storeRole, storeMemberships, activeStoreId, loading, authRecovery, canManageStore, signOut, refreshRole, setActiveStoreId }}>
      {children}
    </AuthContext.Provider>
  );
};

