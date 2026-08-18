"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AdminLogin from "@/views/AdminLogin";
import { fetchAuthDestination } from "@/lib/auth/auth-redirect-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminLoginEntry() {
  const { user, session, loading, authRecovery, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkingAccountType, setCheckingAccountType] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const requestedNext = searchParams.get("next");
  const showingSetup = searchParams.get("mode") === "setup";

  useEffect(() => {
    if (loading || !user || !session?.access_token || showingSetup) return;
    if (checkedUserId === user.id || routingError) return;
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
        setRoutingError(error instanceof Error ? error.message : "Could not verify this account's dashboard access.");
      })
      .finally(() => setCheckingAccountType(false));

    return () => controller.abort();
  }, [
    attempt,
    authRecovery.reason,
    checkedUserId,
    loading,
    navigate,
    requestedNext,
    routingError,
    session?.access_token,
    showingSetup,
    user,
  ]);

  if (loading || checkingAccountType || (user && !showingSetup && checkedUserId !== user.id && !routingError)) {
    return <AdminRouteFallback label="Checking account access" fullScreen />;
  }

  if (routingError && user && !showingSetup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-5 font-heading text-2xl font-bold">Could not verify dashboard access</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{routingError}</p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              We will not guess whether this account is a platform operator, merchant, or storefront customer.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => {
                  setRoutingError(null);
                  setCheckedUserId(null);
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

  return <AdminLogin />;
}
