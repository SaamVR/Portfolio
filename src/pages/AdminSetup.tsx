import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock } from "lucide-react";

const AdminSetup = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already admin → go to dashboard
  if (user && role) {
    return <Navigate to="/admin" replace />;
  }

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin/setup",
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

  const handleSetup = async () => {
    if (!password.trim()) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-setup", {
        body: { password: password.trim() },
      });
      if (error) {
        const errMsg = typeof error === "object" && error.message ? error.message : String(error);
        toast.error(errMsg);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Admin role granted! Redirecting...");
        window.location.href = "/admin";
      }
    } catch {
      toast.error("Failed to complete setup");
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
            Admin Setup
          </CardTitle>
          <CardDescription>
            {user
              ? "Enter the setup password to claim admin access"
              : "Sign in with Google first, then enter the setup password"}
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
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Setup password"
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSetup()}
                  />
                </div>
                <Button onClick={handleSetup} disabled={claiming || !password.trim()}>
                  {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim Admin"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This only works once — when no admin exists yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;
