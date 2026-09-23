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
import { getNormalizedDeliverySettings, getStorefrontPricing, resolveStorefrontDeliveryLocation, type StorefrontDeliverySettings } from "@/lib/storefront-pricing";
import { resolveStorefrontOrderExperience } from "@/lib/cms/storefront-order-experience";
import { buildRecoveryCartSnapshot, readRecoveryConsentStatus } from "@/lib/cart-recovery/client";
import { buildCustomerAuthPath, getCurrentRelativePath, resolveAllowGuestCheckout } from "@/lib/storefront-customer-access";
import { clearBuyNowPayload, loadBuyNowPayload } from "@/lib/storefront-buy-now";
import { initializeRedirectPayment } from "@/lib/payments/checkout-runtime";

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(11, "Valid phone number required").max(14),
  address: z.string().trim().min(5, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(100),
  paymentMethod: z.string().trim().min(1, "Payment method is required").max(64).regex(/^[a-z][a-z0-9_-]*$/, "Invalid payment method"),
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

function focusCheckoutField(field: string) {
  if (typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    const target = document.getElementById(`checkout-${field}`) as HTMLInputElement | null;
    target?.focus();
  });
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
  const gatewayProviders = useMemo(() => paymentSettings?.gateway_providers ?? [], [paymentSettings?.gateway_providers]);
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
    paymentMethod: "cod",
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
    const enabledPaymentMethods = [
      ...gatewayProviders.map((provider) => provider.payment_method),
      ...(paymentSettings?.bkash_enabled ? ["bkash_manual"] : []),
      ...(paymentSettings?.nagad_enabled ? ["nagad"] : []),
      ...(paymentSettings?.cod_enabled !== false ? ["cod"] : []),
    ];

    if (enabledPaymentMethods.length > 0 && !enabledPaymentMethods.includes(form.paymentMethod)) {
      setForm((previous) => ({ ...previous, paymentMethod: enabledPaymentMethods[0] }));
    }
  }, [form.paymentMethod, gatewayProviders, paymentSettings?.bkash_enabled, paymentSettings?.cod_enabled, paymentSettings?.nagad_enabled]);

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
  const deliveryZone = digitalOnlyCheckout
    ? "secondary" as const
    : resolveStorefrontDeliveryLocation(deliverySettings, form.city);
  const pricing = getStorefrontPricing({
    subtotal: checkoutSubtotal,
    couponDiscount,
    deliverySettings: digitalOnlyCheckout
      ? { ...deliverySettings, enabled: false }
      : deliverySettings,
    paymentSettings,
    paymentMethod: form.paymentMethod,
    location: deliveryZone,
  });
  const deliveryFee = pricing.deliveryFee;
  const grandTotal = pricing.grandTotal;

  const selectedGateway = gatewayProviders.find((provider) => provider.payment_method === form.paymentMethod) ?? null;
  const isManualMobilePayment = form.paymentMethod === "bkash_manual" || form.paymentMethod === "nagad";
  const manualPaymentLabel = form.paymentMethod === "bkash_manual" ? "bKash" : form.paymentMethod === "nagad" ? "Nagad" : "";
  const merchantNumber =
    form.paymentMethod === "bkash_manual"
      ? paymentSettings?.bkash_number
      : form.paymentMethod === "nagad"
        ? paymentSettings?.nagad_number
        : "";

  const paymentOptions = [
    ...gatewayProviders.map((provider) => ({
      value: provider.payment_method,
      label: provider.label,
      desc: provider.description || `Pay securely with ${provider.label}`,
      enabled: true,
    })),
    {
      value: "bkash_manual",
      label: "bKash (Manual / Send Money)",
      desc: "Send Money to our bKash number",
      enabled: paymentSettings?.bkash_enabled ?? false,
    },
    {
      value: "nagad",
      label: "Nagad",
      desc: "Send Money to our Nagad number",
      enabled: paymentSettings?.nagad_enabled ?? false,
    },
    {
      value: "cod",
      label: "Cash on Delivery",
      desc: "Pay when you receive",
      enabled: paymentSettings?.cod_enabled ?? true,
    },
  ].filter((method) => method.enabled);

  const copyNumber = () => {
    if (merchantNumber) {
      navigator.clipboard.writeText(merchantNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

    if (!paymentOptions.some((method) => method.value === form.paymentMethod)) {
      toast.error("Please choose an available payment method.");
      return;
    }

    if (isManualMobilePayment && !merchantNumber) {
      toast.error(`${manualPaymentLabel} payment is currently unavailable. Please choose another method.`);
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
      const firstInvalidField = result.error.errors[0]?.path[0];
      if (typeof firstInvalidField === "string") focusCheckoutField(firstInvalidField);
      return;
    }

    if (isManualMobilePayment && !form.trxId.trim()) {
      setErrors((prev) => ({ ...prev, trxId: "Transaction ID is required" }));
      focusCheckoutField("trxId");
      return;
    }

    setErrors({});

    try {
      const notesParts: string[] = [];

      if (isManualMobilePayment) {
        notesParts.push(`Payment: ${manualPaymentLabel} (manual reference submitted)`);
      } else if (selectedGateway) {
        notesParts.push(`Payment: ${selectedGateway.label} (Automated)`);
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
          optionIds: item.optionIds ?? [],
          fulfillmentType: item.fulfillmentType,
          quantity: item.quantity,
        })),
        subtotal: checkoutSubtotal,
        delivery_fee: deliveryFee,
        delivery_zone: deliveryZone,
        discount_amount: Math.max(0, checkoutSubtotal + deliveryFee - grandTotal),
        coupon_code: appliedCoupon?.code ?? null,
        total: grandTotal,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: user?.email,
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
        payment_method: form.paymentMethod,
        manual_payment_reference: isManualMobilePayment ? form.trxId.trim() : null,
        notes: notesParts.length ? notesParts.join(" | ") : undefined,
      });

      if (selectedGateway?.checkout_mode === "redirect") {
        setIsRedirecting(true);
        toast.info(`Initializing ${selectedGateway.label} payment...`);

        try {
          const redirect = await initializeRedirectPayment(
            {
              invokeFunction: async (functionName, body) => {
                const { data, error } = await supabase.functions.invoke(functionName, { body });
                return {
                  data: data && typeof data === "object" ? data as Record<string, unknown> : null,
                  error: error ? { message: error.message } : null,
                };
              },
            },
            {
              providerId: selectedGateway.id,
              storeId: checkoutStoreId,
              orderNumber: order.order_number,
              amount: order.total ?? grandTotal,
            },
          );

          if (buyNowMode) {
            clearBuyNowPayload(checkoutStoreId);
          } else {
            clearCart(checkoutStoreId);
          }
          window.location.href = redirect.redirectUrl;
          return;
        } catch (gatewayError) {
          setIsRedirecting(false);
          const message = gatewayError instanceof Error
            ? gatewayError.message
            : `Failed to initialize ${selectedGateway.label} payment.`;
          toast.error(message);
          return;
        }
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

      if (isManualMobilePayment) {
        toast.success("Order placed!", { description: `Your ${manualPaymentLabel} payment will be verified shortly.` });
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

  const isSubmitting = createOrder.isPending || isRedirecting;
  const isManualPaymentUnavailable = isManualMobilePayment && !merchantNumber;
  const submitLabel = isSubmitting
    ? (isRedirecting ? `Redirecting to ${selectedGateway?.label ?? "payment provider"}...` : "Placing Order...")
    : form.paymentMethod === "cod" || isManualMobilePayment
      ? `${experience.labels.placeOrderLabel} - BDT ${grandTotal}`
      : selectedGateway
        ? `Pay BDT ${grandTotal} with ${selectedGateway.label}`
        : experience.labels.placeOrderLabel;

  const detailFields = [
    { key: "name", label: experience.labels.customerNameLabel, placeholder: "e.g. Hasan Mahmud", type: "text", autoComplete: "name", inputMode: undefined },
    { key: "phone", label: experience.labels.phoneLabel, placeholder: "01XXXXXXXXX", type: "tel", autoComplete: "tel", inputMode: "tel" as const },
    ...(
      digitalOnlyCheckout
        ? []
        : [
            { key: "address", label: experience.labels.addressLabel, placeholder: "House, Road, Area", type: "text", autoComplete: "street-address", inputMode: undefined },
            { key: "city", label: experience.labels.cityLabel, placeholder: "City or delivery area", type: "text", autoComplete: "address-level2", inputMode: undefined },
          ]
    ),
  ];

  return (
    <LayoutWrapper>
      <SEOHead title="Checkout" description={`Complete your order with ${storeName}.`} noindex />
      <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex min-h-11 items-center gap-2 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" /> {experience.labels.checkoutBackLabel}
        </button>

        <div className="mb-7">
          <h1 className="font-heading text-3xl font-bold text-foreground">{experience.labels.checkoutTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add your details, choose how to pay, then review the total before placing the order.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="checkout-details-title">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">1</span>
              <div>
                <h2 id="checkout-details-title" className="font-heading text-lg font-semibold text-foreground">{experience.labels.detailsTitle}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {digitalOnlyCheckout ? "Tell us who should receive access to this order." : "Tell us who is ordering and where it should be delivered."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {detailFields.map(({ key, label, placeholder, type, autoComplete, inputMode }) => {
                const errorId = `checkout-${key}-error`;
                return (
                  <div key={key}>
                    <label htmlFor={`checkout-${key}`} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
                    <input
                      id={`checkout-${key}`}
                      type={type}
                      inputMode={inputMode}
                      autoComplete={autoComplete}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => update(key, e.target.value)}
                      placeholder={placeholder}
                      aria-invalid={Boolean(errors[key])}
                      aria-describedby={errors[key] ? errorId : undefined}
                      className="min-h-11 w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {errors[key] && <p id={errorId} role="alert" className="mt-1.5 text-xs text-destructive">{errors[key]}</p>}
                  </div>
                );
              })}

              {!digitalOnlyCheckout && deliverySettings.enabled ? (
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">
                      {deliveryZone === "primary"
                        ? (deliverySettings.primary_zone_label?.trim() || "Primary delivery zone")
                        : (deliverySettings.secondary_zone_label?.trim() || "Extended delivery zone")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      BDT {deliveryZone === "primary" ? deliverySettings.delivery_fee : deliverySettings.delivery_fee_outside}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Delivery zone is determined from your city and recalculated securely when the order is placed.</p>
                </div>
              ) : null}

              {digitalOnlyCheckout ? <DownloadAccessPanel compact /> : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="checkout-payment-title">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">2</span>
              <div>
                <h2 id="checkout-payment-title" className="font-heading text-lg font-semibold text-foreground">{experience.labels.paymentTitle}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose one available payment method for this order.</p>
              </div>
            </div>

            <div className="space-y-3">
              {paymentOptions.map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex min-h-[64px] cursor-pointer items-center gap-4 rounded-lg border p-4 transition-all ${
                    form.paymentMethod === value
                      ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/40 hover:bg-muted/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={value}
                    checked={form.paymentMethod === value}
                    onChange={(e) => update("paymentMethod", e.target.value)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {paymentOptions.length === 0 && (
              <p className="mt-3 text-xs text-destructive">
                No payment method is currently available for this store. Please contact the merchant.
              </p>
            )}

            {isManualPaymentUnavailable && (
              <p className="mt-3 text-xs text-destructive">
                {manualPaymentLabel} payment is currently unavailable because the merchant payment number is missing. Please choose another method.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-primary/25 bg-card p-5 shadow-sm sm:p-6" aria-labelledby="checkout-review-title">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">3</span>
              <div>
                <h2 id="checkout-review-title" className="font-heading text-lg font-semibold text-foreground">{experience.labels.summaryTitle}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {isManualMobilePayment
                    ? `Review your items and final amount, then complete ${manualPaymentLabel} payment before placing the order.`
                    : "Review your items, discounts, delivery and final amount."}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {checkoutItems.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0 text-foreground">
                    {item.name} x {item.quantity}
                    <span className="ml-1 text-muted-foreground">({experience.labels.optionLabel}: {getCartVariantDisplayLabel(item.size)})</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">BDT {item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="my-5 border-t border-border" />

            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Tag className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{experience.labels.couponTitle}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-foreground">{appliedCoupon.code}</span>
                        <span className="text-sm text-primary">
                          -{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `BDT ${appliedCoupon.discount_value}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={removeCoupon} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground" aria-label="Remove coupon">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <details className="rounded-lg border border-border bg-muted/15 p-3" open={Boolean(couponError || couponInput)}>
                  <summary className="cursor-pointer text-sm font-medium text-foreground">Have a coupon?</summary>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      placeholder="Enter coupon code"
                      className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-4 py-3 font-mono text-sm uppercase text-foreground placeholder:text-muted-foreground placeholder:normal-case focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="flex min-h-11 items-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </button>
                  </div>
                  {couponError && <p role="alert" className="mt-2 text-xs text-destructive">{couponError}</p>}
                </details>
              )}
            </div>

            <div className="my-5 border-t border-border" />

            <div className="space-y-3">
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
                <p className="text-xs text-muted-foreground">Add BDT {pricing.amountToFreeDelivery} more for free delivery</p>
              )}
              {!digitalOnlyCheckout && pricing.qualifiesForThresholdFreeDelivery && (
                <p className="text-xs text-primary">You qualify for free delivery.</p>
              )}
              {!digitalOnlyCheckout && pricing.qualifiesForPrepaidFreeDelivery && (
                <p className="text-xs text-primary">Prepaid checkout unlocked free delivery for this order.</p>
              )}
              <div className="border-t border-border pt-4">
                <div className="flex items-end justify-between gap-4 font-heading text-lg font-bold text-foreground">
                  <span>{experience.labels.totalLabel}</span>
                  <span className="text-xl">BDT {grandTotal}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{checkoutItems.length} item(s) x {checkoutItems.reduce((a, i) => a + i.quantity, 0)} unit(s)</p>
              </div>
            </div>

            {isManualMobilePayment && merchantNumber && (
              <div className="mt-5 space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Complete {manualPaymentLabel} payment</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">The amount below already includes any coupon, delivery and payment discount shown above.</p>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Send <span className="font-bold text-primary">BDT {grandTotal}</span> to this {manualPaymentLabel} number:
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-mono text-lg font-bold text-foreground">{merchantNumber}</span>
                  <button
                    type="button"
                    onClick={copyNumber}
                    className="ml-auto flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <ol className="list-inside list-decimal space-y-1.5 text-xs leading-5 text-muted-foreground">
                  <li>Open your {manualPaymentLabel} app</li>
                  <li>Select &quot;Send Money&quot;</li>
                  <li>Enter the number above and send BDT {grandTotal}</li>
                  <li>Enter the Transaction ID (TrxID) below</li>
                </ol>
                <div>
                  <label htmlFor="checkout-trxId" className="mb-1.5 block text-sm font-medium text-foreground">Transaction ID (TrxID)</label>
                  <input
                    id="checkout-trxId"
                    type="text"
                    autoComplete="off"
                    value={form.trxId}
                    onChange={(e) => update("trxId", e.target.value)}
                    placeholder="e.g. ABC1234XYZ"
                    aria-invalid={Boolean(errors.trxId)}
                    aria-describedby={errors.trxId ? "checkout-trxId-error" : undefined}
                    className="min-h-11 w-full rounded-md border border-border bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {errors.trxId && <p id="checkout-trxId-error" role="alert" className="mt-1.5 text-xs text-destructive">{errors.trxId}</p>}
                </div>
              </div>
            )}

            <button
              type="submit"
              data-testid="checkout-submit"
              disabled={isSubmitting || paymentOptions.length === 0 || isManualPaymentUnavailable}
              aria-busy={isSubmitting}
              className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-4 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </button>
          </section>
        </form>
      </div>
    </LayoutWrapper>
  );
};

export default Checkout;
