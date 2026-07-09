import { useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { AuthContext, type AppRole, type PlatformRole, type StoreMembership, type StoreRole } from "@/hooks/auth-context";

const ACTIVE_STORE_STORAGE_KEY = "commerce-engine-active-store-id";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [platformRole, setPlatformRole] = useState<PlatformRole>(null);
  const [storeRole, setStoreRole] = useState<StoreRole>(null);
  const [storeMemberships, setStoreMemberships] = useState<StoreMembership[]>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setActiveStoreId = useCallback((storeId: string | null) => {
    setActiveStoreIdState(storeId);
    if (typeof window === "undefined") return;

    if (storeId) {
      window.localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, storeId);
    } else {
      window.localStorage.removeItem(ACTIVE_STORE_STORAGE_KEY);
    }
  }, []);

  const fetchRole = useCallback(async (userId: string) => {
    const [{ data: platformRole }, { data: memberships }] = await Promise.all([
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
    ]);

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
    setActiveStoreId(resolvedStoreId);
    setStoreMemberships(mappedMemberships);

    const nextStoreRole = (membership?.role as StoreRole) ?? null;
    const nextPlatformRole = (platformRole?.role as AppRole) ?? null;

    setStoreRole(nextStoreRole);
    setPlatformRole(nextPlatformRole);

    if (nextPlatformRole) {
      setRole(nextPlatformRole);
      return;
    }

    if (nextStoreRole === "owner" || nextStoreRole === "admin") {
      setRole("admin");
      return;
    }

    if (nextStoreRole === "editor" || nextStoreRole === "viewer") {
      setRole("co_admin");
      return;
    }

    setRole(null);
  }, [setActiveStoreId]);

  const refreshRole = useCallback(async () => {
    if (user) await fetchRole(user.id);
  }, [user, fetchRole]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchRole(session.user.id);
          } else {
            setRole(null);
            setPlatformRole(null);
            setStoreRole(null);
            setStoreMemberships([]);
            setActiveStoreId(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // If we receive an auth event for a user, we must ensure loading is true
          // until we have fetched their role, to prevent UI flashes.
          setLoading(true);
          await fetchRole(session.user.id);
          if (mounted) setLoading(false);
        } else {
          setRole(null);
          setPlatformRole(null);
          setStoreRole(null);
          setStoreMemberships([]);
          setActiveStoreId(null);
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole, setActiveStoreId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setPlatformRole(null);
    setStoreRole(null);
    setStoreMemberships([]);
    setActiveStoreId(null);
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

