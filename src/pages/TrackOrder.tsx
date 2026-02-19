import { useState } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Package, Search, CheckCircle, Clock, Truck, XCircle, Loader2 } from "lucide-react";
import type { Order } from "@/hooks/useOrders";

const STATUS_STEPS = [
  { key: "pending",    label: "Order Placed",  icon: Clock,        color: "text-yellow-500" },
  { key: "processing", label: "Processing",    icon: Package,      color: "text-blue-500"  },
  { key: "shipped",    label: "Shipped",        icon: Truck,        color: "text-purple-500"},
  { key: "delivered",  label: "Delivered",      icon: CheckCircle,  color: "text-green-500" },
];

const STATUS_LABEL: Record<string, string> = {
  pending:    "Order Placed",
  processing: "Processing",
  shipped:    "Shipped",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
};

const TrackOrder = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setOrder(null);
    setNotFound(false);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", trimmed)
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      setNotFound(true);
    } else {
      setOrder(data as unknown as Order);
    }
  };

  const currentStepIndex = order
    ? STATUS_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  const isCancelled = order?.status === "cancelled";

  return (
    <Layout>
      <SEOHead
        title="Track Your Order — ThreadBD"
        description="Enter your order number to see real-time status updates for your ThreadBD order."
        noindex
      />

      <section className="min-h-[70vh] py-16">
        <div className="container mx-auto max-w-2xl px-4">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Track Your Order</h1>
            <p className="mt-2 text-muted-foreground">
              Enter your order number (e.g. <span className="font-mono text-foreground">TBD-20240101-ABC123</span>) to see its current status.
            </p>
          </div>

          {/* Search form */}
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
            <Button type="submit" disabled={loading} className="h-11 gap-2 px-6">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Track
            </Button>
          </form>

          {/* Not found */}
          {notFound && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <XCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
              <p className="font-semibold text-foreground">Order not found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Double-check the order number from your confirmation message and try again.
              </p>
            </div>
          )}

          {/* Order found */}
          {order && (
            <div className="space-y-6 rounded-xl border border-border bg-card p-6 premium-shadow">
              {/* Order meta */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <p className="font-mono font-bold text-foreground">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Placed on</p>
                  <p className="text-sm text-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Status tracker */}
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
                  {/* Connecting line */}
                  <div className="absolute left-5 top-5 h-[calc(100%-40px)] w-0.5 bg-border" />

                  <div className="space-y-6">
                    {STATUS_STEPS.map((step, idx) => {
                      const Icon = step.icon;
                      const isDone = currentStepIndex >= idx;
                      const isCurrent = currentStepIndex === idx;
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

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Customer & shipping */}
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                  <p className="text-foreground">{order.customer_name}</p>
                  <p className="text-muted-foreground">{order.customer_phone}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping To</p>
                  <p className="text-foreground">{order.shipping_address}</p>
                  <p className="text-muted-foreground">{order.shipping_city}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
                <div className="space-y-2">
                  {(order.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Size: {item.size} · Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">৳{item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-lg bg-secondary/40 p-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>৳{order.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Delivery</span><span>৳{order.delivery_fee}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold text-foreground">
                  <span>Total</span><span>৳{order.total}</span>
                </div>
              </div>

              {/* Payment */}
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
