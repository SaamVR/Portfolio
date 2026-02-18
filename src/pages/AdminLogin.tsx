import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";

const AdminLogin = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already authenticated with a role → go to dashboard
  if (user && role) {
    return <Navigate to="/admin" replace />;
  }

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin/login",
      });
      if (result.error) {
        toast.error("Sign-in failed", { description: String(result.error) });
      }
    } catch {
      toast.error("Sign-in failed");
    } finally {
      setSigningIn(false);
    }
  };

  const handleClaimInvite = async () => {
    if (!inviteCode.trim()) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-invite-code", {
        body: { code: inviteCode.trim() },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to claim invite code");
      } else {
        toast.success(`Role assigned: ${data.role === "admin" ? "Admin" : "Co-Admin"}`);
        // Refresh role in context
        const { refreshRole } = await import("@/hooks/useAuth").then((m) => {
          // We need to trigger a re-render. The simplest way is to navigate.
          return { refreshRole: null };
        });
        // Just reload to pick up the new role
        window.location.href = "/admin";
      }
    } catch {
      toast.error("Failed to claim invite code");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">
            THREAD<span className="text-primary">BD</span> Admin
          </CardTitle>
          <CardDescription>
            {user ? "Enter your invite code to access the dashboard" : "Sign in with Google to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <Button
              onClick={handleGoogleLogin}
              disabled={signingIn}
              className="w-full gap-2"
              size="lg"
            >
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Sign in with Google
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code"
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && handleClaimInvite()}
                  />
                </div>
                <Button onClick={handleClaimInvite} disabled={claiming || !inviteCode.trim()}>
                  {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Contact the main admin to get an invite code.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
