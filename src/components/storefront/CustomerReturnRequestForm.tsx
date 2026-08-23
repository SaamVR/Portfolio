"use client";

import { useState, type FormEvent } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomerReturnRequestFormProps {
  storeId: string;
  storeName: string;
}

type RequestType = "return" | "exchange" | "refund";

type SubmissionResult = {
  rmaCode: string | null;
  status: string;
};

export function CustomerReturnRequestForm({ storeId, storeName }: CustomerReturnRequestFormProps) {
  const [orderNumber, setOrderNumber] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("return");
  const [reason, setReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/returns/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storeId,
          orderNumber,
          customerPhone,
          requestType,
          reason,
          customerNote,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409 && payload?.request) {
          setResult({
            rmaCode: typeof payload.request.rmaCode === "string" ? payload.request.rmaCode : null,
            status: typeof payload.request.status === "string" ? payload.request.status : "requested",
          });
          return;
        }

        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to submit your request right now.");
      }

      setResult({
        rmaCode: typeof payload?.request?.rmaCode === "string" ? payload.request.rmaCode : null,
        status: typeof payload?.request?.status === "string" ? payload.request.status : "requested",
      });
      setReason("");
      setCustomerNote("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your request right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="return-request-heading">
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="return-request-heading" className="font-heading text-xl font-bold text-foreground sm:text-2xl">
            Request a return, exchange or refund
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the order number and mobile number used at checkout. {storeName} will review the request before any refund, exchange or pickup is approved.
          </p>
        </div>
      </div>

      {result ? (
        <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm" role="status">
          <p className="font-semibold text-foreground">Your request is in review.</p>
          <p className="mt-1 text-muted-foreground">
            {result.rmaCode ? `Reference: ${result.rmaCode}. ` : ""}
            Keep this reference and wait for {storeName} to confirm the next step before sending anything back.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="return-order-number">Order number</Label>
            <Input
              id="return-order-number"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="e.g. ORD-123456"
              autoComplete="off"
              required
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-customer-phone">Checkout mobile number</Label>
            <Input
              id="return-customer-phone"
              type="tel"
              inputMode="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              required
              maxLength={30}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-request-type">What do you need?</Label>
          <select
            id="return-request-type"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value as RequestType)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="return">Return an item</option>
            <option value="exchange">Exchange an item</option>
            <option value="refund">Request a refund</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-reason">Reason</Label>
          <Textarea
            id="return-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Tell the store what went wrong."
            required
            minLength={3}
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-note">Extra details (optional)</Label>
          <Textarea
            id="return-note"
            value={customerNote}
            onChange={(event) => setCustomerNote(event.target.value)}
            placeholder="Add size, item name, damage details or anything else that may help."
            maxLength={1000}
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Submitting..." : "Submit request"}
        </Button>
      </form>
    </section>
  );
}
