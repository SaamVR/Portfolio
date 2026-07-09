import { useOptionalStore } from "@/components/storefront/store-context";
import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, Phone, Copy, ArrowLeft } from "lucide-react";
import { useCart } from "@/context/useCart";
import { useCreateOrder } from "@/hooks/useOrders";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { defaultStore } from "@/lib/cms/default-store";

interface GuestCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function createCheckoutRequestKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function GuestCheckoutModal({ open, onOpenChange }: GuestCheckoutModalProps) {
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id ?? "00000000-0000-4000-8000-000000000001";

  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const createOrder = useCreateOrder();
  const cartStoreIds = Array.from(new Set(items.map((item) => item.storeId).filter(Boolean)));
  const checkoutStoreId = cartStoreIds.length === 1 ? cartStoreIds[0] as string : storeId;
  const hasMixedStoreItems = cartStoreIds.length > 1;
  const checkoutItems = items.filter((item) => (item.storeId ?? checkoutStoreId) === checkoutStoreId);
  const checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { data: paymentSettings } = useSiteSettings("payment_settings", checkoutStoreId);
  const { data: deliverySettingsData } = useSiteSettings("delivery_settings", checkoutStoreId);
  const deliverySettings = deliverySettingsData as any;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    note: ""
  });
  const [orderRequestKey, setOrderRequestKey] = useState(createCheckoutRequestKey);
  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "cod">("prepaid");
  const [location, setLocation] = useState<"dhaka" | "outside">("dhaka");
  
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentGateway, setPaymentGateway] = useState<"bkash" | "nagad">("bkash");
  const [trxId, setTrxId] = useState("");
  const [copied, setCopied] = useState(false);

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);

  const baseDeliveryFee = location === "dhaka" ? (deliverySettings?.delivery_fee || 80) : (deliverySettings?.delivery_fee_outside || 150);
  const deliveryFee = deliverySettings?.enabled && checkoutSubtotal < (deliverySettings?.free_threshold || 2000) ? baseDeliveryFee : 0;
  const grandTotal = checkoutSubtotal + deliveryFee - discountAmount;

  useEffect(() => {
    if (open) {
      setOrderRequestKey(createCheckoutRequestKey());
    }
  }, [open]);

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_coupon' as any, {
        _code: discountCode,
        _order_total: checkoutSubtotal,
        _store_id: checkoutStoreId,
      });
      const coupon = data as any;

      if (error) throw error;
      
      if (coupon.error) {
        toast.error(coupon.error);
        setDiscountApplied(false);
        setDiscountAmount(0);
      } else {
        let amount = 0;
        if (coupon.discount_type === 'percentage') {
          amount = Math.round(checkoutSubtotal * (coupon.discount_value / 100));
        } else {
          amount = coupon.discount_value;
        }
        setDiscountAmount(amount);
        setDiscountApplied(true);
        toast.success("Coupon applied!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to apply coupon.");
    } finally {
      setDiscountLoading(false);
    }
  };

  // Sync default payment gateway with enabled settings
  useEffect(() => {
    if (paymentSettings?.bkash_enabled) {
      setPaymentGateway("bkash");
    } else if (paymentSettings?.nagad_enabled) {
      setPaymentGateway("nagad");
    }
  }, [paymentSettings]);

  // Fetch and auto-fill default address
  useEffect(() => {
    if (user && open && !formData.name) {
      const fetchAddress = async () => {
        const { data } = await supabase
          .from("customer_addresses")
          .select("name, phone, address, city")
          .eq("user_id", user.id)
          .eq("store_id", checkoutStoreId)
          .eq("is_default", true)
          .maybeSingle();

        if (data) {
          setFormData((prev) => ({
            ...prev,
            name: prev.name || data.name,
            phone: prev.phone || data.phone,
            address: prev.address || data.address,
          }));
          if (data.city) {
            setLocation(data.city.toLowerCase() === "dhaka" ? "dhaka" : "outside");
          }
        }
      };
      fetchAddress();
    }
  }, [checkoutStoreId, formData.name, open, user]);

  if (!open) return null;

  const merchantNumber = paymentGateway === "bkash" ? paymentSettings?.bkash_number : paymentSettings?.nagad_number;
  const hasBkashGateway = !!(paymentSettings?.bkash_app_key && paymentSettings?.bkash_username);
  const isBkashGateway = paymentGateway === "bkash" && hasBkashGateway;

  const copyNumber = () => {
    if (merchantNumber) {
      navigator.clipboard.writeText(merchantNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasMixedStoreItems) {
      toast.error("Please checkout one store at a time.");
      return;
    }
    const hasBkashGateway = !!(paymentSettings?.bkash_app_key && paymentSettings?.bkash_username);
    const isBkashGateway = paymentMethod === "prepaid" && paymentGateway === "bkash" && hasBkashGateway;

    if (step === 1 && paymentMethod === "prepaid") {
      if (!formData.name || !formData.phone || !formData.address) {
        toast.error("Please fill in all required fields.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2 && paymentMethod === "prepaid" && !isBkashGateway && !trxId.trim()) {
      toast.error("Please enter the Transaction ID (TrxID).");
      return;
    }

    if (!formData.name || !formData.phone || !formData.address) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      // Create a secure order payload
      const result = await createOrder.mutateAsync({
        idempotencyKey: orderRequestKey,
        store_id: checkoutStoreId,
        user_id: user?.id || null,
        items: checkoutItems.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          size: item.size || "Free Size",
          quantity: item.quantity
        })),
        subtotal: checkoutSubtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        coupon_code: discountApplied ? discountCode : null,
        total: grandTotal,
        customer_name: formData.name,
        customer_phone: formData.phone,
        shipping_address: formData.address,
        shipping_city: location === "dhaka" ? "Dhaka" : "Outside Dhaka",
        payment_method: paymentMethod === "prepaid" ? paymentGateway : "cod",
        notes: formData.note + 
              (isBkashGateway ? " | Payment: bKash PGW (Automated)" : (paymentMethod === "prepaid" ? ` | TrxID: ${trxId}` : "")) + 
              (discountApplied ? ` | Coupon: ${discountCode}` : "")
      });

      if (isBkashGateway) {
        toast.info("Redirecting to bKash...");
        
        const { data, error } = await supabase.functions.invoke("bkash-payment", {
          body: {
            action: "create",
            order_id: result.order_number,
            amount: result.total ?? grandTotal,
            store_id: checkoutStoreId,
          },
        });

        if (error || !data?.success || !data?.bkashURL) {
          setLoading(false);
          toast.error(data?.error || error?.message || "Failed to initialize bKash payment. Please choose manual payment or COD.");
          return;
        }

        clearCart(checkoutStoreId);
        window.location.href = data.bkashURL;
        return;
      }

      setLoading(false);
      setSuccess(true);
      setOrderRequestKey(createCheckoutRequestKey());
      clearCart(checkoutStoreId);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        navigate(`/order-success?order=${encodeURIComponent(result.order_number)}`);
      }, 2000);
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to process order. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={() => !loading && !success && onOpenChange(false)}
      />
      <div className="fixed left-[50%] top-[50%] z-[111] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] p-4 animate-in zoom-in-95 duration-300">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="relative bg-secondary/50 p-6 border-b border-border text-center flex-shrink-0">
            {step === 2 && !loading && !success && (
              <button 
                onClick={() => setStep(1)}
                className="absolute left-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {step === 1 ? "Fast Checkout" : "Complete Payment"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1 ? "Complete your order in 30 seconds." : "Send money to confirm your order."}
            </p>
            {!loading && !success && (
              <button 
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {success ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-bounce-in">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-2">Order Confirmed!</h3>
              <p className="text-muted-foreground">Thank you, {formData.name}. We will call you shortly to confirm your delivery.</p>
            </div>
          ) : step === 1 ? (
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Hasan Mahmud"
                    required
                    className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number *</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. 017XXXXXXXX"
                    required
                    className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Delivery Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="House, Road, Area, City"
                    required
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Area *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setLocation("dhaka")}
                      className={cn(
                        "cursor-pointer rounded-xl border p-3 text-center transition-all duration-300",
                        location === "dhaka" ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <span className="font-semibold text-sm">Inside Dhaka</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {deliverySettings?.enabled && checkoutSubtotal >= (deliverySettings?.free_threshold || 2000) ? "Free" : `৳${deliverySettings?.delivery_fee || 80}`}
                      </p>
                    </div>
                    <div 
                      onClick={() => setLocation("outside")}
                      className={cn(
                        "cursor-pointer rounded-xl border p-3 text-center transition-all duration-300",
                        location === "outside" ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <span className="font-semibold text-sm">Outside Dhaka</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {deliverySettings?.enabled && checkoutSubtotal >= (deliverySettings?.free_threshold || 2000) ? "Free" : `৳${deliverySettings?.delivery_fee_outside || 150}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Note (Optional)</label>
                  <input
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    placeholder="Any special instructions?"
                    className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div 
                      onClick={() => setPaymentMethod("prepaid")}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all duration-300",
                        paymentMethod === "prepaid" 
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" 
                          : "border-border bg-background hover:border-primary/50 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">Pay Online</span>
                        {paymentMethod === "prepaid" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">bKash, Nagad, Cards</p>
                      <span className="mt-2 inline-block rounded-sm bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600">
                        {paymentSettings?.prepaid_badge_text || "Priority Delivery"}
                      </span>
                    </div>

                    <div 
                      onClick={() => setPaymentMethod("cod")}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all duration-300",
                        paymentMethod === "cod" 
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" 
                          : "border-border bg-background hover:border-primary/50 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">Cash on Delivery</span>
                        {paymentMethod === "cod" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">Pay when you receive</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-border pt-6">
                  <div className="flex items-center gap-2 mb-6">
                    <input
                      type="text"
                      placeholder="Discount Code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      disabled={discountApplied}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={discountApplied ? () => { setDiscountApplied(false); setDiscountAmount(0); setDiscountCode(""); } : applyDiscount}
                      disabled={discountLoading || !discountCode.trim()}
                    >
                      {discountLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : discountApplied ? "Remove" : "Apply"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>৳{checkoutSubtotal}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span className={deliveryFee === 0 ? "text-primary font-medium" : ""}>
                      {deliveryFee === 0 ? "Free" : `৳${deliveryFee}`}
                    </span>
                  </div>
                  {discountApplied && (
                    <div className="flex items-center justify-between text-sm text-primary">
                      <span>Discount ({discountCode.toUpperCase()})</span>
                      <span>-৳{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-6 border-t border-border pt-4">
                    <span className="font-medium text-foreground">Total to Pay</span>
                    <span className="font-heading text-2xl font-bold text-primary">৳{grandTotal}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || checkoutItems.length === 0}
                    className="w-full flex items-center justify-center rounded-md bg-primary py-4 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 glow-shadow disabled:opacity-50 transition-all duration-300"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : paymentMethod === "prepaid" ? (
                      "Proceed to Payment"
                    ) : (
                      "Confirm Cash on Delivery"
                    )}
                  </button>
                  
                  {paymentMethod === "cod" ? (
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      No payment required now. Pay when you receive.
                    </p>
                  ) : (
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      Secure payment via bKash, Nagad, or Bank Card.
                    </p>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Mobile Banking</label>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentSettings?.bkash_enabled && (
                      <div 
                        onClick={() => setPaymentGateway("bkash")}
                        className={cn(
                          "cursor-pointer rounded-xl border p-4 text-center transition-all duration-300 flex items-center justify-center gap-2",
                          paymentGateway === "bkash" ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-border bg-background hover:border-primary/50"
                        )}
                      >
                        <div className="flex h-6 items-center justify-center rounded bg-[#E2136E] px-2 font-bold text-white text-xs tracking-wider">bKash</div>
                        {paymentGateway === "bkash" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    )}
                    {paymentSettings?.nagad_enabled && (
                      <div 
                        onClick={() => setPaymentGateway("nagad")}
                        className={cn(
                          "cursor-pointer rounded-xl border p-4 text-center transition-all duration-300 flex items-center justify-center gap-2",
                          paymentGateway === "nagad" ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-border bg-background hover:border-primary/50"
                        )}
                      >
                        <div className="flex h-6 items-center justify-center rounded bg-[#ED1C24] px-2 font-bold text-white text-xs tracking-wider">Nagad</div>
                        {paymentGateway === "nagad" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    )}
                  </div>
                </div>

                {isBkashGateway ? (
                  <div className="space-y-4 rounded-md border border-primary/30 bg-primary/5 p-5 text-center">
                    <p className="text-sm font-medium text-foreground">
                      You will be redirected to the secure bKash payment gateway to pay <span className="font-bold text-primary">৳{grandTotal}</span>.
                    </p>
                  </div>
                ) : merchantNumber ? (
                  <div className="space-y-4 rounded-md border border-primary/30 bg-primary/5 p-5">
                    <p className="text-sm font-medium text-foreground">
                      Send <span className="font-bold text-primary">৳{grandTotal}</span> to this {paymentGateway === "bkash" ? "bKash" : "Nagad"} number:
                    </p>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <span className="font-mono text-xl font-bold text-foreground">{merchantNumber}</span>
                      <button
                        type="button"
                        onClick={copyNumber}
                        className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground mt-2">
                      <li>Open your {paymentGateway === "bkash" ? "bKash" : "Nagad"} app</li>
                      <li>Select &quot;Send Money&quot;</li>
                      <li>Enter the number above and send exactly <span className="font-semibold text-foreground">৳{grandTotal}</span></li>
                      <li>Enter the Transaction ID (TrxID) below</li>
                    </ol>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">Payment method is currently unavailable. Please go back and select Cash on Delivery.</p>
                )}

                {!isBkashGateway && merchantNumber && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground">Transaction ID (TrxID) *</label>
                    <input
                      type="text"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      placeholder="e.g. 8HQ4Y..."
                      required
                      className="w-full rounded-md border border-border bg-background px-4 py-3 font-mono text-sm uppercase text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="mt-8 border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-medium text-foreground">Total Paid</span>
                    <span className="font-heading text-2xl font-bold text-primary">৳{grandTotal}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || checkoutItems.length === 0 || (!isBkashGateway && (!merchantNumber || !trxId.trim()))}
                    className="w-full flex items-center justify-center rounded-md bg-primary py-4 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 glow-shadow disabled:opacity-50 transition-all duration-300"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isBkashGateway ? (
                      "Pay with bKash"
                    ) : (
                      "Verify & Confirm Order"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
