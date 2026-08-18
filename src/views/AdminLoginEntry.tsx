"use client";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AdminLogin from "@/views/AdminLogin";
import { fetchAuthDestination } from "@/lib/auth/auth-redirect-client";

export default function AdminLoginEntry() {
  const { user, session, role, loading, authRecovery } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkingAccountType, setCheckingAccountType] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  const requestedNext = searchParams.get("next");
  const showingSetup = searchParams.get("mode") === "setup";

  useEffect(() => {
    if (loading || !user || !session?.access_token || role || showingSetup) return;
    if (checkedUserId === user.id) return;
    if (authRecovery.reason !== "no_store" && authRecovery.reason !== "ready") return;

    const controller = new AbortController();
    setCheckingAccountType(true);

    void fetchAuthDestination({
      accessToken: session.access_token,
      intent: "dashboard",
      nextPath: requestedNext,
      signal: controller.signal,
    })
      .then((destination) => {
        setCheckedUserId(user.id);
        if (destination.kind !== "unassigned") {
          navigate(destination.path, { replace: true });
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Dashboard login account routing failed:", error);
        setCheckedUserId(user.id);
      })
      .finally(() => setCheckingAccountType(false));

    return () => controller.abort();
  }, [
    authRecovery.reason,
    checkedUserId,
    loading,
    navigate,
    requestedNext,
    role,
    session?.access_token,
    showingSetup,
    user,
  ]);

  if (loading || checkingAccountType) {
    return <AdminRouteFallback label="Checking account access" fullScreen />;
  }

  return <AdminLogin />;
}
