import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound, Mail } from "lucide-react";

const AdminLogin = () => {
  const { user, role, loading, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
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
            return {
              message: String(payload.error),
              description: payload?.details ? String(payload.details) : undefined,
            };
          }
        } catch {
          // no-op
        }
      }
    }

    if (error instanceof Error) {
      return { message: error.message || fallback, description: undefined };
    }

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

  const handleEmailLogin = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }

    setSendingLink(true);
    try {
      const redirectTo = `${window.location.origin}/admin/login${mode === "setup" ? "?mode=setup" : ""}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        toast.error("Could not send login link", { description: error.message });
        return;
      }

      toast.success("Magic link sent", {
        description: "Check your email and open the link to continue.",
      });
    } catch {
      toast.error("Could not send login link");
    } finally {
      setSendingLink(false);
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

      if (data?.error) {
        toast.error(data.error, { description: data?.details });
        return;
      }

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

      if (data?.error) {
        toast.error(data.error, { description: data?.details });
        return;
      }

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
            {user ? "Choose first-admin claim or invite code" : "Sign in first with your email"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!user ? (
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                />
              </div>
              <Button onClick={handleEmailLogin} disabled={sendingLink} className="w-full gap-2" size="lg">
                {sendingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send Magic Link
              </Button>
              <p className="text-xs text-muted-foreground">
                Once you open the email link, this page will continue automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mode === "setup" ? "default" : "outline"}
                  onClick={() => setMode("setup")}
                >
                  First Admin Setup
                </Button>
                <Button
                  type="button"
                  variant={mode === "invite" ? "default" : "outline"}
                  onClick={() => setMode("invite")}
                >
                  Invite Code
                </Button>
              </div>

              {mode === "setup" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    If no admin exists yet, click below to claim first-admin access for this account.
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
