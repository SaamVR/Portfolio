import { useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext, type AppRole, type PlatformRole, type StoreMembership, type StoreRole } from "@/hooks/auth-context";

const ACTIVE_STORE_STORAGE_KEY = "commerce-engine-active-store-id";
const ROLE_FETCH_TIMEOUT_MS = 20_000;
const VISIBILITY_REFRESH_COOLDOWN_MS = 5_000;

type ResolvedAccessState = {
  memberships: StoreMembership[];
  resolvedStoreId: string | null;
  nextStoreRole: StoreRole;
  nextPlatformRole: PlatformRole;
  nextRole: AppRole;
};

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [platformRole, setPlatformRole] = useState<PlatformRole>(null);
  const [storeRole, setStoreRole] = useState<StoreRole>(null);
  const [storeMemberships, setStoreMemberships] = useState<StoreMembership[]>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);
  const permissionRequestIdRef = useRef(0);
  const blockingPermissionRequestIdRef = useRef<number | null>(null);
  const lastPassiveRefreshAtRef = useRef(0);
  const passivePermissionRefreshRef = useRef<Promise<void> | null>(null);

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
    setActiveStoreId(resolved.resolvedStoreId);
    setStoreMemberships(resolved.memberships);
    setStoreRole(resolved.nextStoreRole);
    setPlatformRole(resolved.nextPlatformRole);
    setRole(resolved.nextRole);
  }, [setActiveStoreId]);

  const fetchRole = useCallback(async (userId: string): Promise<ResolvedAccessState> => {
    const [{ data: platformRole, error: platformRoleError }, { data: memberships, error: membershipsError }] =
      await withTimeout(
        Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .maybeSingle(),
          (supabase as any)
            .from("store_memberships")
            .select("role, store_id")
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
        ]),
        ROLE_FETCH_TIMEOUT_MS,
        "Timed out while refreshing account permissions",
      );

    if (platformRoleError) throw platformRoleError;
    if (membershipsError) throw membershipsError;

    const membershipRows = ((memberships ?? []) as Array<{ role: StoreRole; store_id: string }>).filter(
      (membership): membership is { role: NonNullable<StoreRole>; store_id: string } => Boolean(membership.role && membership.store_id),
    );
    const mappedMemberships = membershipRows.map((membership) => ({
      storeId: membership.store_id,
      role: membership.role,
    }));
    const preferredStoreId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_STORE_STORAGE_KEY)
        : null;
    const preferredMembership = preferredStoreId
      ? membershipRows.find((membership) => membership.store_id === preferredStoreId)
      : null;
    const membership = preferredMembership ?? membershipRows[0] ?? null;
    const resolvedStoreId = membership?.store_id ?? null;
    const nextStoreRole = (membership?.role as StoreRole) ?? null;
    const nextPlatformRole = (platformRole?.role as PlatformRole) ?? null;
    let nextRole: AppRole = null;

    if (nextPlatformRole) {
      nextRole = nextPlatformRole;
    } else if (nextStoreRole === "owner" || nextStoreRole === "admin") {
      nextRole = "admin";
    } else if (nextStoreRole === "editor" || nextStoreRole === "viewer") {
      nextRole = "co_admin";
    }

    return {
      memberships: mappedMemberships,
      resolvedStoreId,
      nextStoreRole,
      nextPlatformRole,
      nextRole,
    };
  }, []);

  const clearAccessState = useCallback(() => {
    setRole(null);
    setPlatformRole(null);
    setStoreRole(null);
    setStoreMemberships([]);
    setActiveStoreId(null);
  }, [setActiveStoreId]);

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
      } catch (error) {
        const message = getErrorMessage(error);
        const isTimeout = message.includes("Timed out while refreshing account permissions");
        if (!mountedRef.current || requestId !== permissionRequestIdRef.current) {
          return;
        }

        if (!isTimeout) {
          console.error("Auth permission refresh error:", error);
        }

        if (!preserveExistingOnError || !nextUserId) {
          clearAccessState();
        }
      } finally {
        if (blockUi && mountedRef.current && blockingPermissionRequestIdRef.current === requestId) {
          blockingPermissionRequestIdRef.current = null;
          setLoading(false);
        }
      }
    },
    [applyResolvedAccessState, clearAccessState, fetchRole],
  );

  const refreshRole = useCallback(async () => {
    if (user) await resolvePermissions(user.id, { blockUi: false, preserveExistingOnError: true });
  }, [resolvePermissions, user]);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mountedRef.current) {
          setSession(session);
          setUser(session?.user ?? null);
          userIdRef.current = session?.user?.id ?? null;
        }
        await resolvePermissions(session?.user?.id ?? null, { blockUi: true, preserveExistingOnError: false });
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAccessState();
      } finally {
        if (mountedRef.current && blockingPermissionRequestIdRef.current === null) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mountedRef.current) return;
        
        const nextUserId = session?.user?.id ?? null;
        const isSameUser = Boolean(nextUserId && userIdRef.current === nextUserId);

        setSession(session);
        setUser(session?.user ?? null);
        userIdRef.current = nextUserId;
        
        if (session?.user) {
          if (!isSameUser) {
            clearAccessState();
          }
          await resolvePermissions(session.user.id, {
            blockUi: !isSameUser,
            preserveExistingOnError: isSameUser,
          });
        } else {
          clearAccessState();
          userIdRef.current = null;
          if (mountedRef.current) setLoading(false);
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

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleWindowFocus);
    }

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleWindowFocus);
      }
    };
  }, [clearAccessState, resolvePermissions]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    clearAccessState();
    userIdRef.current = null;
  };

  const canManageStore = useCallback(
    (storeId: string) => {
      if (!storeId) return false;
      if (platformRole === "admin") return true;
      return storeMemberships.some(
        (membership) =>
          membership.storeId === storeId &&
          (membership.role === "owner" || membership.role === "admin" || membership.role === "editor"),
      );
    },
    [platformRole, storeMemberships],
  );

  return (
    <AuthContext.Provider value={{ user, session, role, platformRole, storeRole, storeMemberships, activeStoreId, loading, canManageStore, signOut, refreshRole, setActiveStoreId }}>
      {children}
    </AuthContext.Provider>
  );
};

