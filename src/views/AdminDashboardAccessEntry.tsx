"use client";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AdminRecoveryPanel from "@/components/admin/AdminRecoveryPanel";
import { fetchAuthDestination } from "@/lib/auth/auth-redirect-client";

export default function AdminDashboardAccessEntry({ children }: { children: React.ReactNode }) {
  const { user, session, role, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const requestedNext = `${location.pathname}${location.search || ""}`;

  useEffect(() => {
    if (loading || !user || !session?.access_token || role) return;
    if (verifiedUserId === user.id || error) return;

    const controller = new AbortController();
    setChecking(true);

    void fetchAuthDestination({
      accessToken: session.access_token,
      nextPath: requestedNext,
      signal: controller.signal,
    })
      .then((destination) => {
        if (destination.kind === "customer" || destination.kind === "platform") {
          navigate(destination.path, { replace: true });
          return;
        }

        setVerifiedUserId(user.id);
      })
      .catch((nextError) => {
        if (nextError instanceof DOMException && nextError.name === "AbortError") return;
        console.error("Merchant dashboard surface routing failed:", nextError);
        setError(nextError instanceof Error ? nextError.message : "Could not verify merchant dashboard access.");
      })
      .finally(() => setChecking(false));

    return () => controller.abort();
  }, [
    attempt,
    error,
    loading,
    navigate,
    requestedNext,
    role,
    session?.access_token,
    user,
    verifiedUserId,
  ]);

  if (!session || !user || role) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  if (loading || checking || (verifiedUserId !== user.id && !error)) {
    return <AdminRouteFallback label="Verifying merchant dashboard access" fullScreen />;
  }

  if (error) {
    return (
      <AdminRecoveryPanel
        title="Could not verify merchant dashboard access"
        description={error}
        loadingLabel="Dashboard access stays blocked until this account can be classified safely."
        retryLabel="Retry access"
        secondaryLabel="Sign out"
        onRetry={() => {
          setError(null);
          setVerifiedUserId(null);
          setAttempt((value) => value + 1);
        }}
        onSecondary={() => void signOut()}
        fullHeight
        autoRetry={false}
      />
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}
