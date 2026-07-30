"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Banknote, ClipboardCheck, Loader2, RefreshCcw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { useAllOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

type ReturnRequestRow = {
  id: string;
  order_id: string;
  request_type: "return" | "exchange" | "refund" | "partial_refund";
  status: "requested" | "approved" | "rejected" | "received" | "refunded" | "completed";
  reason: string;
  customer_note: string | null;
  internal_note: string | null;
  requested_amount: number;
  approved_amount: number;
  refund_mode: "original_payment" | "cod_cash" | "store_credit" | "manual_transfer" | null;
  courier_status: "not_required" | "pickup_pending" | "in_transit" | "received";
  rma_code: string | null;
  requested_at: string;
};

type CodEntryRow = {
  id: string;
  order_id: string | null;
  courier_provider: string | null;
  reconciliation_status: "pending" | "submitted" | "verified" | "settled" | "disputed";
  amount_collected: number;
  courier_fee: number;
  amount_remitted: number;
  variance_amount: number;
  settlement_reference: string | null;
  settlement_date: string | null;
  note: string | null;
  created_at: string;
};

const currency = (value: number) => `BDT ${Math.max(0, value || 0).toLocaleString("en-BD")}`;

export default function ReturnsOperationsPage() {
  const { activeStoreId, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data: orders = [], isLoading: ordersLoading } = useAllOrders(activeStoreId);
  const defaultOrderId = searchParams.get("orderId") ?? "";
  const [selectedOrderId, setSelectedOrderId] = useState(defaultOrderId);
  const [requestType, setRequestType] = useState<ReturnRequestRow["request_type"]>("return");
  const [reason, setReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("0");
  const [refundMode, setRefundMode] = useState<NonNullable<ReturnRequestRow["refund_mode"]>>("original_payment");
  const [codOrderId, setCodOrderId] = useState(defaultOrderId);
  const [courierProvider, setCourierProvider] = useState("");
  const [amountCollected, setAmountCollected] = useState("0");
  const [courierFee, setCourierFee] = useState("0");
  const [amountRemitted, setAmountRemitted] = useState("0");
  const [settlementReference, setSettlementReference] = useState("");
  const [codNote, setCodNote] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["returns-ops", activeStoreId],
    enabled: Boolean(activeStoreId),
    queryFn: async () => {
      const [{ data: returnsData, error: returnsError }, { data: codData, error: codError }] = await Promise.all([
        (supabase as any)
          .from("store_return_requests")
          .select("id, order_id, request_type, status, reason, customer_note, internal_note, requested_amount, approved_amount, refund_mode, courier_status, rma_code, requested_at")
          .eq("store_id", activeStoreId as string)
          .order("requested_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("store_cod_reconciliation_entries")
          .select("id, order_id, courier_provider, reconciliation_status, amount_collected, courier_fee, amount_remitted, variance_amount, settlement_reference, settlement_date, note, created_at")
          .eq("store_id", activeStoreId as string)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (returnsError) throw returnsError;
      if (codError) throw codError;

      return {
        returns: (returnsData ?? []) as ReturnRequestRow[],
        cod: (codData ?? []) as CodEntryRow[],
      };
    },
  });

  const orderOptions = useMemo(
    () => orders.map((order) => ({ id: order.id, label: `${order.order_number} · ${order.customer_name} · ${currency(order.total)}`, order })),
    [orders],
  );

  const deliveredCodOrders = useMemo(
    () => orders.filter((order) => order.status === "delivered" && /cod/i.test(order.payment_method)),
    [orders],
  );

  const returnSummary = useMemo(() => {
    const returns = data?.returns ?? [];
    return {
      open: returns.filter((entry) => !["completed", "rejected"].includes(entry.status)).length,
      refundsPending: returns.filter((entry) => ["approved", "received"].includes(entry.status)).length,
      refundedValue: returns.filter((entry) => ["refunded", "completed"].includes(entry.status)).reduce((sum, entry) => sum + (entry.approved_amount || entry.requested_amount || 0), 0),
    };
  }, [data?.returns]);

  const codSummary = useMemo(() => {
    const entries = data?.cod ?? [];
    return {
      pending: entries.filter((entry) => ["pending", "submitted"].includes(entry.reconciliation_status)).length,
      settled: entries.filter((entry) => entry.reconciliation_status === "settled").length,
      variance: entries.reduce((sum, entry) => sum + (entry.variance_amount || 0), 0),
    };
  }, [data?.cod]);

  const createReturnMutation = useMutation({
    mutationFn: async () => {
      if (!activeStoreId || !selectedOrderId || !reason.trim()) {
        throw new Error("Choose an order and add the return or refund reason first.");
      }

      const requested = Number(requestedAmount) || 0;
      const order = orders.find((entry) => entry.id === selectedOrderId);
      const payload = {
        store_id: activeStoreId,
        order_id: selectedOrderId,
        request_type: requestType,
        reason: reason.trim(),
        customer_note: customerNote.trim() || null,
        requested_amount: requested,
        approved_amount: 0,
        refund_mode: requestType === "exchange" ? null : refundMode,
        courier_status: requestType === "refund" || requestType === "partial_refund" ? "not_required" : "pickup_pending",
        rma_code: `RMA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        created_by: user?.id ?? null,
        metadata: {
          order_number: order?.order_number ?? null,
          customer_name: order?.customer_name ?? null,
        },
      };

      const { error: insertError } = await (supabase as any).from("store_return_requests").insert(payload);
      if (insertError) throw insertError;
    },
    onSuccess: async () => {
      toast.success("Return or refund case created.");
      setReason("");
      setCustomerNote("");
      setRequestedAmount("0");
      await queryClient.invalidateQueries({ queryKey: ["returns-ops", activeStoreId] });
    },
  });

  const updateReturnMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      approvedAmount,
      courierStatus,
      internalNote,
    }: {
      id: string;
      status: ReturnRequestRow["status"];
      approvedAmount: number;
      courierStatus: ReturnRequestRow["courier_status"];
      internalNote: string | null;
    }) => {
      const patch: Record<string, unknown> = {
        status,
        approved_amount: approvedAmount,
        courier_status: courierStatus,
        internal_note: internalNote,
        resolved_by: ["rejected", "refunded", "completed"].includes(status) ? user?.id ?? null : null,
        resolved_at: ["rejected", "refunded", "completed"].includes(status) ? new Date().toISOString() : null,
      };

      const { error: updateError } = await (supabase as any).from("store_return_requests").update(patch).eq("id", id).eq("store_id", activeStoreId as string);
      if (updateError) throw updateError;
    },
    onSuccess: async () => {
      toast.success("Return case updated.");
      await queryClient.invalidateQueries({ queryKey: ["returns-ops", activeStoreId] });
    },
  });

  const createCodMutation = useMutation({
    mutationFn: async () => {
      if (!activeStoreId) throw new Error("Select a store first.");
      const variance = (Number(amountCollected) || 0) - (Number(courierFee) || 0) - (Number(amountRemitted) || 0);
      const payload = {
        store_id: activeStoreId,
        order_id: codOrderId || null,
        courier_provider: courierProvider.trim() || null,
        reconciliation_status: "pending",
        amount_collected: Number(amountCollected) || 0,
        courier_fee: Number(courierFee) || 0,
        amount_remitted: Number(amountRemitted) || 0,
        variance_amount: variance,
        settlement_reference: settlementReference.trim() || null,
        note: codNote.trim() || null,
        created_by: user?.id ?? null,
      };
      const { error: insertError } = await (supabase as any).from("store_cod_reconciliation_entries").insert(payload);
      if (insertError) throw insertError;
    },
    onSuccess: async () => {
      toast.success("COD reconciliation entry saved.");
      setCourierProvider("");
      setAmountCollected("0");
      setCourierFee("0");
      setAmountRemitted("0");
      setSettlementReference("");
      setCodNote("");
      await queryClient.invalidateQueries({ queryKey: ["returns-ops", activeStoreId] });
    },
  });

  const updateCodMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: CodEntryRow["reconciliation_status"];
    }) => {
      const { error: updateError } = await (supabase as any)
        .from("store_cod_reconciliation_entries")
        .update({
          reconciliation_status: status,
          verified_by: ["verified", "settled"].includes(status) ? user?.id ?? null : null,
          settlement_date: status === "settled" ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .eq("store_id", activeStoreId as string);
      if (updateError) throw updateError;
    },
    onSuccess: async () => {
      toast.success("COD reconciliation updated.");
      await queryClient.invalidateQueries({ queryKey: ["returns-ops", activeStoreId] });
    },
  });

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Returns & COD</CardTitle>
          <CardDescription>Select a store first to manage returns, refunds, and courier remittance.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading || ordersLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading returns and COD workspace...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Returns workspace unavailable</CardTitle>
          <CardDescription>We could not load return and COD operations right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardDescription>Open return cases</CardDescription>
            <CardTitle className="text-3xl">{returnSummary.open}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardDescription>Refunds still pending</CardDescription>
            <CardTitle className="text-3xl">{returnSummary.refundsPending}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardDescription>Net COD variance</CardDescription>
            <CardTitle className="text-3xl">{currency(codSummary.variance)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Create return, exchange, or refund case</CardTitle>
            <CardDescription>Start from a real order so the team can track customer support and money flow together.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Order</Label>
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an order" />
                </SelectTrigger>
                <SelectContent>
                  {orderOptions.map((order) => (
                    <SelectItem key={order.id} value={order.id}>{order.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Request type</Label>
                <Select value={requestType} onValueChange={(value) => setRequestType(value as ReturnRequestRow["request_type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="exchange">Exchange</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="partial_refund">Partial refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Requested amount</Label>
                <Input value={requestedAmount} onChange={(event) => setRequestedAmount(event.target.value)} />
              </div>
            </div>
            {requestType !== "exchange" ? (
              <div className="space-y-2">
                <Label>Refund mode</Label>
                <Select value={refundMode} onValueChange={(value) => setRefundMode(value as NonNullable<ReturnRequestRow["refund_mode"]>)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original_payment">Original payment path</SelectItem>
                    <SelectItem value="cod_cash">COD cash return</SelectItem>
                    <SelectItem value="manual_transfer">Manual transfer</SelectItem>
                    <SelectItem value="store_credit">Store credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Why is the customer asking?</Label>
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Wrong size, damaged parcel, duplicate order, courier issue..." />
            </div>
            <div className="space-y-2">
              <Label>Customer note</Label>
              <Textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder="Optional customer-facing detail or promise." />
            </div>
            <Button type="button" onClick={() => createReturnMutation.mutate()} disabled={createReturnMutation.isPending}>
              {createReturnMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Create case
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Track COD remittance</CardTitle>
            <CardDescription>Record what the courier collected, charged, and actually remitted so operators can spot gaps quickly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Delivered COD order</Label>
              <Select value={codOrderId} onValueChange={setCodOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a delivered COD order" />
                </SelectTrigger>
                <SelectContent>
                  {deliveredCodOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>{order.order_number} · {order.customer_name} · {currency(order.total)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Courier provider</Label>
                <Input value={courierProvider} onChange={(event) => setCourierProvider(event.target.value)} placeholder="Pathao, RedX, Steadfast..." />
              </div>
              <div className="space-y-2">
                <Label>Settlement reference</Label>
                <Input value={settlementReference} onChange={(event) => setSettlementReference(event.target.value)} placeholder="Bank txn / courier sheet ref" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Collected</Label>
                <Input value={amountCollected} onChange={(event) => setAmountCollected(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Courier fee</Label>
                <Input value={courierFee} onChange={(event) => setCourierFee(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Remitted</Label>
                <Input value={amountRemitted} onChange={(event) => setAmountRemitted(event.target.value)} />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground">
              Expected variance right now: <span className="font-semibold text-foreground">{currency((Number(amountCollected) || 0) - (Number(courierFee) || 0) - (Number(amountRemitted) || 0))}</span>
            </div>
            <div className="space-y-2">
              <Label>Operator note</Label>
              <Textarea value={codNote} onChange={(event) => setCodNote(event.target.value)} placeholder="Anything the reconciliation owner should remember." />
            </div>
            <Button type="button" onClick={() => createCodMutation.mutate()} disabled={createCodMutation.isPending}>
              {createCodMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              Save COD entry
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Open return cases</CardTitle>
            <CardDescription>Keep support, operations, and refund state visible in one queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.returns?.length ?? 0) === 0 ? (
              <AdminEmptyState
                icon={ArrowRightLeft}
                title="No return cases yet"
                description="Return, exchange, and refund requests will appear here once the team starts logging them."
              />
            ) : (
              data?.returns.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border bg-background/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.request_type.replace("_", " ")} · {entry.rma_code ?? "RMA pending"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{currency(entry.approved_amount || entry.requested_amount)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.status}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Select defaultValue={entry.status} onValueChange={(value) => updateReturnMutation.mutate({
                      id: entry.id,
                      status: value as ReturnRequestRow["status"],
                      approvedAmount: entry.approved_amount || entry.requested_amount || 0,
                      courierStatus: entry.courier_status,
                      internalNote: entry.internal_note,
                    })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requested">Requested</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="received">Received back</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue={entry.courier_status} onValueChange={(value) => updateReturnMutation.mutate({
                      id: entry.id,
                      status: entry.status,
                      approvedAmount: entry.approved_amount || entry.requested_amount || 0,
                      courierStatus: value as ReturnRequestRow["courier_status"],
                      internalNote: entry.internal_note,
                    })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_required">No courier step</SelectItem>
                        <SelectItem value="pickup_pending">Pickup pending</SelectItem>
                        <SelectItem value="in_transit">In transit</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateReturnMutation.mutate({
                        id: entry.id,
                        status: "approved",
                        approvedAmount: entry.requested_amount || entry.approved_amount || 0,
                        courierStatus: entry.courier_status,
                        internalNote: entry.internal_note,
                      })}
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Approve amount
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>COD reconciliation queue</CardTitle>
            <CardDescription>Move entries from pending toward verified and settled, with variance visible the whole way.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.cod?.length ?? 0) === 0 ? (
              <AdminEmptyState
                icon={Banknote}
                title="No COD entries yet"
                description="Courier remittance records will appear here once the team starts reconciling delivered COD orders."
              />
            ) : (
              data?.cod.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border bg-background/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.courier_provider || "Courier not set"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.settlement_reference || "No settlement reference yet"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{currency(entry.variance_amount)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.reconciliation_status}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                    <div className="rounded-xl bg-muted/50 px-3 py-2">Collected: {currency(entry.amount_collected)}</div>
                    <div className="rounded-xl bg-muted/50 px-3 py-2">Courier fee: {currency(entry.courier_fee)}</div>
                    <div className="rounded-xl bg-muted/50 px-3 py-2">Remitted: {currency(entry.amount_remitted)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["pending", "submitted", "verified", "settled", "disputed"] as CodEntryRow["reconciliation_status"][]).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={entry.reconciliation_status === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateCodMutation.mutate({ id: entry.id, status })}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
