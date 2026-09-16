import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound, Mail, Shield } from "lucide-react";
import { signInWithGoogle } from "@/lib/google-auth";
import { isPlatformRole } from "@/lib/platform/rbac";

type EmailErrors = {
  email?: string;
  password?: string;
  form?: string;
};


function messageFromUnknown(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function safeEmailAuthError(error: unknown) {
  const message = messageFromUnknown(error).toLowerCase();
  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return "Confirm your email address before signing in.";
  }
  if (message.includes("too many") || message.includes("rate limit")) {
    return "Too many sign-in attempts. Wait a moment and try again.";
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return "Could not reach the sign-in service. Check your connection and try again.";
  }
  return "We could not sign you in. Check your details and try again.";
}

function safeGoogleAuthError(error: unknown) {
  const message = messageFromUnknown(error).toLowerCase();
  if (message.includes("popup") && message.includes("closed")) {
    return "Google sign-in was closed before it finished. Try again when you are ready.";
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return "Could not reach Google sign-in. Check your connection and try again.";
  }
  return "Google sign-in could not be completed. Try again or use another sign-in method.";
}

function safeAccessError(rawMessage: unknown, fallback: string) {
  const message = typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";
  if (message.includes("invite") && (message.includes("expired") || message.includes("invalid") || message.includes("used"))) {
    return "This invite code is invalid, expired, or already used.";
  }
  if (message.includes("setup") && (message.includes("password") || message.includes("invalid"))) {
    return "The setup password was not accepted.";
  }
  if (message.includes("already") && (message.includes("initialized") || message.includes("setup"))) {
    return "Platform setup is already complete. Use an invite code instead.";
  }
  if (message.includes("unauthorized") || message.includes("forbidden") || message.includes("permission")) {
    return "You are not authorized to complete this action.";
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return fallback;
}

const AdminLogin = () => {
  const { user, role, platformRole, storeRole, loading, refreshRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [claimingInvite, setClaimingInvite] = useState(false);
  const [claimingSetup, setClaimingSetup] = useState(false);
  const [emailErrors, setEmailErrors] = useState<EmailErrors>({});
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const inviteRef = useRef<HTMLInputElement>(null);
  const setupPasswordRef = useRef<HTMLInputElement>(null);

  const mode = useMemo(() => {
    const value = searchParams.get("mode");
    return value === "setup" ? "setup" : "invite";
  }, [searchParams]);
  const isSetupRoute = location.pathname === "/admin/setup";
  const showingPlatformSetup = isSetupRoute || mode === "setup";
  const returnPath = useMemo(() => {
    const candidate = searchParams.get("next");
    return candidate && candidate.startsWith("/") ? candidate : null;
  }, [searchParams]);
  const postLoginPath = returnPath || (isPlatformRole(platformRole) ? "/cms-admin" : "/admin");

  const setMode = (nextMode: "setup" | "invite") => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", nextMode);
    setSearchParams(next, { replace: true });
    setInviteError(null);
    setSetupError(null);
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
            if (payload?.error) return String(payload.error);
          } catch {
            // Keep the merchant-facing fallback below.
          }
        } else if (typeof context === "object" && context !== null) {
          const payload = context as { error?: unknown; message?: unknown };
          if (payload?.error) return String(payload.error);
          if (payload?.message) return String(payload.message);
        }
      }
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="ml-3">Restoring your dashboard session…</span>
      </div>
    );
  }

  if (user && role) {
    return <Navigate to={postLoginPath} replace />;
  }

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: EmailErrors = {};
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (!password.trim()) nextErrors.password = "Enter your password.";
    if (nextErrors.email || nextErrors.password) {
      setEmailErrors(nextErrors);
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setEmailErrors({});
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("Signed in successfully.");
    } catch (error: unknown) {
      const message = safeEmailAuthError(error);
      setEmailErrors({ form: message });
      toast.error(message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleError(null);
    setGoogleSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      const message = safeGoogleAuthError(error);
      setGoogleError(message);
      toast.error(message);
      setGoogleSigningIn(false);
    }
  };

  const GoogleButton = () => (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleAuth}
        disabled={signingIn || googleSigningIn}
        className="h-11 w-full"
      >
        {googleSigningIn ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        {googleSigningIn ? "Opening Google sign-in…" : "Login with Google"}
      </Button>
      {googleError ? (
        <p id="google-login-error" role="alert" className="text-sm text-destructive">
          {googleError}
        </p>
      ) : null}
    </div>
  );

  const handleClaimInvite = async () => {
    if (!inviteCode.trim()) {
      setInviteError("Enter an invite code.");
      inviteRef.current?.focus();
      return;
    }
    setInviteError(null);
    setClaimingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-invite-code", {
        body: { code: inviteCode.trim() },
      });
      if (error) {
        const raw = await getFunctionErrorMessage(error, "Invite code could not be verified.");
        const message = safeAccessError(raw, "Invite code could not be verified. Check the code and try again.");
        setInviteError(message);
        toast.error(message);
        return;
      }
      if (data?.error) {
        const message = safeAccessError(data.error, "Invite code could not be verified. Check the code and try again.");
        setInviteError(message);
        toast.error(message);
        return;
      }
      await refreshRole();
      if (data?.membership_type === "store") {
        toast.success(`Store access granted: ${data.role}`);
      } else {
        toast.success(`Dashboard role assigned: ${data.role === "admin" ? "Owner" : "Staff"}`);
      }
      navigate(data?.membership_type === "platform" ? "/cms-admin" : "/admin", { replace: true });
    } catch (error: unknown) {
      const message = safeAccessError(messageFromUnknown(error), "Invite code could not be verified. Check the code and try again.");
      setInviteError(message);
      toast.error(message);
    } finally {
      setClaimingInvite(false);
    }
  };

  const handleSetup = async () => {
    if (!setupPassword.trim()) {
      setSetupError("Enter the admin setup password.");
      setupPasswordRef.current?.focus();
      return;
    }
    setSetupError(null);
    setClaimingSetup(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-setup", {
        body: { password: setupPassword.trim() },
      });
      if (error) {
        const raw = await getFunctionErrorMessage(error, "Setup could not be completed.");
        const message = safeAccessError(raw, "Setup could not be completed. Check the setup password and try again.");
        setSetupError(message);
        toast.error(message);
        return;
      }
      if (data?.error) {
        const message = safeAccessError(data.error, "Setup could not be completed. Check the setup password and try again.");
        setSetupError(message);
        toast.error(message);
        return;
      }
      await refreshRole();
      toast.success("CMS admin access granted");
      navigate("/cms-admin", { replace: true });
    } catch (error: unknown) {
      const message = safeAccessError(messageFromUnknown(error), "Setup could not be completed. Check the setup password and try again.");
      setSetupError(message);
      toast.error(message);
    } finally {
      setClaimingSetup(false);
    }
  };

  const emailDescriptionIds = [emailErrors.email ? "dashboard-email-error" : null, emailErrors.form ? "dashboard-email-form-error" : null]
    .filter(Boolean)
    .join(" ") || undefined;
  const passwordDescriptionIds = [passwordErrorsId(emailErrors.password), emailErrors.form ? "dashboard-email-form-error" : null]
    .filter(Boolean)
    .join(" ") || undefined;

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
              ? showingPlatformSetup
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

              <div className="space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
                  <div>
                    <Label htmlFor="dashboard-email">Email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input ref={emailRef} id="dashboard-email" data-testid="admin-login-email" type="email" autoComplete="email" placeholder="merchant@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setEmailErrors((current) => ({ ...current, email: undefined, form: undefined })); }} aria-invalid={Boolean(emailErrors.email)} aria-describedby={emailDescriptionIds} className="pl-10" />
                    </div>
                    {emailErrors.email ? <p id="dashboard-email-error" role="alert" className="mt-1 text-sm text-destructive">{emailErrors.email}</p> : null}
                  </div>
                  <div>
                    <Label htmlFor="dashboard-password">Password</Label>
                    <div className="relative mt-1">
                      <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input ref={passwordRef} id="dashboard-password" data-testid="admin-login-password" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(event) => { setPassword(event.target.value); setEmailErrors((current) => ({ ...current, password: undefined, form: undefined })); }} aria-invalid={Boolean(emailErrors.password)} aria-describedby={passwordDescriptionIds} className="pl-10" />
                    </div>
                    {emailErrors.password ? <p id="dashboard-password-error" role="alert" className="mt-1 text-sm text-destructive">{emailErrors.password}</p> : null}
                  </div>
                  {emailErrors.form ? <p id="dashboard-email-form-error" role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{emailErrors.form}</p> : null}
                  <Button type="submit" data-testid="admin-login-submit" disabled={signingIn} className="h-11 w-full">
                    {signingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    {signingIn ? "Signing you in…" : "Login"}
                  </Button>
                  {signingIn ? <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground">Signing you in…</p> : null}
                </form>
                <GoogleButton />
              </div>

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

              {showingPlatformSetup ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This is only for the first admin. If your CMS is already initialized, use an invite code instead.
                  </p>
                  <div>
                    <Label htmlFor="setup-password">Setup Password</Label>
                    <Input
                      ref={setupPasswordRef}
                      id="setup-password"
                      type="password"
                      value={setupPassword}
                      onChange={(event) => {
                        setSetupPassword(event.target.value);
                        setSetupError(null);
                      }}
                      placeholder="Enter setup password"
                      aria-invalid={Boolean(setupError)}
                      aria-describedby={setupError ? "setup-password-error" : undefined}
                      className="mt-1"
                    />
                    {setupError ? <p id="setup-password-error" role="alert" className="mt-1 text-sm text-destructive">{setupError}</p> : null}
                  </div>
                  <Button onClick={handleSetup} disabled={claimingSetup} className="w-full">
                    {claimingSetup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    {claimingSetup ? "Claiming access…" : "Claim Admin Access"}
                  </Button>
                  {claimingSetup ? <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground">Claiming admin access…</p> : null}
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("invite")}>
                    Use Invite Code Instead
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="invite-code" className="sr-only">Invite code</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        ref={inviteRef}
                        id="invite-code"
                        value={inviteCode}
                        onChange={(event) => {
                          setInviteCode(event.target.value);
                          setInviteError(null);
                        }}
                        placeholder="Invite code"
                        aria-invalid={Boolean(inviteError)}
                        aria-describedby={inviteError ? "invite-code-error" : undefined}
                        className="pl-10"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleClaimInvite();
                          }
                        }}
                      />
                    </div>
                    <Button onClick={handleClaimInvite} disabled={claimingInvite || !inviteCode.trim()}>
                      {claimingInvite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      {claimingInvite ? "Verifying…" : "Verify"}
                    </Button>
                  </div>
                  {inviteError ? <p id="invite-code-error" role="alert" className="text-sm text-destructive">{inviteError}</p> : null}
                  {claimingInvite ? <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Verifying invite code…</p> : null}
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

function passwordErrorsId(error: string | undefined) {
  return error ? "dashboard-password-error" : null;
}

export default AdminLogin;
