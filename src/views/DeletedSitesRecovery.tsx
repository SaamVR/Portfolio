"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, Mail, MessageSquare, Store, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Link, Navigate } from "@/lib/react-router-dom-shim";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DeletionRecord = {
  id: string;
  store_name: string;
  store_slug: string;
  merchant_visible_reason: string;
  deletion_source: string;
  created_at: string;
};

export default function DeletedSitesRecovery() {
  const { user, loading } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["deleted-sites-recovery", user?.id ?? ""],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [{ data: deletionRecords }, { data: accountStatus }, { data: stores }] = await Promise.all([
        (supabase as any)
          .from("store_deletion_records")
          .select("id, store_name, store_slug, merchant_visible_reason, deletion_source, created_at")
          .eq("owner_user_id", user?.id as string)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("merchant_account_statuses")
          .select("can_create_store, status_note")
          .eq("user_id", user?.id as string)
          .maybeSingle(),
        (supabase as any)
          .from("stores")
          .select("id")
          .eq("owner_id", user?.id as string)
          .limit(1),
      ]);

      return {
        deletionRecords: (deletionRecords ?? []) as DeletionRecord[],
        accountStatus: accountStatus as { can_create_store?: boolean | null; status_note?: string | null } | null,
        hasActiveStores: Boolean(stores?.length),
      };
    },
  });

  const latestDeletion = data?.deletionRecords?.[0] ?? null;
  const canCreateAnotherSite = data?.accountStatus?.can_create_store !== false;
  const restrictionNote = typeof data?.accountStatus?.status_note === "string" && data.accountStatus.status_note.trim()
    ? data.accountStatus.status_note
    : null;
  const prefilledName = useMemo(() => {
    const metadataName = typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";
    return metadataName || user?.email || "Merchant";
  }, [user?.email, user?.user_metadata]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      toast.error("Please describe what you need help with first.");
      return;
    }

    if (!user?.email) {
      toast.error("Please sign in again before sending a support message.");
      return;
    }

    setSending(true);
    try {
      const { data: allowed, error: rateErr } = await supabase.rpc("check_contact_rate_limit", {
        _email: user.email.trim(),
      });
      if (rateErr) throw rateErr;
      if (!allowed) {
        toast.error("Too many messages were sent recently. Please wait a bit before trying again.");
        return;
      }

      const composedMessage = [
        "[Deleted Site Recovery]",
        latestDeletion ? `Latest site: ${latestDeletion.store_name} (${latestDeletion.store_slug})` : null,
        latestDeletion ? `Removal reason: ${latestDeletion.merchant_visible_reason}` : null,
        "",
        trimmedMessage,
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase.from("contact_messages").insert({
        store_id: null,
        name: prefilledName,
        email: user.email.trim(),
        message: composedMessage,
      });

      if (error) throw error;

      setMessage("");
      toast.success("Your message has been sent to support.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (data?.hasActiveStores) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Layout>
      <SEOHead title="Site Recovery" description="Why your storefront was removed and what you can do next." noindex />
      <PageTransition>
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-border bg-card/90 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="font-heading text-3xl">We&apos;re sorry your site is no longer available.</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    Your storefront was removed from the workspace. The details below explain the latest removal and what you can do next.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading your recovery details...
                  </div>
                ) : latestDeletion ? (
                  <>
                    <div className="rounded-2xl border border-border bg-background/80 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Latest removed site</p>
                      <div className="mt-3 flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{latestDeletion.store_name}</p>
                          <p className="text-sm text-muted-foreground">/{latestDeletion.store_slug}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background/80 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why this happened</p>
                      <p className="mt-3 text-sm leading-7 text-foreground">
                        {latestDeletion.merchant_visible_reason}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-background/80 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">What happens next</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                        <li>You can contact support below if you need clarification or want the decision reviewed.</li>
                        <li>If your account is still allowed to create stores, you can start another site right away.</li>
                        <li>If creation is blocked, the support team will need to restore that access first.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background/70 p-6 text-sm text-muted-foreground">
                    No deleted-site history was found for this account yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border bg-card/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Undo2 className="h-5 w-5 text-primary" />
                    Next Step
                  </CardTitle>
                  <CardDescription>
                    {canCreateAnotherSite
                      ? "You can create another storefront from this account."
                      : "Store creation is currently blocked for this account."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canCreateAnotherSite ? (
                    <div className="space-y-3">
                      <Button asChild className="w-full gap-2">
                        <Link to="/signup">
                          Create Another Site
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Starting a new site does not remove your previous deletion record. Support can still review the earlier decision if needed.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                      {restrictionNote ?? "Your account cannot create new stores right now. Please contact support for a review."}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Contact Support
                  </CardTitle>
                  <CardDescription>
                    Tell us what happened from your side and what outcome you need.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="deleted-sites-email">Email</Label>
                      <Input id="deleted-sites-email" value={user.email ?? ""} disabled />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="deleted-sites-message">Message</Label>
                      <Textarea
                        id="deleted-sites-message"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={6}
                        placeholder="Explain what you need help with, any context we should review, and whether you want this decision reconsidered."
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={sending}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Send to Support
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
}
