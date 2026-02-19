import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Phone, Copy, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useCreateOrder } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(11, "Valid phone number required").max(14),
  address: z.string().trim().min(5, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(100),
  paymentMethod: z.enum(["bkash", "nagad", "cod"]),
  trxId: z.string().trim().max(50).optional(),
});

interface PaymentSettings {
  bkash_number: string;
  nagad_number: string;
  bkash_enabled: boolean;
  nagad_enabled: boolean;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    paymentMethod: "cod" as "bkash" | "nagad" | "cod",
    trxId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "payment_settings")
      .single()
      .then(({ data }) => {
        if (data?.value) setPaymentSettings(data.value as unknown as PaymentSettings);
      });
  }, []);

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  const isMobilePayment = form.paymentMethod === "bkash" || form.paymentMethod === "nagad";
  const merchantNumber =
    form.paymentMethod === "bkash"
      ? paymentSettings?.bkash_number
      : form.paymentMethod === "nagad"
        ? paymentSettings?.nagad_number
        : "";

  const copyNumber = () => {
    if (merchantNumber) {
      navigator.clipboard.writeText(merchantNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (isMobilePayment && !form.trxId.trim()) {
      setErrors((prev) => ({ ...prev, trxId: "Transaction ID is required" }));
      return;
    }

    setErrors({});

    try {
      const notes = isMobilePayment
        ? `Payment: ${form.paymentMethod.toUpperCase()} | TrxID: ${form.trxId.trim()}`
        : null;

      const order = await createOrder.mutateAsync({
        user_id: user?.id || null,
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          size: item.size,
          quantity: item.quantity,
        })),
        subtotal: totalPrice,
        total: totalPrice,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: user?.email,
        shipping_address: form.address,
        shipping_city: form.city,
        payment_method: form.paymentMethod,
        notes: notes || undefined,
      });

      if (isMobilePayment) {
        toast.success("Order placed!", { description: `Your ${form.paymentMethod === "bkash" ? "bKash" : "Nagad"} payment will be verified shortly.` });
      } else {
        toast.success("Order placed!", { description: "Cash on Delivery confirmed. We'll call you to confirm." });
      }
      clearCart();
      navigate("/order-success", { state: { orderNumber: order.order_number } });
    } catch {
      toast.error("Failed to place order. Please try again.");
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </button>

        <h1 className="mb-8 font-heading text-3xl font-bold text-foreground">Checkout</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Delivery Details</h2>
            <div className="space-y-4">
              {[
                { key: "name", label: "Full Name", placeholder: "আপনার নাম" },
                { key: "phone", label: "Phone Number", placeholder: "01XXXXXXXXX" },
                { key: "address", label: "Delivery Address", placeholder: "House, Road, Area" },
                { key: "city", label: "City", placeholder: "Dhaka" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
                  <input
                    type="text"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Order Summary</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name} × {item.quantity} <span className="text-muted-foreground">({item.size})</span>
                  </span>
                  <span className="text-muted-foreground">৳{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Payment Method</h2>
            <div className="space-y-3">
              {[
                { value: "bkash", label: "bKash", desc: "Send Money to our bKash number", enabled: paymentSettings?.bkash_enabled ?? false },
                { value: "nagad", label: "Nagad", desc: "Send Money to our Nagad number", enabled: paymentSettings?.nagad_enabled ?? false },
                { value: "cod", label: "Cash on Delivery", desc: "Pay when you receive", enabled: true },
              ]
                .filter((m) => m.enabled)
                .map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-4 rounded-md border p-4 transition-all ${
                      form.paymentMethod === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={value}
                      checked={form.paymentMethod === value}
                      onChange={(e) => update("paymentMethod", e.target.value)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
            </div>

            {/* bKash / Nagad send-money instructions */}
            {isMobilePayment && merchantNumber && (
              <div className="mt-4 space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">
                  Send <span className="font-bold text-primary">৳{totalPrice}</span> to this{" "}
                  {form.paymentMethod === "bkash" ? "bKash" : "Nagad"} number:
                </p>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-mono text-lg font-bold text-foreground">{merchantNumber}</span>
                  <button
                    type="button"
                    onClick={copyNumber}
                    className="ml-auto flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                  <li>Open your {form.paymentMethod === "bkash" ? "bKash" : "Nagad"} app</li>
                  <li>Select &quot;Send Money&quot;</li>
                  <li>Enter the number above and send ৳{totalPrice}</li>
                  <li>Enter the Transaction ID (TrxID) below</li>
                </ol>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Transaction ID (TrxID)</label>
                  <input
                    type="text"
                    value={form.trxId}
                    onChange={(e) => update("trxId", e.target.value)}
                    placeholder="e.g. ABC1234XYZ"
                    className="w-full rounded-md border border-border bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {errors.trxId && <p className="mt-1 text-xs text-destructive">{errors.trxId}</p>}
                </div>
              </div>
            )}

            {isMobilePayment && !merchantNumber && (
              <p className="mt-3 text-xs text-destructive">
                {form.paymentMethod === "bkash" ? "bKash" : "Nagad"} payment is currently unavailable. Please choose another method.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex justify-between font-heading text-lg font-bold text-foreground">
              <span>Total</span>
              <span>৳{totalPrice}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{items.length} item(s) • Free delivery</p>
          </div>

          <button
            type="submit"
            disabled={createOrder.isPending}
            className="w-full rounded-md bg-primary py-4 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow disabled:opacity-50"
          >
            {createOrder.isPending
              ? "Placing Order..."
              : form.paymentMethod === "cod"
                ? "Place Order"
                : `Pay ৳${totalPrice} with ${form.paymentMethod === "bkash" ? "bKash" : "Nagad"}`}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;
