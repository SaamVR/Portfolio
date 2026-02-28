import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";

const AdminLogin = () => {
  const { user, role, loading, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [inviteCode, setInviteCode] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [claimingInvite, setClaimingInvite] = useState(false);
  const [claimingSetup, setClaimingSetup] = useState(false);

  const mode = useMemo(() => {
    const value = searchParams.get("mode");
    return value === "setup" ? "setup" : "invite";
  }, [searchParams]);

  const setMode = (nextMode: "setup" | "invite") => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", nextMode);
    setSearchParams(next, { replace: true });
  };

  const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "context" in error) {
      const context = (error as { context?: Response }).context;
      if (context) {
        try {
          const payload = await context.clone().json();
          if (payload?.error) {
            return { message: String(payload.error), description: payload?.details ? String(payload.details) : undefined };
          }
        } catch { /* no-op */ }
      }
    }
    if (error instanceof Error) return { message: error.message || fallback, description: undefined };
    return { message: fallback, description: undefined };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && role) {
    return <Navigate to="/admin" replace />;
  }

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin/login" + (mode === "setup" ? "?mode=setup" : ""),
      });
      if (error) {
        toast.error("Google sign-in failed", { description: error.message });
      }
    } catch {
      toast.error("Google sign-in failed");
    } finally {
      setSigningIn(false);
    }
  };

  const handleClaimInvite = async () => {
    if (!inviteCode.trim()) return;
    setClaimingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-invite-code", {
        body: { code: inviteCode.trim() },
      });
      if (error) {
        const parsed = await getFunctionErrorMessage(error, "Failed to claim invite code");
        toast.error(parsed.message, { description: parsed.description });
        return;
      }
      if (data?.error) { toast.error(data.error, { description: data?.details }); return; }
      await refreshRole();
      toast.success(`Role assigned: ${data.role === "admin" ? "Admin" : "Co-Admin"}`);
      navigate("/admin", { replace: true });
    } catch {
      toast.error("Failed to claim invite code");
    } finally {
      setClaimingInvite(false);
    }
  };

  const handleSetup = async () => {
    setClaimingSetup(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-setup");
      if (error) {
        const parsed = await getFunctionErrorMessage(error, "Failed to complete setup");
        toast.error(parsed.message, { description: parsed.description });
        return;
      }
      if (data?.error) { toast.error(data.error, { description: data?.details }); return; }
      await refreshRole();
      toast.success("Admin access granted");
      navigate("/admin", { replace: true });
    } catch {
      toast.error("Failed to complete setup");
    } finally {
      setClaimingSetup(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">Admin Access</CardTitle>
          <CardDescription>
            {user ? "Choose first-admin claim or invite code" : "Sign in with Google to continue"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!user ? (
            <div className="space-y-3">
              <Button onClick={handleGoogleSignIn} disabled={signingIn} className="w-full gap-2" size="lg">
                {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Sign in with Google
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={mode === "setup" ? "default" : "outline"} onClick={() => setMode("setup")}>
                  First Admin Setup
                </Button>
                <Button type="button" variant={mode === "invite" ? "default" : "outline"} onClick={() => setMode("invite")}>
                  Invite Code
                </Button>
              </div>

              {mode === "setup" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    If no admin exists yet, click below to claim first-admin access.
                  </p>
                  <Button onClick={handleSetup} disabled={claimingSetup} className="w-full">
                    {claimingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim Admin Access"}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Invite code"
                      className="pl-10"
                      onKeyDown={(e) => e.key === "Enter" && handleClaimInvite()}
                    />
                  </div>
                  <Button onClick={handleClaimInvite} disabled={claimingInvite || !inviteCode.trim()}>
                    {claimingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                First-admin claim works only once; after that, use invite codes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
