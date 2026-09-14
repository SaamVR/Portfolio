"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [returnSettlementNotes, setReturnSettlementNotes] = useState<Record<string, string>>({});
  const [codOrderId, setCodOrderId] = useState(defaultOrderId);
  const [courierProvider, setCourierProvider] = useState("");
  const [amountCollected, setAmountCollected] = useState("0");
  const [courierFee, setCourierFee] = useState("0");
  const [amountRemitted, setAmountRemitted] = useState("0");
  const [settlementReference, setSettlementReference] = useState("");
  const [codNote, setCodNote] = useState("");
  const previousStoreIdRef = useRef<string | null>(null);
  const activeStoreIdRef = useRef(activeStoreId);

  useEffect(() => {
    activeStoreIdRef.current = activeStoreId;
    if (!activeStoreId) return;

    const previousStoreId = previousStoreIdRef.current;
    if (previousStoreId && previousStoreId !== activeStoreId) {
      setSelectedOrderId("");
      setRequestType("return");
      setReason("");
      setCustomerNote("");
      setRequestedAmount("0");
      setRefundMode("original_payment");
      setReturnSettlementNotes({});
      setCodOrderId("");
      setCourierProvider("");
      setAmountCollected("0");
      setCourierFee("0");
      setAmountRemitted("0");
      setSettlementReference("");
      setCodNote("");
    }
    previousStoreIdRef.current = activeStoreId;
  }, [activeStoreId]);

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

  useEffect(() => {
    if (!activeStoreId || ordersLoading) return;
    setSelectedOrderId((current) => (current && orders.some((order) => order.id === current) ? current : ""));
    setCodOrderId((current) => (current && deliveredCodOrders.some((order) => order.id === current) ? current : ""));
  }, [activeStoreId, deliveredCodOrders, orders, ordersLoading]);

  const returnSummary = useMemo(() => {
    const returns = data?.returns ?? [];
    return {
      open: returns.filter((entry) => !["completed", "rejected"].includes(entry.status)).length,
      refundsPending: returns.filter((entry) => ["approved", "received"].includes(entry.status)).length,
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
    mutationFn: async ({
      storeId,
      orderId,
      orderNumber,
      customerName,
      requestType: submittedRequestType,
      reason: submittedReason,
      customerNote: submittedCustomerNote,
      requestedAmount: submittedAmount,
      refundMode: submittedRefundMode,
      createdBy,
    }: {
      storeId: string;
      orderId: string;
      orderNumber: string;
      customerName: string;
      requestType: ReturnRequestRow["request_type"];
      reason: string;
      customerNote: string;
      requestedAmount: number;
      refundMode: NonNullable<ReturnRequestRow["refund_mode"]>;
      createdBy: string | null;
    }) => {
      const payload = {
        store_id: storeId,
        order_id: orderId,
        request_type: submittedRequestType,
        reason: submittedReason,
        customer_note: submittedCustomerNote || null,
        requested_amount: submittedAmount,
        approved_amount: 0,
        refund_mode: submittedRequestType === "exchange" ? null : submittedRefundMode,
        courier_status: submittedRequestType === "refund" || submittedRequestType === "partial_refund" ? "not_required" : "pickup_pending",
        rma_code: `RMA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        created_by: createdBy,
        metadata: { order_number: orderNumber, customer_name: customerName },
      };
      const { error: insertError } = await (supabase as any).from("store_return_requests").insert(payload);
      if (insertError) throw insertError;
    },
    onSuccess: async (_data, variables) => {
      toast.success("Return or refund case created.");
      if (activeStoreIdRef.current === variables.storeId) {
        setReason("");
        setCustomerNote("");
        setRequestedAmount("0");
      }
      await queryClient.invalidateQueries({ queryKey: ["returns-ops", variables.storeId] });
    },
  });

  const updateReturnMutation = useMutation({
    mutationFn: async ({
      storeId, id, status, approvedAmount, courierStatus, internalNote, resolvedBy,
    }: {
      storeId: string;
      id: string;
      status: ReturnRequestRow["status"];
      approvedAmount: number;
      courierStatus: ReturnRequestRow["courier_status"];
      internalNote: string | null;
      resolvedBy: string | null;
    }) => {
      const isResolved = ["rejected", "refunded", "completed"].includes(status);
      const patch: Record<string, unknown> = {
        status, approved_amount: approvedAmount, courier_status: courierStatus, internal_note: internalNote,
        resolved_by: isResolved ? resolvedBy : null,
        resolved_at: isResolved ? new Date().toISOString() : null,
      };
      const { error: updateError } = await (supabase as any)
        .from("store_return_requests").update(patch).eq("id", id).eq("store_id", storeId);
      if (updateError) throw updateError;
    },
    onSuccess: async (_data, variables) => {
      toast.success("Return case record updated.");
      await queryClient.invalidateQueries({ queryKey: ["returns-ops", variables.storeId] });
    },
  });

  const createCodMutation = useMutation({
    mutationFn: async ({
      storeId, orderId, courierProvider: submittedProvider, amountCollected: submittedCollected,
      courierFee: submittedFee, amountRemitted: submittedRemitted, settlementReference: submittedReference,
      note, createdBy,
    }: {
      storeId: string;
      orderId: string | null;
      courierProvider: string;
      amountCollected: number;
      courierFee: number;
      amountRemitted: number;
      settlementReference: string;
      note: string;
      createdBy: string | null;
    }) => {
      const variance = submittedCollected - submittedFee - submittedRemitted;
      const payload = {
        store_id: storeId, order_id: orderId, courier_provider: submittedProvider || null,
        reconciliation_status: "pending", amount_collected: submittedCollected, courier_fee: submittedFee,
        amount_remitted: submittedRemitted, variance_amount: variance, settlement_reference: submittedReference || null,
        note: note || null, created_by: createdBy,
      };
      const { error: insertError } = await (supabase as any).from("store_cod_reconciliation_entries").insert(payload);
      if (insertError) throw insertError;
    },
    onSuccess: async (_data, variables) => {
      toast.success("COD reconciliation entry saved.");
      if (activeStoreIdRef.current === variables.storeId) {
        setCourierProvider("");
        setAmountCollected("0");
        setCourierFee("0");
        setAmountRemitted("0");
        setSettlementReference("");
        setCodNote("");
      }
      await queryClient.invalidateQueries({ queryKey: ["returns-ops", variables.storeId] });
    },
  });

  const updateCodMutation = useMutation({
    mutationFn: async ({ storeId, id, status, verifiedBy }: {
      storeId: string;
      id: string;
      status: CodEntryRow["reconciliation_status"];
      verifiedBy: string | null;
    }) => {
      const { error: updateError } = await (supabase as any)
        .from("store_cod_reconciliation_entries")
        .update({
          reconciliation_status: status,
          verified_by: ["verified", "settled"].includes(status) ? verifiedBy : null,
          settlement_date: status === "settled" ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .eq("store_id", storeId);
      if (updateError) throw updateError;
    },
    onSuccess: async (_data, variables) => {
      toast.success("COD reconciliation updated.");
      await queryClient.invalidateQueries({ queryKey: ["returns-ops", variables.storeId] });
    },
  });

  const handleCreateReturn = () => {
    if (!activeStoreId || !selectedOrderId || !reason.trim()) {
      toast.error("Choose an order and add the return or refund reason first.");
      return;
    }
    const order = orders.find((entry) => entry.id === selectedOrderId);
    if (!order) {
      toast.error("That order does not belong to the active store. Choose an order again.");
      return;
    }
    createReturnMutation.mutate({
      storeId: activeStoreId, orderId: order.id, orderNumber: order.order_number, customerName: order.customer_name,
      requestType, reason: reason.trim(), customerNote: customerNote.trim(), requestedAmount: Number(requestedAmount) || 0,
      refundMode, createdBy: user?.id ?? null,
    });
  };

  const updateReturnStatus = (entry: ReturnRequestRow, status: ReturnRequestRow["status"]) => {
    const settlementNote = (returnSettlementNotes[entry.id] ?? entry.internal_note ?? "").trim();
    const requiresSettlementEvidence = status === "refunded" || (status === "completed" && entry.refund_mode !== null);
    if (requiresSettlementEvidence && !settlementNote) {
      toast.error("Record the external refund or settlement reference before marking this case resolved.");
      return;
    }

    updateReturnMutation.mutate({
      storeId: activeStoreId as string,
      id: entry.id,
      status,
      approvedAmount: entry.approved_amount || entry.requested_amount || 0,
      courierStatus: entry.courier_status,
      internalNote: settlementNote || null,
      resolvedBy: user?.id ?? null,
    });
  };

  const handleCreateCod = () => {
    if (!activeStoreId) {
      toast.error("Select a store first.");
      return;
    }
    const order = codOrderId ? deliveredCodOrders.find((entry) => entry.id === codOrderId) : null;
    if (codOrderId && !order) {
      toast.error("That COD order does not belong to the active store. Choose an order again.");
      return;
    }
    createCodMutation.mutate({
      storeId: activeStoreId, orderId: order?.id ?? null, courierProvider: courierProvider.trim(),
      amountCollected: Number(amountCollected) || 0, courierFee: Number(courierFee) || 0,
      amountRemitted: Number(amountRemitted) || 0, settlementReference: settlementReference.trim(),
      note: codNote.trim(), createdBy: user?.id ?? null,
    });
  };

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
            <CardDescription>EZComo records return and refund operations here; it does not move refund money from this screen. Complete the refund externally, then record its reference before marking it refunded.</CardDescription>
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
                    <SelectItem value="original_payment">Original payment — record external refund</SelectItem>
                    <SelectItem value="cod_cash">COD cash — record external refund</SelectItem>
                    <SelectItem value="manual_transfer">Manual transfer — record external refund</SelectItem>
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
            <Button type="button" onClick={handleCreateReturn} disabled={createReturnMutation.isPending}>
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
            <Button type="button" onClick={handleCreateCod} disabled={createCodMutation.isPending}>
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
                  {entry.refund_mode ? (
                    <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                      <Label htmlFor={`return-settlement-${entry.id}`}>External settlement / refund reference</Label>
                      <Input
                        id={`return-settlement-${entry.id}`}
                        value={returnSettlementNotes[entry.id] ?? entry.internal_note ?? ""}
                        onChange={(event) => setReturnSettlementNotes((current) => ({ ...current, [entry.id]: event.target.value }))}
                        placeholder="Provider TrxID, bank reference, cash receipt, or external settlement note"
                      />
                      <p className="text-xs text-muted-foreground">Required before recording a refund as completed. This note documents an external action; EZComo does not execute the refund.</p>
                      {entry.refund_mode === "store_credit" ? (
                        <p className="text-xs font-medium text-destructive">Legacy store-credit mode is unsupported: no customer credit balance was issued by EZComo.</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Select defaultValue={entry.status} onValueChange={(value) => updateReturnStatus(entry, value as ReturnRequestRow["status"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requested">Requested</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="received">Received back</SelectItem>
                        <SelectItem value="refunded">Refund recorded externally</SelectItem>
                        <SelectItem value="completed">Case completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue={entry.courier_status} onValueChange={(value) => updateReturnMutation.mutate({
                      storeId: activeStoreId,
                      id: entry.id,
                      status: entry.status,
                      approvedAmount: entry.approved_amount || entry.requested_amount || 0,
                      courierStatus: value as ReturnRequestRow["courier_status"],
                      internalNote: entry.internal_note,
                      resolvedBy: user?.id ?? null,
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
                        storeId: activeStoreId,
                        id: entry.id,
                        status: "approved",
                        approvedAmount: entry.requested_amount || entry.approved_amount || 0,
                        courierStatus: entry.courier_status,
                        internalNote: entry.internal_note,
                        resolvedBy: user?.id ?? null,
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
                        onClick={() => updateCodMutation.mutate({ storeId: activeStoreId, id: entry.id, status, verifiedBy: user?.id ?? null })}
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
