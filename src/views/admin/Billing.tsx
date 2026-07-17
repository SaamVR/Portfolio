"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, History, Zap, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canUseCustomDomains,
  formatPlanPrice,
  getPlanAnnualDiscountPercent,
  getEffectiveSubscriptionStatus,
  getPlanPrice,
  getPlanTrialDays,
  getRemainingTrialDays,
  isContactOnlyPlan,
  type BillingInterval,
} from "@/lib/billing/plans";

export default function Billing() {
  const { activeStoreId, role } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [actionPlanId, setActionPlanId] = useState<string | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<any | null>(null);
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<BillingInterval>("monthly");
  const [paymentMode, setPaymentMode] = useState<"choose" | "automated" | "manual">("choose");
  const [trxId, setTrxId] = useState("");
  const [submittingManualPayment, setSubmittingManualPayment] = useState(false);

  const platformManualBkashNumber = process.env.NEXT_PUBLIC_PLATFORM_BKASH_NUMBER || "01700-000000";

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

  useEffect(() => {
    setActionPlanId(null);
    setPaymentDialogOpen(false);
    setSelectedPlanForPayment(null);
    setSelectedBillingInterval("monthly");
    setPaymentMode("choose");
    setTrxId("");
    setSubmittingManualPayment(false);
  }, [activeStoreId]);

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
        .select("id, name, description, monthly_price, annual_price, annual_discount_percentage, currency_code, store_limit, is_active, sort_order, trial_days, contact_only")
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

  const handleInitiatePayment = (plan: any, billingInterval: BillingInterval = "monthly") => {
    setSelectedPlanForPayment(plan);
    setSelectedBillingInterval(billingInterval);
    setPaymentMode("choose");
    setTrxId("");
    setPaymentDialogOpen(true);
  };

  const handlePayNow = async (targetPlanId?: string, billingInterval: BillingInterval = selectedBillingInterval) => {
    try {
      if (!activeStoreId) {
        throw new Error("No active store selected");
      }

      const planId = targetPlanId || subscription?.cms_plans?.id || "advanced";
      setActionPlanId(planId);
      const token = await getAccessToken();

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeId: activeStoreId, planId, billingInterval }),
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

      if (isContactOnlyPlan(plan)) {
        router.push("/contact");
        return;
      }

      const monthlyPrice = Number(plan.monthly_price ?? 0);
      if (monthlyPrice > 0) {
        handleInitiatePayment(plan, "monthly");
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

  const handleManualPaymentSubmit = async () => {
    if (!trxId.trim()) {
      toast.error("Please enter the Transaction ID (TrxID) first.");
      return;
    }

    try {
      setSubmittingManualPayment(true);
      if (!activeStoreId || !selectedPlanForPayment) {
        throw new Error("No active store or plan selected");
      }

      const { error } = await supabase
        .from("store_invoices")
        .insert({
          store_id: activeStoreId,
          plan_id: selectedPlanForPayment.id,
          amount: getPlanPrice(selectedPlanForPayment, selectedBillingInterval),
          billing_interval: selectedBillingInterval,
          currency: "BDT",
          status: "pending",
          provider: "bkash_manual",
          payment_method: "bkash_manual",
          provider_invoice_id: trxId.trim(),
        });

      if (error) throw error;

      toast.success("Manual payment request submitted! An admin will verify the payment shortly.");
      setPaymentDialogOpen(false);
      await refreshBilling();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to submit manual payment.");
    } finally {
      setSubmittingManualPayment(false);
    }
  };

  const planName = subscription?.cms_plans?.name || "Free";
  const planPrice = subscription?.cms_plans?.monthly_price || 0;
  const currentPlanId = subscription?.plan_id || subscription?.cms_plans?.id || "free";
  const status = getEffectiveSubscriptionStatus(subscription) || "trialing";
  const trialEndsAt = subscription?.trial_ends_at;
  const currentPeriodEndsAt = subscription?.current_period_ends_at;
  const remainingTrialDays = getRemainingTrialDays(trialEndsAt);
  const confirmedInvoices = (invoices || []).filter((invoice: any) => invoice.status === "paid");
  const pendingInvoices = (invoices || []).filter((invoice: any) => invoice.status === "pending");
  const failedInvoices = (invoices || []).filter((invoice: any) => invoice.status === "failed");
  const customDomainsUnlocked = canUseCustomDomains(subscription, subscription?.cms_plans, true);

  const formatInvoiceMethod = (invoice: any) => {
    if (invoice.payment_method === "bkash_manual") return "Manual bKash";
    if (invoice.payment_method === "bkash") return "bKash Checkout";
    if (typeof invoice.payment_method === "string" && invoice.payment_method.trim()) {
      return invoice.payment_method.replace(/_/g, " ");
    }
    if (typeof invoice.provider === "string" && invoice.provider.trim()) {
      return invoice.provider.replace(/_/g, " ");
    }
    return "Platform billing";
  };

  const getInvoiceDisplayDate = (invoice: any) => {
    if (invoice.status === "paid" && invoice.paid_at) return invoice.paid_at;
    return invoice.created_at;
  };

  const renderInvoiceRow = (invoice: any) => {
    const displayDate = getInvoiceDisplayDate(invoice);
    const billingStart = invoice.billing_period_start || (invoice.status === "paid" ? invoice.paid_at : null);
    return (
      <div key={invoice.id} className="rounded-xl border border-border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-sm text-foreground">BDT {invoice.amount}</div>
              {invoice.status === "paid" ? (
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  Confirmed
                </Badge>
              ) : invoice.status === "failed" ? (
                <Badge variant="destructive">Failed</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground">
              <p>Date: {displayDate ? format(new Date(displayDate), "PPP p") : "N/A"}</p>
              <p>Method: {formatInvoiceMethod(invoice)}</p>
              <p>Plan: {invoice.plan_id}</p>
              {invoice.provider_invoice_id ? <p>Reference: {invoice.provider_invoice_id}</p> : null}
              {billingStart || invoice.billing_period_end ? (
                <p>
                  Billing period:{" "}
                  {billingStart ? format(new Date(billingStart), "PPP") : "N/A"}
                  {" - "}
                  {invoice.billing_period_end ? format(new Date(invoice.billing_period_end), "PPP") : "N/A"}
                </p>
              ) : null}
              {invoice.status === "paid" && invoice.paid_at ? <p>Activated on: {format(new Date(invoice.paid_at), "PPP p")}</p> : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                {`${formatPlanPrice(subscription?.cms_plans)} / month`}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              {status === "trialing" && trialEndsAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trial ends</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(trialEndsAt), "PPP")} {remainingTrialDays != null ? `(${remainingTrialDays} day${remainingTrialDays === 1 ? "" : "s"} left)` : ""}
                  </span>
                </div>
              )}
              {currentPeriodEndsAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Next billing date</span>
                  <span className="font-medium text-foreground">{format(new Date(currentPeriodEndsAt), "PPP")}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Custom domains</span>
                <span className="font-medium text-foreground">
                  {customDomainsUnlocked ? "Unlocked" : status === "trialing" ? "Locked during trial" : "Not included on this plan"}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 border-t border-border flex flex-col gap-3 items-stretch">
            {status === "past_due" || status === "trialing" ? (
              <Button onClick={() => handleInitiatePayment(subscription?.cms_plans)} className="w-full" disabled={Boolean(actionPlanId)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Now ({formatPlanPrice(subscription?.cms_plans)})
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
            <CardDescription>Past payments, payment methods, and verification status.</CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Loading history...</div>
            ) : invoices && invoices.length > 0 ? (
              <Tabs defaultValue="confirmed" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="confirmed">Confirmed ({confirmedInvoices.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingInvoices.length})</TabsTrigger>
                  <TabsTrigger value="failed">Failed ({failedInvoices.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="confirmed" className="space-y-4">
                  {confirmedInvoices.length > 0 ? confirmedInvoices.map(renderInvoiceRow) : (
                    <div className="py-8 text-center border rounded-lg border-dashed border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">No confirmed payments yet.</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="pending" className="space-y-4">
                  {pendingInvoices.length > 0 ? pendingInvoices.map(renderInvoiceRow) : (
                    <div className="py-8 text-center border rounded-lg border-dashed border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">No pending payment requests.</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="failed" className="space-y-4">
                  {failedInvoices.length > 0 ? failedInvoices.map(renderInvoiceRow) : (
                    <div className="py-8 text-center border rounded-lg border-dashed border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">No failed payments.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                const isCurrent = plan.id === currentPlanId;
                const isContactPlan = isContactOnlyPlan(plan);
                const isBusy = actionPlanId === plan.id;
                const planTrial = `${getPlanTrialDays(plan)}-day trial`;
                const annualDiscount = getPlanAnnualDiscountPercent(plan);

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
                        {formatPlanPrice(plan)}
                      </p>
                      <p className="text-xs text-muted-foreground">per month</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{formatPlanPrice(plan, "annual")} per year</p>
                      {annualDiscount > 0 ? <p className="text-xs text-primary">Save {annualDiscount}% with annual billing</p> : null}
                    </div>
                    <p className="mt-2 text-xs font-medium text-primary">{planTrial}</p>
                    <div className="mt-4 text-xs text-muted-foreground">
                      {plan.store_limit ? `${plan.store_limit} store${plan.store_limit === 1 ? "" : "s"}` : "Unlimited stores"}
                    </div>
                    <Button
                      className="mt-5 w-full"
                      variant={isCurrent ? "secondary" : isContactPlan ? "outline" : "default"}
                      disabled={isCurrent || Boolean(actionPlanId)}
                      onClick={() => {
                        if (isContactPlan) {
                          router.push("/contact");
                          return;
                        }
                        void handleSelectPlan(plan);
                      }}
                    >
                      {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isCurrent ? "Current Plan" : isContactPlan ? "Contact Support" : Number(plan.monthly_price ?? 0) > 0 ? "Start Trial" : "Choose Free"}
                    </Button>
                    {!isCurrent && !isContactPlan ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" disabled={Boolean(actionPlanId)} onClick={() => {
                          handleInitiatePayment(plan, "monthly");
                        }}>
                          Monthly
                        </Button>
                        <Button type="button" variant="outline" disabled={Boolean(actionPlanId)} onClick={() => {
                          handleInitiatePayment(plan, "annual");
                        }}>
                          Annual
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {paymentMode === "choose" ? "Choose Payment Method" : "Manual bKash Payment"}
            </DialogTitle>
            <DialogDescription>
              {paymentMode === "choose" 
                ? `Start the ${selectedPlanForPayment?.name} plan for ${formatPlanPrice(selectedPlanForPayment, selectedBillingInterval)} per ${selectedBillingInterval === "annual" ? "year" : "month"} after a ${getPlanTrialDays(selectedPlanForPayment)}-day trial.`
                : `Please follow instructions below to pay ${formatPlanPrice(selectedPlanForPayment, selectedBillingInterval)} using manual bKash.`
              }
            </DialogDescription>
          </DialogHeader>

          {paymentMode === "choose" ? (
            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={selectedBillingInterval === "monthly" ? "default" : "outline"} onClick={() => setSelectedBillingInterval("monthly")}>
                  Monthly
                </Button>
                <Button type="button" variant={selectedBillingInterval === "annual" ? "default" : "outline"} onClick={() => setSelectedBillingInterval("annual")}>
                  Annual
                </Button>
              </div>
              <Button 
                onClick={() => {
                  setPaymentDialogOpen(false);
                  handlePayNow(selectedPlanForPayment?.id, selectedBillingInterval);
                }} 
                className="w-full h-14 flex flex-col items-center justify-center gap-0.5"
              >
                <span className="font-semibold text-sm">Automated bKash Checkout</span>
                <span className="text-[10px] opacity-80">Pay instantly & activate plan immediately</span>
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                variant="outline"
                onClick={() => setPaymentMode("manual")} 
                className="w-full h-14 flex flex-col items-center justify-center gap-0.5 border-primary text-primary hover:bg-primary/5"
              >
                <span className="font-semibold text-sm">Manual bKash (Send Money)</span>
                <span className="text-[10px] opacity-80">Send money manually & submit TrxID</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-primary/5 p-4 border border-primary/10 text-sm space-y-2">
                <p className="font-medium text-foreground">Payment Instructions:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground text-xs">
                  <li>Go to your bKash app or dial *247#</li>
                  <li>Choose <span className="font-bold text-foreground">Send Money</span></li>
                  <li>Enter Merchant/Receiver Number: <span className="font-bold text-foreground text-sm font-mono tracking-wider">{platformManualBkashNumber}</span></li>
                  <li>Amount: <span className="font-bold text-foreground text-sm">{formatPlanPrice(selectedPlanForPayment, selectedBillingInterval)}</span></li>
                  <li>Complete transaction and copy the Transaction ID (TrxID)</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Transaction ID (TrxID)</label>
                <Input 
                  placeholder="e.g. 8N70X9K1A4" 
                  value={trxId} 
                  onChange={(e) => setTrxId(e.target.value)} 
                  className="font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setPaymentMode("choose")} 
                  disabled={submittingManualPayment}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleManualPaymentSubmit} 
                  disabled={submittingManualPayment || !trxId.trim()}
                  className="flex-[2]"
                >
                  {submittingManualPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : "Submit Transaction"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
