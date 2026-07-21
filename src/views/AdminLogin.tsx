import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound, Mail, Phone, Shield } from "lucide-react";
import { sendPhoneVerificationCode } from "@/lib/firebase-phone-auth";
import { signInWithGoogle } from "@/lib/google-auth";
import { exchangeFirebaseTokenForSupabaseSession } from "@/lib/auth-bridge-client";
import type { ConfirmationResult } from "@/lib/firebase-phone-auth";

const AdminLogin = () => {
  const { user, role, platformRole, storeRole, loading, refreshRole, setActiveStoreId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [phoneSigningIn, setPhoneSigningIn] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [claimingInvite, setClaimingInvite] = useState(false);
  const [claimingSetup, setClaimingSetup] = useState(false);
  const [recoveringAccess, setRecoveringAccess] = useState(false);

  const mode = useMemo(() => {
    const value = searchParams.get("mode");
    return value === "setup" ? "setup" : "invite";
  }, [searchParams]);
  const requestedNextPath = useMemo(() => {
    const value = searchParams.get("next");
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return null;
    }
    return value;
  }, [searchParams]);
  const isSetupRoute = location.pathname === "/admin/setup";
  const showingPlatformSetup = isSetupRoute || mode === "setup";
  const postLoginPath = requestedNextPath ?? (platformRole === "admin" ? "/cms-admin" : "/admin");

  useEffect(() => {
    if (!user || role || loading || showingPlatformSetup || recoveringAccess) {
      return;
    }

    let active = true;

    const recoverStoreAccess = async () => {
      setRecoveringAccess(true);
      try {
        const [{ data: ownedStores }, { data: memberships }] = await Promise.all([
          supabase
            .from("stores")
            .select("id, is_published, created_at")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1),
          supabase
            .from("store_memberships")
            .select("store_id, role, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1),
        ]);

        if (!active) return;

        const ownedStore = ownedStores?.[0] ?? null;
        const membership = memberships?.[0] ?? null;
        const recoveredStoreId = ownedStore?.id ?? membership?.store_id ?? null;

        if (!recoveredStoreId) return;

        setActiveStoreId(recoveredStoreId);
        await refreshRole();
        if (!active) return;

        toast.success("Store access restored.");
        const recoveredPath = requestedNextPath
          ?? (ownedStore && !ownedStore.is_published
            ? `/admin/onboarding?storeId=${recoveredStoreId}`
            : `/admin?storeId=${recoveredStoreId}`);
        navigate(recoveredPath, { replace: true });
      } finally {
        if (active) {
          setRecoveringAccess(false);
        }
      }
    };

    void recoverStoreAccess();

    return () => {
      active = false;
    };
  }, [
    loading,
    navigate,
    recoveringAccess,
    refreshRole,
    role,
    requestedNextPath,
    setActiveStoreId,
    showingPlatformSetup,
    user,
  ]);

  const setMode = (nextMode: "setup" | "invite") => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", nextMode);
    setSearchParams(next, { replace: true });
  };

  const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "context" in error) {
      const context = (error as { context?: unknown }).context;
      if (context) {
        if (
          typeof context === "object" &&
          context !== null &&
          "json" in context &&
          typeof (context as { json?: unknown }).json === "function"
        ) {
          try {
            const source =
              "clone" in context && typeof (context as { clone?: unknown }).clone === "function"
                ? (context as { clone: () => { json: () => Promise<any> } }).clone()
                : context;
            const payload = await (source as { json: () => Promise<any> }).json();
            if (payload?.error) {
              return { message: String(payload.error), description: payload?.details ? String(payload.details) : undefined };
            }
          } catch { /* no-op */ }
        } else if (typeof context === "object" && context !== null) {
          const payload = context as { error?: unknown; details?: unknown; message?: unknown };
          if (payload?.error) {
            return { message: String(payload.error), description: payload?.details ? String(payload.details) : undefined };
          }
          if (payload?.message) {
            return { message: String(payload.message), description: undefined };
          }
        }
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
    return <Navigate to={postLoginPath} replace />;
  }

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password");
      return;
    }
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("Signed in successfully.");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setSigningIn(false);
    }
  };

  
  const handleGoogleAuth = async () => {
    setGoogleSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error(error.message || 'Google authentication failed');
      setGoogleSigningIn(false);
    }
  };

  const handleSendPhoneCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setPhoneSigningIn(true);
    try {
      const nextConfirmation = await sendPhoneVerificationCode(phone);
      setConfirmation(nextConfirmation);
      toast.success("Verification code sent.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setPhoneSigningIn(false);
    }
  };

  const handleVerifyPhone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmation) {
      toast.error("Please request a verification code first.");
      return;
    }
    if (!otpCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setPhoneSigningIn(true);
    try {
      const credential = await confirmation.confirm(otpCode.trim());
      const idToken = await credential.user.getIdToken();
      const data = await exchangeFirebaseTokenForSupabaseSession({
        id_token: idToken,
        display_name: phone,
      });
      if (data?.error) throw new Error(String(data.error));
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error("Phone verification did not return a valid session.");
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;

      toast.success("Phone verified successfully.");
    } catch (error: any) {
      toast.error(error.message || "Phone login failed");
    } finally {
      setPhoneSigningIn(false);
    }
  };

  const GoogleButton = () => (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleAuth}
      disabled={signingIn || phoneSigningIn || googleSigningIn}
      className="h-11 w-full"
    >
      {googleSigningIn ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      )}
      Login with Google
    </Button>
  );

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
      if (data?.membership_type === "store") {
        toast.success(`Store access granted: ${data.role}`);
      } else {
        toast.success(`Dashboard role assigned: ${data.role === "admin" ? "Owner" : "Staff"}`);
      }
      navigate(data?.membership_type === "platform" ? "/cms-admin" : "/admin", { replace: true });
    } catch {
      toast.error("Failed to claim invite code");
    } finally {
      setClaimingInvite(false);
    }
  };

  const handleSetup = async () => {
    if (!setupPassword.trim()) {
      toast.error("Enter the admin setup password");
      return;
    }
    setClaimingSetup(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-setup", {
        body: { password: setupPassword.trim() },
      });
      if (error) {
        const parsed = await getFunctionErrorMessage(error, "Failed to complete setup");
        toast.error(parsed.message, { description: parsed.description });
        return;
      }
      if (data?.error) { toast.error(data.error, { description: data?.details }); return; }
      await refreshRole();
      toast.success("CMS admin access granted");
      navigate("/cms-admin", { replace: true });
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
          <CardTitle className="font-heading text-2xl">Dashboard Access</CardTitle>
          <CardDescription>
            {user
              ? recoveringAccess
                ? "Restoring your store access."
                : showingPlatformSetup
                ? "Claim first-admin access if this CMS has never been initialized."
                : "Enter an invite code to join your store workspace."
              : showingPlatformSetup
              ? "Sign in first, then complete the protected first-admin setup."
              : "Sign in to your dashboard"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!user ? (
            <div className="space-y-5">
              {showingPlatformSetup ? (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  This route is reserved for protected platform bootstrap. Sign in first, then enter the setup password to claim first admin access.
                </div>
              ) : null}

              <Tabs defaultValue="email" className="space-y-5">
                <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="dashboard-email">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="dashboard-email"
                          data-testid="admin-login-email"
                          type="email"
                          placeholder="merchant@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="dashboard-password">Password</Label>
                      <div className="relative mt-1">
                        <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="dashboard-password"
                          data-testid="admin-login-password"
                          type="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" data-testid="admin-login-submit" disabled={signingIn} className="h-11 w-full">
                      {signingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login
                    </Button>
                  </form>
                  <GoogleButton />
                </TabsContent>

                <TabsContent value="phone" className="space-y-4">
                  <form onSubmit={confirmation ? handleVerifyPhone : handleSendPhoneCode} className="space-y-4">
                    {!confirmation ? (
                      <div>
                        <Label htmlFor="dashboard-phone">Phone</Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="dashboard-phone"
                            placeholder="01XXXXXXXXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="dashboard-phone-code">Verification Code</Label>
                        <Input
                          id="dashboard-phone-code"
                          inputMode="numeric"
                          placeholder="Enter code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    )}
                    <Button type="submit" disabled={phoneSigningIn} className="h-11 w-full">
                      {phoneSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {confirmation ? "Verify Phone" : "Login"}
                    </Button>
                    {confirmation ? (
                      <Button type="button" variant="ghost" onClick={() => setConfirmation(null)} className="w-full">
                        Change phone number
                      </Button>
                    ) : null}
                  </form>
                  <GoogleButton />
                </TabsContent>

                <div id="phone-recaptcha-container" />
              </Tabs>

              {showingPlatformSetup ? (
                <Button asChild type="button" variant="ghost" className="w-full">
                  <Link to="/admin/login">Back to Dashboard Login</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>
                {storeRole ? ` • store role: ${storeRole}` : ""}
              </p>

              {recoveringAccess ? (
                <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring your store access...
                </div>
              ) : showingPlatformSetup ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This is only for the first admin. If your CMS is already initialized, use an invite code instead.
                  </p>
                  <div>
                    <Label htmlFor="setup-password">Setup Password</Label>
                    <Input
                      id="setup-password"
                      type="password"
                      value={setupPassword}
                      onChange={(event) => setSetupPassword(event.target.value)}
                      placeholder="Enter setup password"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleSetup} disabled={claimingSetup} className="w-full">
                    {claimingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim Admin Access"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("invite")}
                  >
                    Use Invite Code Instead
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
                Store users join with invite codes. Store owners created from signup get dashboard access automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
