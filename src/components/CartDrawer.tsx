import { useState } from "react";
import { X, Minus, Plus, ShoppingBag, PlusCircle, Tag } from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useCart } from "@/context/useCart";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import GuestCheckoutModal from "@/components/GuestCheckoutModal";
import { useOptionalStore } from "@/components/storefront/store-context";
import { getCartVariantDisplayLabel, isDigitalOnlyCart } from "@/lib/digital-cart";
import { storefrontPath } from "@/lib/slug";
import { usePublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { getNormalizedDeliverySettings, type StorefrontDeliverySettings } from "@/lib/storefront-pricing";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import { buildCustomerAuthPath, resolveAllowGuestCheckout } from "@/lib/storefront-customer-access";
import type { Product } from "@/data/products";

const CartDrawer = () => {
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;
  const storeSlug = currentStore?.slug;
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeItem, addItem } = useCart();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const cartStoreIds = Array.from(new Set(items.map((item) => item.storeId).filter(Boolean)));
  const cartStoreId = cartStoreIds.length === 1 ? cartStoreIds[0] as string : currentStore?.id;
  const hasMixedStoreItems = cartStoreIds.length > 1;
  const drawerItems = items.filter((item) => (item.storeId ?? cartStoreId) === cartStoreId);
  const drawerTotal = drawerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const digitalOnlyCart = isDigitalOnlyCart(drawerItems);
  const preloadedStorefrontProfile =
    currentStore?.id === cartStoreId && typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore?.siteSettings?.storefront_profile
      ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
      : undefined;

  const { data: paymentSettings } = usePublicPaymentSettings(isCartOpen ? cartStoreId : null);
  const { data: deliverySettingsData } = useSiteSettings<StorefrontDeliverySettings>("delivery_settings", isCartOpen ? cartStoreId : null);
  const { data: storefrontProfileData } = useSiteSettings<Record<string, unknown>>("storefront_profile", isCartOpen ? cartStoreId : null);
  const deliverySettings = getNormalizedDeliverySettings(deliverySettingsData);
  const allowGuestCheckout = resolveAllowGuestCheckout(storefrontProfileData ?? preloadedStorefrontProfile);
  const { data: loyaltySettings } = useSiteSettings<any>("loyalty_settings", isCartOpen ? cartStoreId : null);
  const prepaymentDiscountType = paymentSettings?.prepayment_discount_type;
  const prepaymentDiscountValue = paymentSettings?.prepayment_discount_value;
  const freeThreshold = deliverySettings.free_threshold;
  const checkoutPath = storefrontPath("/checkout", storeSlug);
  const authCheckoutPath = buildCustomerAuthPath(checkoutPath, storeSlug);

  // Reuse the already-authorized storefront catalog snapshot instead of querying protected products from the browser.
  const cachedProducts = cartStoreId
    ? queryClient.getQueryData<Product[]>(["products", cartStoreId]) ?? []
    : [];
  const availableUpsells = cachedProducts
    .filter((product) => product.isAvailable !== false && !drawerItems.some((item) => item.productId === product.id))
    .sort((a, b) => a.price - b.price)
    .slice(0, 2);

  return (
    <>
      <GuestCheckoutModal open={showCheckoutModal} onOpenChange={setShowCheckoutModal} />
      
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer */}
          <div className={cn(
            "fixed inset-y-0 right-0 z-[101] w-full max-w-sm border-l border-border bg-card p-6 shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-md flex flex-col",
            isCartOpen ? "translate-x-0" : "translate-x-full"
          )}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                <ShoppingBag className="h-5 w-5" />
                Your Cart
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Prepayment Teaser */}
            {drawerItems.length > 0 && prepaymentDiscountType && prepaymentDiscountType !== "none" && (
              <div className="mt-4 rounded-md bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center gap-2">
                <Tag className="h-4 w-4" />
                {prepaymentDiscountType === "free_delivery" 
                  ? "Choose prepaid checkout for free delivery!" 
                  : `Choose prepaid checkout to get ${prepaymentDiscountType === "percentage" ? `${prepaymentDiscountValue}%` : `BDT ${prepaymentDiscountValue}`} off!`}
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6 hide-scrollbar">
              {drawerItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-lg font-medium text-foreground">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground">Looks like you haven't added anything yet.</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-6 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {drawerItems.map((item) => (
                    <div key={`${item.storeId ?? "default"}-${item.productId}-${item.size}`} className="flex gap-4">
                      <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-md border border-border">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium text-foreground line-clamp-1">{item.name}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {digitalOnlyCart ? "License" : "Size"}: {getCartVariantDisplayLabel(item.size)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId, item.size, item.storeId)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex h-11 items-center rounded-md border border-border">
                            <button
                              onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1, item.storeId)}
                              className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1, item.storeId)}
                              className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="ml-auto font-semibold text-foreground">BDT {item.price * item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* In-Cart Upsell Engine */}
                  {availableUpsells.length > 0 && (
                    <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Frequently Bought Together</h4>
                      <div className="space-y-3">
                        {availableUpsells.map((upsell) => (
                          <div key={upsell.id} className="flex items-center gap-3 rounded-md bg-background p-2 shadow-sm">
                            <img src={upsell.image} alt={upsell.name} className="h-12 w-10 rounded object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground line-clamp-1">{upsell.name}</p>
                              <p className="text-xs font-medium text-muted-foreground">BDT {upsell.price}</p>
                            </div>
                            <button
                              onClick={() => {
                                addItem({
                                  productId: upsell.id,
                                  name: upsell.name,
                                  price: upsell.price,
                                  image: upsell.image,
                                  size: upsell.sizes?.[0] || 'One Size',
                                  storeId: cartStoreId,
                                });
                                toast.success("Added to cart!");
                              }}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Add ${upsell.name} to cart`}
                            >
                              <PlusCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {drawerItems.length > 0 && (
              <div className="border-t border-border pt-4">
                {/* Free Shipping Progress Bar */}
                <div className="mb-4 rounded-md bg-secondary p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium">
                    {digitalOnlyCart ? (
                      <span className="text-primary font-bold">Digital-only cart. No shipping fee will be added.</span>
                    ) : deliverySettings.enabled ? (
                      drawerTotal >= freeThreshold ? (
                        <span className="text-primary font-bold">You've unlocked free shipping.</span>
                      ) : (
                        <span><span className="text-primary font-bold">BDT {freeThreshold - drawerTotal}</span> away from free shipping</span>
                      )
                    ) : (
                      <span>Delivery fees are calculated from this store's current rules at checkout.</span>
                    )}
                  </div>
                  {!digitalOnlyCart && deliverySettings.enabled ? (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border/50">
                      <div 
                        className={cn("h-full transition-all duration-500 ease-out", drawerTotal >= freeThreshold ? "bg-green-500" : "bg-primary")}
                        style={{ width: `${Math.min((drawerTotal / freeThreshold) * 100, 100)}%` }}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <span className="font-medium text-foreground">Subtotal</span>
                  <span className="font-heading text-lg font-bold text-foreground">BDT {drawerTotal}</span>
                </div>

                {loyaltySettings?.enabled && (
                  <div className="mb-4 flex items-center justify-between rounded-md bg-primary/5 px-3 py-2 border border-primary/20">
                    <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                      Earn {Math.floor(drawerTotal * (loyaltySettings.earn_rate || 0.05))} {loyaltySettings.name || "Reward Points"}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">With this order</span>
                  </div>
                )}

                <p className="mb-4 text-xs text-muted-foreground">
                  {digitalOnlyCart ? "Digital delivery details will be confirmed at checkout." : "Shipping and taxes calculated at checkout."}
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    to={storefrontPath("/cart", storeSlug)}
                    onClick={() => setIsCartOpen(false)}
                    className="flex w-full items-center justify-center rounded-md border border-border py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    View Full Cart
                  </Link>
                  <button
                    onClick={() => {
                      if (hasMixedStoreItems) {
                        toast.error("Please checkout one store at a time.");
                        return;
                      }
                      setIsCartOpen(false);
                      if (!allowGuestCheckout && !user) {
                        navigate(authCheckoutPath);
                        return;
                      }
                      if (allowGuestCheckout) {
                        setShowCheckoutModal(true);
                        return;
                      }
                      navigate(checkoutPath);
                    }}
                    className="flex w-full items-center justify-center rounded-md bg-primary py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 glow-shadow transition-opacity"
                  >
                    {!allowGuestCheckout && !user ? "Login to Checkout" : allowGuestCheckout ? "Checkout Instantly" : "Continue to Checkout"}
                  </button>
                </div>
                {!allowGuestCheckout ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    This store requires customer login before purchase. We will bring shoppers back to checkout after sign-in.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default CartDrawer;
