"use client";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import MerchantSignup from "@/views/MerchantSignup";
import { fetchAuthDestination } from "@/lib/auth/auth-redirect-client";

export default function MerchantSignupEntry() {
  const { user, session, loading, authRecovery } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkingAccountType, setCheckingAccountType] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const entry = searchParams.get("entry");
  const intent = searchParams.get("intent");
  const explicitStoreCreation = entry === "dashboard" || intent === "new-store";

  useEffect(() => {
    if (loading || !user || !session?.access_token || explicitStoreCreation) return;
    if (resolvedUserId === user.id) return;
    if (authRecovery.reason !== "ready" && authRecovery.reason !== "no_store") return;

    const controller = new AbortController();
    setCheckingAccountType(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("entry", "dashboard");
    const merchantOnboardingPath = `/signup?${nextParams.toString()}`;

    void fetchAuthDestination({
      accessToken: session.access_token,
      intent: "merchant-signup",
      nextPath: merchantOnboardingPath,
      signal: controller.signal,
    })
      .then((destination) => {
        setResolvedUserId(user.id);
        if (destination.kind === "unassigned") {
          const next = new URLSearchParams(searchParams);
          next.set("entry", "dashboard");
          setSearchParams(next, { replace: true });
          return;
        }
        navigate(destination.path, { replace: true });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Merchant signup account routing failed:", error);
        setResolvedUserId(user.id);
      })
      .finally(() => setCheckingAccountType(false));

    return () => controller.abort();
  }, [
    authRecovery.reason,
    explicitStoreCreation,
    loading,
    navigate,
    resolvedUserId,
    searchParams,
    session?.access_token,
    setSearchParams,
    user,
  ]);

  if (loading || checkingAccountType || (user && !explicitStoreCreation && resolvedUserId !== user.id)) {
    return <AdminRouteFallback label="Checking signup access" fullScreen />;
  }

  return <MerchantSignup />;
}
