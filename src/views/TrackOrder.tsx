import { useState } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Package, Search, CheckCircle, Clock, Truck, XCircle, Loader2 } from "lucide-react";
import type { Order } from "@/hooks/useOrders";
import { useOptionalStore } from "@/components/storefront/store-context";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const TrackOrder = () => {
  const currentStore = useOptionalStore();
  const storeName = currentStore?.name ?? "your store";
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().toUpperCase();
    const trimmedPhone = phone.trim();

    if (!trimmed || !trimmedPhone) return;

    setLoading(true);
    setOrder(null);
    setNotFound(false);

    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, items, subtotal, delivery_fee, total, payment_method, created_at")
      .eq("order_number", trimmed)
      .eq("customer_phone", trimmedPhone)
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      setNotFound(true);
      return;
    }

    setOrder(data as unknown as Order);
  };

  const currentStepIndex = order
    ? STATUS_STEPS.findIndex((step) => step.key === order.status)
    : -1;

  const isCancelled = order?.status === "cancelled";

  return (
    <Layout>
      <SEOHead
        title={`Track Your Order - ${storeName}`}
        description={`Enter your order number to see real-time status updates for your ${storeName} order.`}
        noindex
      />

      <section className="min-h-[70vh] py-16">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Track Your Order</h1>
            <p className="mt-2 text-muted-foreground">
              Enter your order number and phone number to see its current status.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mb-10 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Label htmlFor="order-number" className="sr-only">Order number</Label>
              <Input
                id="order-number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="TBD-YYYYMMDD-XXXXXX"
                className="h-11 font-mono uppercase"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="order-phone" className="sr-only">Phone number</Label>
              <Input
                id="order-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number used in the order"
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-11 gap-2 px-6">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Track
            </Button>
          </form>

          {notFound && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <XCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
              <p className="font-semibold text-foreground">Order not found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Double-check the order number and phone number from your confirmation message, then try again.
              </p>
            </div>
          )}

          {order && (
            <div className="space-y-6 rounded-xl border border-border bg-card p-6 premium-shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <p className="font-mono font-bold text-foreground">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Placed on</p>
                  <p className="text-sm text-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {isCancelled ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                  <XCircle className="mx-auto mb-1 h-7 w-7 text-destructive" />
                  <p className="font-semibold text-destructive">Order Cancelled</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Please contact us if you have any questions.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-5 h-[calc(100%-40px)] w-0.5 bg-border" />

                  <div className="space-y-6">
                    {STATUS_STEPS.map((step, index) => {
                      const Icon = step.icon;
                      const isDone = currentStepIndex >= index;
                      const isCurrent = currentStepIndex === index;

                      return (
                        <div key={step.key} className="relative flex items-start gap-4">
                          <div
                            className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isDone
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="pt-1.5">
                            <p className={`text-sm font-semibold ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                              {step.label}
                            </p>
                            {isCurrent && (
                              <p className="mt-0.5 text-xs text-primary">Current status</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-border" />

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
                <div className="space-y-2">
                  {(order.items ?? []).map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Size: {item.size} - Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">BDT {item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-secondary/40 p-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>BDT {order.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Delivery</span><span>BDT {order.delivery_fee}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold text-foreground">
                  <span>Total</span><span>BDT {order.total}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Payment: <span className="font-medium capitalize text-foreground">{order.payment_method.replace("_", " ")}</span>
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default TrackOrder;
