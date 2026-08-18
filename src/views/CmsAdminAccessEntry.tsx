"use client";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import CmsAdminLayout from "@/components/admin/CmsAdminLayout";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AdminRecoveryPanel from "@/components/admin/AdminRecoveryPanel";
import { fetchAuthDestination } from "@/lib/auth/auth-redirect-client";
import { getPlatformPermissions } from "@/lib/platform/rbac";

export default function CmsAdminAccessEntry({ children }: { children: React.ReactNode }) {
  const { user, session, platformRole, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const requestedNext = `${location.pathname}${location.search || ""}`;
  const clientCanAccess = getPlatformPermissions(platformRole).canAccessControlPlane;

  useEffect(() => {
    if (loading || !user || !session?.access_token || clientCanAccess) return;
    if (verifiedUserId === user.id || error) return;

    const controller = new AbortController();
    setChecking(true);

    void fetchAuthDestination({
      accessToken: session.access_token,
      nextPath: requestedNext,
      signal: controller.signal,
    })
      .then((destination) => {
        if (destination.kind === "platform") {
          setVerifiedUserId(user.id);
          return;
        }

        navigate(destination.kind === "unassigned" ? "/admin" : destination.path, { replace: true });
      })
      .catch((nextError) => {
        if (nextError instanceof DOMException && nextError.name === "AbortError") return;
        console.error("CMS admin surface routing failed:", nextError);
        setError(nextError instanceof Error ? nextError.message : "Could not verify CMS admin access.");
      })
      .finally(() => setChecking(false));

    return () => controller.abort();
  }, [
    attempt,
    clientCanAccess,
    error,
    loading,
    navigate,
    requestedNext,
    session?.access_token,
    user,
    verifiedUserId,
  ]);

  if (!session || !user) {
    return <CmsAdminLayout>{children}</CmsAdminLayout>;
  }

  if (loading || checking || (!clientCanAccess && verifiedUserId !== user.id && !error)) {
    return <AdminRouteFallback label="Verifying CMS admin access" fullScreen />;
  }

  if (error && !clientCanAccess) {
    return (
      <AdminRecoveryPanel
        title="Could not verify CMS admin access"
        description={error}
        loadingLabel="CMS access stays blocked until account permissions can be verified."
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

  return <CmsAdminLayout>{children}</CmsAdminLayout>;
}
