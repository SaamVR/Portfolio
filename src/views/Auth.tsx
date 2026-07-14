"use client";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Phone, Shield } from "lucide-react";
import { sendPhoneVerificationCode } from "@/lib/firebase-phone-auth";
import { signInWithGoogle } from "@/lib/google-auth";
import { exchangeFirebaseTokenForSupabaseSession } from "@/lib/auth-bridge-client";
import type { ConfirmationResult } from "@/lib/firebase-phone-auth";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

type AuthMode = "login" | "signup";
type PhoneIntent = "login" | "signup";

const Auth = () => {
  const { user, loading } = useAuth();
  const currentStore = useOptionalStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [phoneIntent, setPhoneIntent] = useState<PhoneIntent>("signup");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    phone: "",
    otpCode: "",
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const accountPath = storefrontPath("/account", currentStore?.slug);
  const nextPath = searchParams.get("next") || accountPath;

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
      setPhoneIntent("signup");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      navigate(nextPath, { replace: true });
    }
  }, [loading, navigate, nextPath, user]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("Please enter email and password");
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) throw error;
      toast.success("Logged in successfully");
      navigate(nextPath, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate(nextPath, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Google authentication failed");
      setGoogleLoading(false);
    }
  };

  const handleSendPhoneCode = async (intent: PhoneIntent, event?: React.FormEvent) => {
    event?.preventDefault();
    if (!form.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setPhoneLoading(true);
    try {
      const nextConfirmation = await sendPhoneVerificationCode(form.phone);
      setConfirmation(nextConfirmation);
      setPhoneIntent(intent);
      toast.success("Verification code sent.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmation) {
      toast.error("Please request a verification code first.");
      return;
    }
    if (!form.otpCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setPhoneLoading(true);
    try {
      const credential = await confirmation.confirm(form.otpCode.trim());
      const idToken = await credential.user.getIdToken();
      const data = await exchangeFirebaseTokenForSupabaseSession({
        id_token: idToken,
        display_name: form.phone,
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

      toast.success(phoneIntent === "signup" ? "Account created." : "Logged in successfully.");
      navigate(nextPath, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Phone verification failed");
    } finally {
      setPhoneLoading(false);
    }
  };

  const GoogleButton = ({ label }: { label: string }) => (
    <Button type="button" variant="outline" onClick={handleGoogleAuth} disabled={googleLoading || emailLoading || phoneLoading} className="h-11 w-full">
      {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title={mode === "login" ? "Customer Login" : "Create Customer Account"} description="Sign in or create a customer account." noindex />
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-foreground">
              {mode === "login" ? "Customer Login" : "Create Customer Account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "login" ? "Access orders, addresses, reviews, and wishlist." : "Create a customer profile for faster checkout."}
            </p>
          </div>

          {mode === "login" ? (
            <Tabs defaultValue="email" className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="mt-5 space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="customer-email">Email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="customer-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customer-password">Password</Label>
                    <div className="relative mt-1">
                      <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="customer-password" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Password" className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" disabled={emailLoading} className="h-11 w-full">
                    {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </form>
                <GoogleButton label="Login with Google" />
              </TabsContent>
              <TabsContent value="phone" className="mt-5">
                <form onSubmit={confirmation ? handleVerifyPhone : (event) => handleSendPhoneCode("login", event)} className="space-y-4">
                  {!confirmation ? (
                    <div>
                      <Label htmlFor="customer-phone">Phone</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="customer-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="01XXXXXXXXX" className="pl-10" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="customer-code">Verification Code</Label>
                      <Input id="customer-code" inputMode="numeric" value={form.otpCode} onChange={(event) => update("otpCode", event.target.value)} placeholder="Enter code" className="mt-1" />
                    </div>
                  )}
                  <Button type="submit" disabled={phoneLoading} className="h-11 w-full">
                    {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {confirmation ? "Verify Phone" : "Login"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
              <GoogleButton label="Create with Google" />
              <form onSubmit={confirmation ? handleVerifyPhone : (event) => handleSendPhoneCode("signup", event)} className="space-y-4">
                {!confirmation ? (
                  <div>
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="signup-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="01XXXXXXXXX" className="pl-10" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="signup-code">Verification Code</Label>
                    <Input id="signup-code" inputMode="numeric" value={form.otpCode} onChange={(event) => update("otpCode", event.target.value)} placeholder="Enter code" className="mt-1" />
                  </div>
                )}
                <Button type="submit" disabled={phoneLoading} className="h-11 w-full">
                  {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {confirmation ? "Verify Phone" : "Create with Phone"}
                </Button>
              </form>
            </div>
          )}

          <div id="phone-recaptcha-container" />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Need a customer account? " : "Already have a customer account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setPhoneIntent(mode === "login" ? "signup" : "login");
                setConfirmation(null);
              }}
              className="font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Create one" : "Login"}
            </button>
          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Merchant or staff? <a href="/admin/login" className="font-medium text-primary hover:underline">Use CMS admin login</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
