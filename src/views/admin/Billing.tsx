"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, History, Zap, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Billing() {
  const { activeStoreId, role } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [actionPlanId, setActionPlanId] = useState<string | null>(null);

  useEffect(() => {
    const paymentStatus = searchParams?.get("payment");
    const message = searchParams?.get("message");
    if (paymentStatus) {
      if (paymentStatus === "success") {
        toast.success("Payment successful! Your subscription has been updated.");
      } else if (paymentStatus === "cancelled") {
        toast.info("Payment was cancelled.");
      } else {
        toast.error(message || "Payment failed. Please try again.");
      }
      
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["admin-billing-subscription", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null;
      const { data, error } = await (supabase as any)
        .from("store_subscriptions")
        .select("*, cms_plans(*)")
        .eq("store_id", activeStoreId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!activeStoreId,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["admin-billing-invoices", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return [];
      const { data, error } = await (supabase as any)
        .from("store_invoices")
        .select("*")
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeStoreId,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["admin-billing-plans"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cms_plans")
        .select("id, name, description, monthly_price, store_limit, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data || [];
    },
  });

  if (role !== "admin") {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">You do not have permission to view billing settings.</p>
      </div>
    );
  }

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error("Please sign in again before continuing");
    }
    return token;
  };

  const refreshBilling = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscription", activeStoreId] }),
      queryClient.invalidateQueries({ queryKey: ["admin-billing-invoices", activeStoreId] }),
      queryClient.invalidateQueries({ queryKey: ["store-entitlements", activeStoreId] }),
    ]);
  };

  const handlePayNow = async (targetPlanId?: string) => {
    try {
      if (!activeStoreId) {
        throw new Error("No active store selected");
      }

      const planId = targetPlanId || subscription?.cms_plans?.id || "growth";
      setActionPlanId(planId);
      const token = await getAccessToken();

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeId: activeStoreId, planId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to initialize checkout");
      }

      const { paymentUrl } = await res.json();
      if (paymentUrl) {
        window.location.href = paymentUrl;
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Checkout failed. Please try again later.");
    } finally {
      setActionPlanId(null);
    }
  };

  const handleSelectPlan = async (plan: any) => {
    try {
      if (!activeStoreId) {
        throw new Error("No active store selected");
      }

      if (plan.id === subscription?.plan_id) {
        return;
      }

      const monthlyPrice = Number(plan.monthly_price ?? 0);
      if (monthlyPrice > 0) {
        await handlePayNow(plan.id);
        return;
      }

      setActionPlanId(plan.id);
      const token = await getAccessToken();
      const res = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeId: activeStoreId, planId: plan.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update plan");
      }

      toast.success(`Plan changed to ${plan.name}.`);
      await refreshBilling();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to update plan.");
    } finally {
      setActionPlanId(null);
    }
  };

  const planName = subscription?.cms_plans?.name || "Starter Plan";
  const planPrice = subscription?.cms_plans?.monthly_price || 0;
  const currentPlanId = subscription?.plan_id || subscription?.cms_plans?.id || "starter";
  const status = subscription?.status || "trialing";
  const trialEndsAt = subscription?.trial_ends_at;
  const currentPeriodEndsAt = subscription?.current_period_ends_at;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Trialing</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing & Plans</h2>
          <p className="text-muted-foreground">Manage your subscription and billing history.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
              {getStatusBadge(status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-bold text-foreground">
                {planName}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {planPrice === 0 ? "Free forever" : `BDT ${planPrice} / month`}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              {status === "trialing" && trialEndsAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trial ends</span>
                  <span className="font-medium text-foreground">{format(new Date(trialEndsAt), "PPP")}</span>
                </div>
              )}
              {currentPeriodEndsAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Next billing date</span>
                  <span className="font-medium text-foreground">{format(new Date(currentPeriodEndsAt), "PPP")}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 border-t border-border flex flex-col gap-3 items-stretch">
            {status === "past_due" || status === "trialing" ? (
              <Button onClick={() => handlePayNow()} className="w-full" disabled={Boolean(actionPlanId)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Now (BDT {planPrice})
              </Button>
            ) : null}
            <Button variant="outline" className="w-full" onClick={() => document.getElementById("available-plans")?.scrollIntoView({ behavior: "smooth" })}>
              View Plans
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Payment History
            </CardTitle>
            <CardDescription>Recent invoices and payments.</CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Loading history...</div>
            ) : invoices && invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                    <div>
                      <div className="font-medium text-sm text-foreground">BDT {invoice.amount}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(invoice.created_at), "PPP")}</div>
                    </div>
                    {invoice.status === "paid" ? (
                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </Badge>
                    ) : invoice.status === "failed" ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Failed
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border rounded-lg border-dashed border-border bg-muted/20">
                <p className="text-sm text-muted-foreground">No payment history available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="available-plans" className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Available Plans</CardTitle>
          <CardDescription>Choose a package for this store. Paid packages start checkout before activation.</CardDescription>
        </CardHeader>
        <CardContent>
          {plansLoading || subLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading plans...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {(plans || []).map((plan: any) => {
                const monthlyPrice = Number(plan.monthly_price ?? 0);
                const isCurrent = plan.id === currentPlanId;
                const isCustom = plan.monthly_price === null;
                const isBusy = actionPlanId === plan.id;

                return (
                  <div key={plan.id} className={`rounded-lg border p-4 ${isCurrent ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                      </div>
                      {isCurrent ? <Badge>Current</Badge> : null}
                    </div>
                    <div className="mt-5">
                      <p className="text-2xl font-bold text-foreground">
                        {isCustom ? "Custom" : monthlyPrice === 0 ? "Free" : `BDT ${monthlyPrice}`}
                      </p>
                      {!isCustom && monthlyPrice > 0 ? <p className="text-xs text-muted-foreground">per month</p> : null}
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      {plan.store_limit ? `${plan.store_limit} store${plan.store_limit === 1 ? "" : "s"}` : "Unlimited stores"}
                    </div>
                    <Button
                      className="mt-5 w-full"
                      variant={isCurrent ? "secondary" : monthlyPrice > 0 ? "default" : "outline"}
                      disabled={isCurrent || isCustom || Boolean(actionPlanId)}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isCurrent ? "Current Plan" : isCustom ? "Contact Sales" : monthlyPrice > 0 ? "Upgrade & Pay" : "Switch to Free"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
