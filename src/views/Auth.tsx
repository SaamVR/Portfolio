"use client";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Shield } from "lucide-react";
import { signInWithGoogle } from "@/lib/google-auth";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { buildAuthRedirectPath } from "@/lib/auth/auth-redirect-client";
import { sanitizeInternalReturnPath } from "@/lib/auth/post-auth-destination";

type AuthMode = "login" | "signup";

const Auth = () => {
  const { user, loading } = useAuth();
  const currentStore = useOptionalStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const accountPath = storefrontPath("/account", currentStore?.slug);
  const nextPath = sanitizeInternalReturnPath(searchParams.get("next")) || accountPath;
  const redirectPath = buildAuthRedirectPath({
    intent: "customer",
    nextPath,
    storeSlug: currentStore?.slug,
  });
  const oauthRedirectPath = buildAuthRedirectPath({
    intent: "customer",
    storeSlug: currentStore?.slug,
  });
  const isPurchaseReturn = nextPath.includes("/checkout") || nextPath.includes("/cart") || nextPath.includes("/product");
  const LayoutWrapper = currentStore?.id ? StorefrontLayout : Layout;

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      navigate(redirectPath, { replace: true });
    }
  }, [loading, navigate, redirectPath, user]);

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
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle({
        redirectPath: oauthRedirectPath,
        nextPath,
      });
    } catch (error: any) {
      toast.error(error.message || "Google authentication failed");
      setGoogleLoading(false);
    }
  };

  const GoogleButton = ({ label }: { label: string }) => (
    <Button type="button" variant="outline" onClick={handleGoogleAuth} disabled={googleLoading || emailLoading} className="h-11 w-full">
      {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
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

          {isPurchaseReturn ? (
            <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              Sign in to continue your purchase. We will send you back to the same page right after login.
            </div>
          ) : null}

          {mode === "login" ? (
            <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
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
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
              <GoogleButton label="Create with Google" />
              <p className="text-center text-sm text-muted-foreground">New customer accounts are created through Google sign-in.</p>
            </div>
          )}


          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Need a customer account? " : "Already have a customer account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
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
    </LayoutWrapper>
  );
};

export default Auth;
