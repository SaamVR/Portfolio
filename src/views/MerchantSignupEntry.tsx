"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import MerchantSignupV3 from "@/views/MerchantSignupV3";
import { fetchAuthDestination } from "@/lib/auth/auth-redirect-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AllowedSignupMode = "initial" | "additional" | null;

export default function MerchantSignupEntry() {
  const { user, session, loading, authRecovery, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkingAccountType, setCheckingAccountType] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [allowedMode, setAllowedMode] = useState<AllowedSignupMode>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const searchKey = searchParams.toString();
  const entry = searchParams.get("entry");
  const intent = searchParams.get("intent");
  const isAdditionalStoreRequest = intent === "new-store";

  useEffect(() => {
    if (loading || !user || !session?.access_token) return;
    if (resolvedUserId === user.id || routingError) return;
    if (authRecovery.reason !== "ready" && authRecovery.reason !== "no_store") return;

    const controller = new AbortController();
    setCheckingAccountType(true);

    const nextParams = new URLSearchParams(searchKey);
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

        if (isAdditionalStoreRequest) {
          if (destination.kind === "merchant") {
            setAllowedMode("additional");
            return;
          }
          navigate(destination.path, { replace: true });
          return;
        }

        if (destination.kind === "unassigned") {
          setAllowedMode("initial");
          if (entry !== "dashboard") {
            navigate(merchantOnboardingPath, { replace: true, scroll: false });
          }
          return;
        }

        navigate(destination.path, { replace: true });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Merchant signup account routing failed:", error);
        setRoutingError(error instanceof Error ? error.message : "Could not verify whether this account can create a merchant workspace.");
      })
      .finally(() => setCheckingAccountType(false));

    return () => controller.abort();
  }, [
    attempt,
    authRecovery.reason,
    entry,
    isAdditionalStoreRequest,
    loading,
    navigate,
    resolvedUserId,
    routingError,
    searchKey,
    session?.access_token,
    user,
  ]);

  if (!user && !loading) {
    return <MerchantSignupV3 />;
  }

  if (loading || checkingAccountType || (user && resolvedUserId !== user.id && !routingError)) {
    return <AdminRouteFallback label="Checking signup access" fullScreen />;
  }

  if (routingError && user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-5 font-heading text-2xl font-bold">Could not verify merchant signup access</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{routingError}</p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Store creation stays blocked until we can verify whether this account is a merchant, platform user, or storefront customer.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => {
                  setRoutingError(null);
                  setResolvedUserId(null);
                  setAllowedMode(null);
                  setAttempt((value) => value + 1);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
              <Button type="button" variant="outline" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
            <Button asChild variant="ghost" className="mt-3 w-full">
              <Link href="/">Back to EZComo</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (user && allowedMode === "initial" && entry !== "dashboard") {
    return <AdminRouteFallback label="Preparing merchant registration" fullScreen />;
  }

  if (user && allowedMode) {
    return <MerchantSignupV3 />;
  }

  return <AdminRouteFallback label="Opening the correct account workspace" fullScreen />;
}
