import { Link } from "@/lib/react-router-dom-shim";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/auth-context";
import { Minus, Plus, Trash2, Truck } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import { useCart } from "@/context/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptionalStore } from "@/components/storefront/store-context";
import { getCartVariantDisplayLabel, isDigitalOnlyCart } from "@/lib/digital-cart";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontOrderExperience } from "@/lib/cms/storefront-order-experience";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { buildRecoveryCartSnapshot, readRecoveryConsentStatus } from "@/lib/cart-recovery/client";
import { buildCustomerAuthPath, resolveAllowGuestCheckout } from "@/lib/storefront-customer-access";

interface DeliverySettings {
  enabled: boolean;
  free_threshold: number;
  delivery_fee: number;
  delivery_fee_outside?: number;
}

const Cart = () => {
  const { items, removeItem, updateQuantity } = useCart();
  const { user } = useAuth();
  const currentStore = useOptionalStore();
  const currentStoreId = currentStore?.id;
  const currentStoreSlug = currentStore?.slug;
  const currentStoreName = currentStore?.name ?? "this store";
  const cartStoreIds = Array.from(new Set(items.map((item) => item.storeId).filter(Boolean)));
  const cartStoreId = cartStoreIds.length === 1 ? (cartStoreIds[0] as string) : currentStoreId;
  const hasMixedStoreItems = cartStoreIds.length > 1;
  const cartItems = items.filter((item) => (item.storeId ?? cartStoreId) === cartStoreId);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const preloadedDeliverySettings =
    currentStore?.id === cartStoreId ? (currentStore?.siteSettings?.delivery_settings as DeliverySettings | undefined) : undefined;
  const preloadedStorefrontProfile =
    currentStore?.id === cartStoreId && typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore?.siteSettings?.storefront_profile
      ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
      : undefined;
  const { data: fetchedDeliveryData, isLoading: isDeliverySettingsLoading } = useSiteSettings<DeliverySettings>("delivery_settings", cartStoreId);
  const { data: fetchedStorefrontProfile } = useSiteSettings<Record<string, unknown>>("storefront_profile", cartStoreId);
  const deliveryData = fetchedDeliveryData ?? preloadedDeliverySettings;
  const storefrontProfile = fetchedStorefrontProfile ?? preloadedStorefrontProfile;
  const deliveryLoading = isDeliverySettingsLoading && !preloadedDeliverySettings;
  const allowGuestCheckout = resolveAllowGuestCheckout(storefrontProfile);
  const digitalOnlyCart = isDigitalOnlyCart(cartItems);
  const experience = resolveStorefrontOrderExperience(currentStore, cartItems);
  const { trackEvent, visitorId, sessionId } = useStorefrontAnalytics();
  const trackedCartViewRef = useRef("");
  const checkoutPath = storefrontPath("/checkout", currentStoreSlug);
  const checkoutDestination = !allowGuestCheckout && !user
    ? buildCustomerAuthPath(checkoutPath, currentStoreSlug)
    : checkoutPath;

  const deliveryFee = (() => {
    if (digitalOnlyCart) return 0;
    if (!deliveryData) return 80;
    if (!deliveryData.enabled) return 0;
    return totalPrice >= deliveryData.free_threshold ? 0 : deliveryData.delivery_fee;
  })();

  const grandTotal = totalPrice + deliveryFee;
  const isFreeDelivery = !digitalOnlyCart && deliveryData?.enabled && totalPrice >= (deliveryData?.free_threshold ?? 2000);
  const amountToFreeDelivery = deliveryData ? Math.max(0, deliveryData.free_threshold - totalPrice) : 0;
  const LayoutWrapper = cartStoreId ? StorefrontLayout : Layout;

  useEffect(() => {
    if (!cartStoreId || cartItems.length === 0) return;
    const snapshot = cartItems.map((item) => `${item.productId}:${item.quantity}:${item.size}`).join("|");
    if (trackedCartViewRef.current === snapshot) return;
    trackedCartViewRef.current = snapshot;

    trackEvent({
      eventName: "view_cart",
      eventCategory: "commerce",
      quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      value: grandTotal,
      metadata: {
        productIds: cartItems.map((item) => item.productId),
        itemCount: cartItems.length,
        storeId: cartStoreId,
      },
    });
  }, [cartItems, cartStoreId, grandTotal, trackEvent]);

  useEffect(() => {
    if (!cartStoreId || cartItems.length === 0 || !visitorId || !sessionId) return;

    const timer = window.setTimeout(() => {
      void fetch("/api/cart-recovery/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: cartStoreId,
          visitorId,
          sessionId,
          recoveryStage: "cart",
          contactCaptureSource: "cart",
          contactConsentStatus: readRecoveryConsentStatus(cartStoreId),
          cartSnapshot: buildRecoveryCartSnapshot(cartItems),
          cartValue: grandTotal,
          itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          metadata: {
            storeSlug: currentStoreSlug ?? null,
            pagePath: typeof window !== "undefined" ? window.location.pathname : "/cart",
          },
        }),
        keepalive: true,
      }).catch(() => undefined);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [cartItems, cartStoreId, currentStoreSlug, grandTotal, sessionId, visitorId]);

  if (!cartStoreId && items.length > 0) {
    return (
      <LayoutWrapper>
        <SEOHead title="Cart" description="Review your shopping cart." noindex />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="max-w-md text-center">
            <h1 className="mb-4 font-heading text-2xl font-bold text-foreground">Open this cart from a storefront</h1>
            <p className="mb-8 text-muted-foreground">
              We could not determine which store these items belong to yet. Return to the storefront where you added them and try checkout again.
            </p>
            <Link
              to={storefrontPath("/shop", currentStoreSlug)}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Browse Shop
            </Link>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  if (cartItems.length === 0) {
    return (
      <LayoutWrapper>
        <SEOHead title="Cart" description="Review your shopping cart." noindex />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 font-heading text-2xl font-bold text-foreground">{experience.labels.cartEmptyTitle}</h1>
            <p className="mb-8 text-muted-foreground">Browse {currentStoreName} and {experience.labels.cartEmptyDescription.toLowerCase()}</p>
            <Link
              to={storefrontPath("/shop", currentStoreSlug)}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {experience.labels.browseLabel}
            </Link>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <SEOHead title="Cart" description="Review your shopping cart." noindex />
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-10 font-heading text-3xl font-bold text-foreground">{experience.labels.cartTitle}</h1>
        {hasMixedStoreItems ? (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Your browser currently has items from more than one store. This page is showing only the active storefront items for a safe checkout.
          </div>
        ) : null}
        {!allowGuestCheckout ? (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            This store requires a customer account before checkout. You can still review your cart now, and we will return you to checkout after login.
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {cartItems.map((item) => (
              <div key={`${item.storeId ?? "default"}-${item.productId}-${item.size}`} className="flex gap-3 rounded-lg border border-border bg-card p-4 sm:gap-4">
                <img src={item.image} alt={item.name} className="h-20 w-20 shrink-0 rounded-md object-cover sm:h-24 sm:w-24" />
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading text-sm font-semibold text-foreground">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {experience.labels.optionLabel}: {getCartVariantDisplayLabel(item.size)}
                    </p>
                    <p className="mt-1 font-heading font-bold text-primary">BDT {item.price * item.quantity}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1, item.storeId)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1, item.storeId)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.size, item.storeId)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-fit rounded-lg border border-border bg-card p-6">
            <h2 className="mb-6 font-heading text-lg font-bold text-foreground">{experience.labels.summaryTitle}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{experience.labels.subtotalLabel}</span>
                <span>BDT {totalPrice}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{experience.labels.deliveryLabel}</span>
                {deliveryLoading ? (
                  <Skeleton className="h-4 w-12" />
                ) : digitalOnlyCart ? (
                  <span data-testid="cart-delivery-total" className="font-medium text-primary">{experience.labels.includedFulfillmentLabel}</span>
                ) : isFreeDelivery ? (
                  <span data-testid="cart-delivery-total" className="font-medium text-primary">{experience.labels.freeDeliveryLabel}</span>
                ) : (
                  <span data-testid="cart-delivery-total">BDT {deliveryFee}</span>
                )}
              </div>

              {!digitalOnlyCart && !deliveryLoading && deliveryData?.enabled && !isFreeDelivery && amountToFreeDelivery > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Add <strong>BDT {amountToFreeDelivery}</strong> more for free delivery.</span>
                </div>
              )}

              {digitalOnlyCart && (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span>This cart contains digital products only, so no physical shipping fee is added.</span>
                </div>
              )}

              {!digitalOnlyCart && !deliveryLoading && isFreeDelivery && (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span>You qualify for free delivery!</span>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-heading text-lg font-bold text-foreground">
                  <span>{experience.labels.totalLabel}</span>
                  {deliveryLoading ? <Skeleton className="h-5 w-16" /> : <span data-testid="cart-grand-total">BDT {grandTotal}</span>}
                </div>
              </div>
            </div>
            <Link
              to={checkoutDestination}
              className="mt-6 block w-full rounded-md bg-primary py-3 text-center font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow"
            >
              {!allowGuestCheckout && !user ? "Login to Checkout" : experience.labels.checkoutTitle}
            </Link>
            <Link
              to={storefrontPath("/shop", currentStoreSlug)}
              className="mt-3 block w-full rounded-md border border-border py-3 text-center font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              {experience.labels.continueBrowsingLabel}
            </Link>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default Cart;
