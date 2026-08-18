"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RefreshCw, ShieldCheck, Store, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAuthDestination } from "@/lib/auth/auth-redirect-client";
import { parseAuthEntryIntent } from "@/lib/auth/post-auth-destination";
import { getPlatformSiteUrl } from "@/lib/platform/site-config";
import { shouldUseDedicatedStorefrontPaths } from "@/lib/slug";

const destinationCopy = {
  platform: {
    title: "Opening CMS control plane",
    detail: "Your platform permissions are verified. Taking you to CMS Admin.",
    icon: ShieldCheck,
  },
  merchant: {
    title: "Opening merchant dashboard",
    detail: "Your store workspace is ready. Taking you to the merchant dashboard.",
    icon: Store,
  },
  customer: {
    title: "Opening your store account",
    detail: "Your storefront customer account is ready.",
    icon: UserRound,
  },
  unassigned: {
    title: "Finishing account setup",
    detail: "Your account is signed in. Taking you to the correct setup flow.",
    icon: ArrowRight,
  },
} as const;

type DestinationKind = keyof typeof destinationCopy;

export default function AuthRedirect() {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [kind, setKind] = useState<DestinationKind | null>(null);
  const [attempt, setAttempt] = useState(0);

  const intent = parseAuthEntryIntent(searchParams.get("intent"));
  const nextPath = searchParams.get("next");
  const storeSlug = searchParams.get("store");
  const fallbackLoginPath = useMemo(() => {
    if (intent === "customer") {
      const params = new URLSearchParams();
      if (nextPath) params.set("next", nextPath);
      const query = params.toString();
      return query ? `/auth?${query}` : "/auth";
    }
    if (intent === "merchant-signup") return "/signup?entry=dashboard";
    return "/admin/login";
  }, [intent, nextPath]);

  const resolveDestination = useCallback(async () => {
    if (!session?.access_token) return;

    setResolving(true);
    setError(null);
    try {
      const destination = await fetchAuthDestination({
        accessToken: session.access_token,
        intent,
        nextPath,
        storeSlug,
      });
      setKind(destination.kind);
      if (destination.path === "/auth/redirect" || destination.path.startsWith("/auth/redirect?")) {
        throw new Error("The login destination resolved back to the redirect page.");
      }

      const isDashboardDestination = destination.kind === "platform" || destination.kind === "merchant";
      const isStorefrontOrigin = Boolean(storeSlug && shouldUseDedicatedStorefrontPaths(storeSlug));
      if (isDashboardDestination && isStorefrontOrigin) {
        const platformUrl = new URL(destination.path, `${getPlatformSiteUrl().replace(/\/$/, "")}/`);
        window.location.assign(platformUrl.toString());
        return;
      }

      navigate(destination.path, { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not finish the login redirect.");
    } finally {
      setResolving(false);
    }
  }, [intent, navigate, nextPath, session?.access_token, storeSlug]);

  useEffect(() => {
    if (loading || !session?.access_token) return;
    void resolveDestination();
  }, [attempt, loading, resolveDestination, session?.access_token]);

  const copy = kind ? destinationCopy[kind] : null;
  const Icon = copy?.icon ?? ShieldCheck;

  if (loading || resolving || (session?.access_token && !error)) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_42%)]" />
        <Card className="relative w-full max-w-md border-border/70 bg-card/90 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-8 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-lg shadow-primary/10">
              {copy ? <Icon className="h-7 w-7" /> : <Loader2 className="h-7 w-7 animate-spin" />}
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Secure sign-in</p>
            <h1 className="mt-3 font-heading text-2xl font-bold">
              {copy?.title ?? "Checking your account access"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {copy?.detail ?? "We are verifying whether this account belongs in CMS Admin, a merchant workspace, or a storefront customer account."}
            </p>
            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Redirecting automatically
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!user || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-5 font-heading text-2xl font-bold">Sign-in session not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">Return to the login flow and try again.</p>
            <Button asChild className="mt-6 w-full">
              <Link href={fallbackLoginPath}>Return to login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-md border-border">
        <CardContent className="p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-5 font-heading text-2xl font-bold">We could not finish the redirect</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button type="button" onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
            <Button asChild variant="outline">
              <Link href={fallbackLoginPath}>Back to login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
