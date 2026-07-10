import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { ArrowLeft, Phone, Copy, CheckCircle2, Tag, X, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import { useCart } from "@/context/useCart";
import { useAuth } from "@/hooks/auth-context";
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
  bkash_app_key?: string;
  bkash_username?: string;
  bkash_password?: string;
  bkash_app_secret?: string;
  prepaid_badge_text?: string;
}

interface DeliverySettings {
  enabled: boolean;
  free_threshold: number;
  delivery_fee: number;
}

interface CouponResult {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
}

interface CheckoutProps {
  explicitStoreId?: string;
  explicitStoreSlug?: string;
}

function createCheckoutRequestKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const Checkout = ({ explicitStoreId, explicitStoreSlug }: CheckoutProps = {}) => {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const storeSlug = explicitStoreSlug ?? currentStore?.slug;
  const storeName = currentStore?.name ?? "this store";

  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const cartStoreIds = Array.from(new Set(items.map((item) => item.storeId).filter(Boolean)));
  const checkoutStoreId = cartStoreIds.length === 1 ? cartStoreIds[0] as string : storeId;
  const hasMixedStoreItems = cartStoreIds.length > 1;
  const checkoutItems = items.filter((item) => (item.storeId ?? checkoutStoreId) === checkoutStoreId);
  const checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({ enabled: true, free_threshold: 2000, delivery_fee: 80 });
  const [copied, setCopied] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    paymentMethod: "cod" as "bkash" | "nagad" | "cod",
    trxId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderRequestKey, setOrderRequestKey] = useState(createCheckoutRequestKey);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (!checkoutStoreId) {
      return;
    }

    (supabase as any)
      .from("site_settings")
      .select("key, value")
      .eq("store_id", checkoutStoreId)
      .in("key", ["payment_settings", "delivery_settings"])
      .then(({ data }) => {
        data?.forEach((row) => {
          if (row.key === "payment_settings") setPaymentSettings(row.value as unknown as PaymentSettings);
          if (row.key === "delivery_settings") setDeliverySettings(row.value as unknown as DeliverySettings);
        });
      });
  }, [checkoutStoreId]);

  useEffect(() => {
    if (checkoutItems.length === 0) {
      navigate(storefrontPath("/cart", storeSlug));
    }
  }, [checkoutItems.length, navigate, storeSlug]);

  if (!checkoutStoreId) {
    return null;
  }

  if (checkoutItems.length === 0) {
    return null;
  }

  // Delivery fee calculation
  const deliveryFee =
    deliverySettings.enabled && checkoutSubtotal < deliverySettings.free_threshold
      ? deliverySettings.delivery_fee
      : 0;

  // Coupon discount
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.round((checkoutSubtotal * appliedCoupon.discount_value) / 100)
      : appliedCoupon.discount_value
    : 0;

  const grandTotal = checkoutSubtotal - couponDiscount + deliveryFee;

  const hasBkashGateway = !!(paymentSettings?.bkash_app_key && paymentSettings?.bkash_username);
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

  // Stores the coupon snapshot at validation time; usage is claimed after order creation.
  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    if (hasMixedStoreItems) {
      setCouponError("Please checkout one store at a time.");
      return;
    }
    // Use the atomic DB function that validates + increments uses_count in one transaction
    setCouponError("");

    // Use the atomic DB function ÃŽâ€œÃƒâ€¡ÃƒÂ¶ validates + increments uses_count in one transaction
    const { data, error } = await supabase.rpc("validate_coupon" as any, {
      _code: couponInput.trim(),
      _order_total: checkoutSubtotal,
      _store_id: checkoutStoreId,
    });

    setCouponLoading(false);

    if (error || !data) {
      setCouponError("Invalid or expired coupon code.");
      return;
    }

    const result = data as unknown as { error?: string } & CouponResult;

    if (result.error) {
      setCouponError(result.error);
      return;
    }

    setAppliedCoupon(result as CouponResult);
    toast.success(`Coupon "${result.code}" applied!`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasMixedStoreItems) {
      toast.error("Please checkout one store at a time.");
      return;
    }
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const hasBkashGateway = !!(paymentSettings?.bkash_app_key && paymentSettings?.bkash_username);
    const requiresTrxId = isMobilePayment && !(form.paymentMethod === "bkash" && hasBkashGateway);
    if (requiresTrxId && !form.trxId.trim()) {
      setErrors((prev) => ({ ...prev, trxId: "Transaction ID is required" }));
      return;
    }

    setErrors({});

    try {
      const notesParts: string[] = [];
      const isBkashGateway = form.paymentMethod === "bkash" && hasBkashGateway;

      if (isMobilePayment && !isBkashGateway) {
        notesParts.push(`Payment: ${form.paymentMethod.toUpperCase()} | TrxID: ${form.trxId.trim()}`);
      } else if (isBkashGateway) {
        notesParts.push(`Payment: bKash PGW (Automated)`);
      }
      
      if (appliedCoupon) notesParts.push(`Coupon: ${appliedCoupon.code} (-BDT ${couponDiscount})`);

      const order = await createOrder.mutateAsync({
        idempotencyKey: orderRequestKey,
        store_id: checkoutStoreId,
        user_id: user?.id || null,
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          size: item.size,
          quantity: item.quantity,
        })),
        subtotal: checkoutSubtotal,
        delivery_fee: deliveryFee,
        discount_amount: couponDiscount,
        coupon_code: appliedCoupon?.code ?? null,
        total: grandTotal,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: user?.email,
        shipping_address: form.address,
        shipping_city: form.city,
        payment_method: form.paymentMethod,
        notes: notesParts.length ? notesParts.join(" | ") : undefined,
      });

      if (isBkashGateway) {
        setIsRedirecting(true);
        toast.info("Initializing bKash payment...");

        const { data, error } = await supabase.functions.invoke("bkash-payment", {
          body: {
            action: "create",
            order_id: order.order_number,
            amount: order.total ?? grandTotal,
            store_id: checkoutStoreId,
          },
        });

        if (error || !data?.success || !data?.bkashURL) {
          setIsRedirecting(false);
          toast.error(data?.error || error?.message || "Failed to initialize bKash payment. Please choose manual pay or COD.");
          return;
        }

        clearCart(checkoutStoreId);
        window.location.href = data.bkashURL;
        return;
      }

      setOrderRequestKey(createCheckoutRequestKey());

      if (isMobilePayment) {
        toast.success("Order placed!", { description: `Your ${form.paymentMethod === "bkash" ? "bKash" : "Nagad"} payment will be verified shortly.` });
      } else {
        toast.success("Order placed!", { description: "Cash on Delivery confirmed. We'll call you to confirm." });
      }
      clearCart(checkoutStoreId);
      navigate(storefrontPath(`/order-success?order=${encodeURIComponent(order.order_number)}`, storeSlug));
    } catch {
      toast.error("Failed to place order. Please try again.");
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const LayoutWrapper = explicitStoreId ? StorefrontLayout : Layout;

  return (
    <LayoutWrapper>
      <SEOHead title="Checkout" description={`Complete your order with ${storeName}.`} noindex />
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </button>

        <h1 className="mb-8 font-heading text-3xl font-bold text-foreground">Checkout</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Delivery Details */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Delivery Details</h2>
            <div className="space-y-4">
              {[
                { key: "name", label: "Full Name", placeholder: "e.g. Hasan Mahmud" },
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
              {checkoutItems.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name} x {item.quantity} <span className="text-muted-foreground">({item.size})</span>
                  </span>
                  <span className="text-muted-foreground">BDT {item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Payment Method</h2>
            <div className="space-y-3">
              {[
                { 
                  value: "bkash", 
                  label: "bKash", 
                  desc: hasBkashGateway ? "Pay instantly via bKash Account" : "Send Money to our bKash number", 
                  enabled: paymentSettings?.bkash_enabled ?? false 
                },
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

            {isMobilePayment && merchantNumber && !(form.paymentMethod === "bkash" && hasBkashGateway) && (
              <div className="mt-4 space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">
                  Send <span className="font-bold text-primary">BDT {grandTotal}</span> to this{" "}
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
                  <li>Enter the number above and send BDT {grandTotal}</li>
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

            {isMobilePayment && !merchantNumber && !(form.paymentMethod === "bkash" && hasBkashGateway) && (
              <p className="mt-3 text-xs text-destructive">
                {form.paymentMethod === "bkash" ? "bKash" : "Nagad"} payment is currently unavailable. Please choose another method.
              </p>
            )}
          </div>

          {/* Coupon Code */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Discount Code</h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="font-mono font-semibold text-foreground">{appliedCoupon.code}</span>
                  <span className="text-sm text-primary">
                    -{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `BDT ${appliedCoupon.discount_value}`}
                  </span>
                </div>
                <button type="button" onClick={removeCoupon} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                  placeholder="Enter coupon code"
                  className="flex-1 rounded-md border border-border bg-background px-4 py-3 font-mono text-sm uppercase text-foreground placeholder:text-muted-foreground placeholder:normal-case focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="flex items-center gap-2 rounded-md bg-secondary px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50"
                >
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className="mt-2 text-xs text-destructive">{couponError}</p>}
          </div>

          {/* Order Total */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>BDT {checkoutSubtotal}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>Coupon discount</span>
                <span>-BDT {couponDiscount}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Delivery</span>
              <span className={deliveryFee === 0 ? "text-primary" : ""}>
                {deliveryFee === 0 ? "Free" : `BDT ${deliveryFee}`}
              </span>
            </div>
            {deliveryFee === 0 && deliverySettings.enabled && checkoutSubtotal < deliverySettings.free_threshold && (
              <p className="text-xs text-muted-foreground">
                Add BDT {deliverySettings.free_threshold - checkoutSubtotal} more for free delivery
              </p>
            )}
            <div className="border-t border-border pt-3">
              <div className="flex justify-between font-heading text-lg font-bold text-foreground">
                <span>Total</span>
                <span>BDT {grandTotal}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{checkoutItems.length} item(s) x {checkoutItems.reduce((a, i) => a + i.quantity, 0)} unit(s)</p>
          </div>

          <button
            type="submit"
            disabled={createOrder.isPending || isRedirecting}
            className="w-full rounded-md bg-primary py-4 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow disabled:opacity-50"
          >
            {createOrder.isPending || isRedirecting
              ? (isRedirecting ? "Redirecting to bKash..." : "Placing Order...")
              : form.paymentMethod === "cod"
                ? `Place Order - BDT ${grandTotal}`
                : form.paymentMethod === "bkash" && hasBkashGateway
                  ? `Pay BDT ${grandTotal} with bKash`
                  : `Pay BDT ${grandTotal} with ${form.paymentMethod === "bkash" ? "bKash" : "Nagad"}`}
          </button>
        </form>
      </div>
    </LayoutWrapper>
  );
};

export default Checkout;

