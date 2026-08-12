import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { ArrowLeft, Phone, Copy, CheckCircle2, Tag, X, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import { useCart } from "@/context/useCart";
import { useAuth } from "@/hooks/auth-context";
import { useCreateOrder } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { toast } from "sonner";
import { z } from "zod";
import { usePublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { DownloadAccessPanel } from "@/components/storefront/digital-downloads/DownloadAccessPanel";
import { getCartVariantDisplayLabel, isDigitalOnlyCart } from "@/lib/digital-cart";
import { getNormalizedDeliverySettings, getStorefrontPricing, type StorefrontDeliverySettings } from "@/lib/storefront-pricing";
import { resolveStorefrontOrderExperience } from "@/lib/cms/storefront-order-experience";
import { buildRecoveryCartSnapshot, readRecoveryConsentStatus } from "@/lib/cart-recovery/client";
import { buildCustomerAuthPath, getCurrentRelativePath, resolveAllowGuestCheckout } from "@/lib/storefront-customer-access";
import { clearBuyNowPayload, loadBuyNowPayload } from "@/lib/storefront-buy-now";

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(11, "Valid phone number required").max(14),
  address: z.string().trim().min(5, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(100),
  paymentMethod: z.enum(["bkash", "bkash_manual", "nagad", "cod"]),
  trxId: z.string().trim().max(50).optional(),
});

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
  const [searchParams] = useSearchParams();
  const { items, clearCart, couponCode, setCouponCode } = useCart();
  const { user } = useAuth();
  const { trackEvent, visitorId, sessionId } = useStorefrontAnalytics();
  const createOrder = useCreateOrder();
  const cartStoreIds = Array.from(new Set(items.map((item) => item.storeId).filter(Boolean)));
  const cartCheckoutStoreId = cartStoreIds.length === 1 ? cartStoreIds[0] as string : storeId;
  const buyNowMode = searchParams.get("buy_now") === "1";
  const buyNowPayload = useMemo(
    () => (buyNowMode && storeId ? loadBuyNowPayload(storeId) : null),
    [buyNowMode, storeId],
  );
  const buyNowStoreId = buyNowPayload?.items[0]?.storeId;
  const checkoutStoreId = buyNowMode
    ? (buyNowStoreId ?? storeId)
    : cartCheckoutStoreId;
  const hasMixedStoreItems = cartStoreIds.length > 1;
  const checkoutItems = buyNowMode
    ? (buyNowPayload?.items ?? []).filter((item) => (item.storeId ?? checkoutStoreId) === checkoutStoreId)
    : items.filter((item) => (item.storeId ?? checkoutStoreId) === checkoutStoreId);
  const checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const digitalOnlyCheckout = isDigitalOnlyCart(checkoutItems);
  const { data: paymentSettings } = usePublicPaymentSettings(checkoutStoreId);
  const { data: deliverySettingsData } = useSiteSettings<StorefrontDeliverySettings>("delivery_settings", checkoutStoreId);
  const preloadedStorefrontProfile =
    currentStore?.id === checkoutStoreId && typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore?.siteSettings?.storefront_profile
      ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
      : undefined;
  const { data: storefrontProfileData, isLoading: storefrontProfileLoading } = useSiteSettings<Record<string, unknown>>("storefront_profile", checkoutStoreId);
  const deliverySettings = getNormalizedDeliverySettings(deliverySettingsData);
  const allowGuestCheckout = resolveAllowGuestCheckout(storefrontProfileData ?? preloadedStorefrontProfile);
  const experience = resolveStorefrontOrderExperience(currentStore, checkoutItems);
  const LayoutWrapper = checkoutStoreId ? StorefrontLayout : Layout;
  const [copied, setCopied] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    paymentMethod: "cod" as "bkash" | "bkash_manual" | "nagad" | "cod",
    trxId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderRequestKey, setOrderRequestKey] = useState(createCheckoutRequestKey);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const checkoutTrackedRef = useRef("");

  useEffect(() => {
    if (buyNowMode && !storeId) {
      return;
    }

    if (buyNowMode && !buyNowPayload) {
      toast.error("That Buy Now session expired. Please start again from the product page.");
      navigate(storefrontPath("/cart", storeSlug), { replace: true });
      return;
    }

    if (checkoutItems.length === 0 && !isRedirecting) {
      navigate(storefrontPath("/cart", storeSlug));
    }
  }, [buyNowMode, buyNowPayload, checkoutItems.length, isRedirecting, navigate, storeId, storeSlug]);

  useEffect(() => {
    if (!checkoutStoreId || storefrontProfileLoading || allowGuestCheckout || user) {
      return;
    }

    setIsRedirecting(true);
    toast.info("Please sign in to continue this store's checkout.");
    navigate(buildCustomerAuthPath(getCurrentRelativePath(storefrontPath("/checkout", storeSlug)), storeSlug), { replace: true });
  }, [allowGuestCheckout, checkoutStoreId, navigate, storeSlug, storefrontProfileLoading, user]);

  useEffect(() => {
    if (!checkoutItems.length) return;
    const snapshot = checkoutItems.map((item) => `${item.productId}:${item.quantity}:${item.size}`).join("|");
    if (checkoutTrackedRef.current === snapshot) return;
    checkoutTrackedRef.current = snapshot;
    trackEvent({
      eventName: "begin_checkout",
      eventCategory: "commerce",
      quantity: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
      value: checkoutSubtotal,
      metadata: {
        itemCount: checkoutItems.length,
        productIds: checkoutItems.map((item) => item.productId),
      },
    });
  }, [checkoutItems, checkoutSubtotal, trackEvent]);

  useEffect(() => {
    if (!checkoutStoreId || checkoutItems.length === 0 || !visitorId || !sessionId) return;

    const consentStatus = readRecoveryConsentStatus(checkoutStoreId);
    const timer = window.setTimeout(() => {
      void fetch("/api/cart-recovery/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: checkoutStoreId,
          visitorId,
          sessionId,
          recoveryStage: "checkout",
          contactCaptureSource: "checkout",
          contactConsentStatus: consentStatus,
          cartSnapshot: buildRecoveryCartSnapshot(checkoutItems),
          cartValue: checkoutSubtotal,
          itemCount: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
          contact: {
            name: form.name,
            email: user?.email ?? "",
            phone: form.phone,
          },
          metadata: {
            city: form.city || null,
            digitalOnly: digitalOnlyCheckout,
            paymentMethod: form.paymentMethod,
            pagePath: typeof window !== "undefined" ? window.location.pathname : "/checkout",
          },
        }),
        keepalive: true,
      }).catch(() => undefined);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    checkoutItems,
    checkoutStoreId,
    checkoutSubtotal,
    digitalOnlyCheckout,
    form.city,
    form.name,
    form.paymentMethod,
    form.phone,
    sessionId,
    user?.email,
    visitorId,
  ]);

  // Auto-apply pre-filled coupon code at checkout using server-side RPC validation
  useEffect(() => {
    if (!couponCode || appliedCoupon || couponLoading || hasMixedStoreItems || !checkoutStoreId || checkoutSubtotal <= 0) {
      return;
    }

    setCouponInput(couponCode);

    const autoValidate = async () => {
      setCouponLoading(true);
      setCouponError("");

      const { data, error } = await supabase.rpc("validate_coupon" as any, {
        _code: couponCode.trim(),
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

    autoValidate();
  }, [couponCode, checkoutSubtotal, checkoutStoreId, appliedCoupon, couponLoading, hasMixedStoreItems]);

  if (!checkoutStoreId) {
    return (
      <Layout>
        <SEOHead title="Checkout" description="Complete your order." noindex />
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="max-w-lg rounded-lg border border-border bg-card p-8 text-center">
            <h1 className="mb-4 font-heading text-2xl font-bold text-foreground">Store checkout is unavailable</h1>
            <p className="mb-6 text-muted-foreground">
              We could not confirm which storefront this cart belongs to. Please return to the store and reopen checkout from there.
            </p>
            <button
              onClick={() => navigate(storefrontPath("/cart", storeSlug))}
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Back to Cart
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (checkoutItems.length === 0) {
    return null;
  }

  if (!allowGuestCheckout && !user) {
    return (
      <LayoutWrapper>
        <SEOHead title="Checkout" description={`Complete your order with ${storeName}.`} noindex />
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="max-w-lg rounded-lg border border-primary/20 bg-primary/5 p-8 text-center">
            <h1 className="mb-3 font-heading text-2xl font-bold text-foreground">Sign in required for checkout</h1>
            <p className="text-sm text-muted-foreground">
              This store only allows checkout for signed-in customers. We are taking you to login now and will return you here right after.
            </p>
            <Loader2 className="mx-auto mt-5 h-7 w-7 animate-spin text-primary" />
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.round((checkoutSubtotal * appliedCoupon.discount_value) / 100)
      : appliedCoupon.discount_value
    : 0;
  const pricing = getStorefrontPricing({
    subtotal: checkoutSubtotal,
    couponDiscount,
    deliverySettings,
    paymentSettings,
    paymentMethod: form.paymentMethod,
    location: "primary",
  });
  const deliveryFee = digitalOnlyCheckout ? 0 : pricing.deliveryFee;
  const grandTotal = digitalOnlyCheckout
    ? Math.max(0, checkoutSubtotal - couponDiscount - pricing.orderDiscountAmount - pricing.paymentDiscount)
    : pricing.grandTotal;

  const hasBkashGateway = !!paymentSettings?.bkash_gateway_enabled;
  const isMobilePayment = form.paymentMethod === "bkash" || form.paymentMethod === "bkash_manual" || form.paymentMethod === "nagad";
  const merchantNumber =
    (form.paymentMethod === "bkash" || form.paymentMethod === "bkash_manual")
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
    setCouponError("");
    setCouponLoading(true);

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
    setCouponCode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasMixedStoreItems && !buyNowMode) {
      toast.error("Please checkout one store at a time.");
      return;
    }
    const result = checkoutSchema.safeParse({
      ...form,
      address: digitalOnlyCheckout ? (form.address.trim() || "Digital delivery") : form.address,
      city: digitalOnlyCheckout ? (form.city.trim() || "Digital") : form.city,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const hasBkashGateway = !!paymentSettings?.bkash_gateway_enabled;
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
      if (pricing.paymentDiscount > 0 && pricing.paymentDiscountLabel) {
        notesParts.push(`${pricing.paymentDiscountLabel}: -BDT ${pricing.paymentDiscount}`);
      }
      if (digitalOnlyCheckout) {
        notesParts.push("Digital order: no physical shipping");
      }

      const shippingAddress = digitalOnlyCheckout ? (form.address.trim() || "Digital delivery") : form.address;
      const shippingCity = digitalOnlyCheckout ? (form.city.trim() || "Digital") : form.city;

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
        discount_amount: pricing.couponDiscount + pricing.orderDiscountAmount,
        coupon_code: appliedCoupon?.code ?? null,
        total: grandTotal,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: user?.email,
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
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

        if (buyNowMode) {
          clearBuyNowPayload(checkoutStoreId);
        } else {
          clearCart(checkoutStoreId);
        }
        window.location.href = data.bkashURL;
        return;
      }

      setOrderRequestKey(createCheckoutRequestKey());
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`storefront-purchase:${checkoutStoreId}`, JSON.stringify({
          orderId: order.id,
          orderNumber: order.order_number,
          value: order.total ?? grandTotal,
          currencyCode: currentStore?.currencyCode ?? "BDT",
          items: checkoutItems.map((item) => ({
            item_id: item.productId,
            item_name: item.name,
            quantity: item.quantity,
            price: item.price,
            item_variant: item.size,
          })),
        }));
      }

      if (isMobilePayment) {
        toast.success("Order placed!", { description: `Your ${form.paymentMethod === "bkash" ? "bKash" : "Nagad"} payment will be verified shortly.` });
      } else {
        toast.success("Order placed!", { description: "Cash on Delivery confirmed. We'll call you to confirm." });
      }
      setIsRedirecting(true);
      if (buyNowMode) {
        clearBuyNowPayload(checkoutStoreId);
      } else {
        clearCart(checkoutStoreId);
      }
      navigate(storefrontPath(`/order-success?order=${encodeURIComponent(order.order_number)}`, storeSlug));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to place order. Please try again.";
      toast.error(message);
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <LayoutWrapper>
      <SEOHead title="Checkout" description={`Complete your order with ${storeName}.`} noindex />
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {experience.labels.checkoutBackLabel}
        </button>

        <h1 className="mb-8 font-heading text-3xl font-bold text-foreground">{experience.labels.checkoutTitle}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Delivery Details */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">{experience.labels.detailsTitle}</h2>
            <div className="space-y-4">
              {[
                { key: "name", label: experience.labels.customerNameLabel, placeholder: "e.g. Hasan Mahmud" },
                { key: "phone", label: experience.labels.phoneLabel, placeholder: "01XXXXXXXXX" },
                ...(
                  digitalOnlyCheckout
                    ? []
                    : [
                        { key: "address", label: experience.labels.addressLabel, placeholder: "House, Road, Area" },
                        { key: "city", label: experience.labels.cityLabel, placeholder: "City or delivery area" },
                      ]
                ),
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

              {digitalOnlyCheckout ? (
                <DownloadAccessPanel compact />
              ) : null}
            </div>
          </div>

          {/* Order summary */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">{experience.labels.summaryTitle}</h2>
            <div className="space-y-2">
              {checkoutItems.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name} x {item.quantity} <span className="text-muted-foreground">({experience.labels.optionLabel}: {getCartVariantDisplayLabel(item.size)})</span>
                  </span>
                  <span className="text-muted-foreground">BDT {item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">{experience.labels.paymentTitle}</h2>
            <div className="space-y-3">
              {[
                ...(hasBkashGateway ? [{ 
                  value: "bkash", 
                  label: "bKash (Automated)", 
                  desc: "Pay instantly via bKash Account", 
                  enabled: paymentSettings?.bkash_enabled ?? false 
                }] : []),
                { 
                  value: "bkash_manual", 
                  label: "bKash (Manual / Send Money)", 
                  desc: "Send Money to our bKash number", 
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
                  {form.paymentMethod.startsWith("bkash") ? "bKash" : "Nagad"} number:
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
                  <li>Open your {form.paymentMethod.startsWith("bkash") ? "bKash" : "Nagad"} app</li>
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
                {form.paymentMethod.startsWith("bkash") ? "bKash" : "Nagad"} payment is currently unavailable. Please choose another method.
              </p>
            )}
          </div>

          {/* Coupon Code */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">{experience.labels.couponTitle}</h2>
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
              <span>{experience.labels.subtotalLabel}</span>
              <span>BDT {checkoutSubtotal}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>Coupon discount</span>
                <span>-BDT {couponDiscount}</span>
              </div>
            )}
              <div className="flex justify-between text-sm text-muted-foreground">
              <span>{experience.labels.deliveryLabel}</span>
              <span className={deliveryFee === 0 ? "text-primary" : ""}>
                {digitalOnlyCheckout ? experience.labels.includedFulfillmentLabel : deliveryFee === 0 ? experience.labels.freeDeliveryLabel : `BDT ${deliveryFee}`}
              </span>
            </div>
            {pricing.paymentDiscount > 0 && pricing.paymentDiscountLabel && (
              <div className="flex justify-between text-sm text-primary">
                <span>{pricing.paymentDiscountLabel}</span>
                <span>-BDT {pricing.paymentDiscount}</span>
              </div>
            )}
            {!digitalOnlyCheckout && deliveryFee > 0 && deliverySettings.enabled && pricing.amountToFreeDelivery > 0 && (
              <p className="text-xs text-muted-foreground">
                Add BDT {pricing.amountToFreeDelivery} more for free delivery
              </p>
            )}
            {!digitalOnlyCheckout && pricing.qualifiesForThresholdFreeDelivery && (
              <p className="text-xs text-primary">You qualify for free delivery.</p>
            )}
            {!digitalOnlyCheckout && pricing.qualifiesForPrepaidFreeDelivery && (
              <p className="text-xs text-primary">Prepaid checkout unlocked free delivery for this order.</p>
            )}
            <div className="border-t border-border pt-3">
              <div className="flex justify-between font-heading text-lg font-bold text-foreground">
                <span>{experience.labels.totalLabel}</span>
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
                ? `${experience.labels.placeOrderLabel} - BDT ${grandTotal}`
                : form.paymentMethod === "bkash" && hasBkashGateway
                  ? `Pay BDT ${grandTotal} with bKash`
                  : `Pay BDT ${grandTotal} with ${form.paymentMethod.startsWith("bkash") ? "bKash" : "Nagad"}`}
          </button>
        </form>
      </div>
    </LayoutWrapper>
  );
};

export default Checkout;

