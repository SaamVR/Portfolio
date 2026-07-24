import { Link } from "@/lib/react-router-dom-shim";
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

interface DeliverySettings {
  enabled: boolean;
  free_threshold: number;
  delivery_fee: number;
  delivery_fee_outside?: number;
}

const Cart = () => {
  const { items, removeItem, updateQuantity } = useCart();
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
  const { data: fetchedDeliveryData, isLoading: isDeliverySettingsLoading } = useSiteSettings<DeliverySettings>("delivery_settings", cartStoreId);
  const deliveryData = fetchedDeliveryData ?? preloadedDeliverySettings;
  const deliveryLoading = isDeliverySettingsLoading && !preloadedDeliverySettings;
  const digitalOnlyCart = isDigitalOnlyCart(cartItems);

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
              className="rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
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
            <h1 className="mb-4 font-heading text-2xl font-bold text-foreground">Your cart is empty</h1>
            <p className="mb-8 text-muted-foreground">Browse {currentStoreName} and save a few items to get started.</p>
            <Link
              to={storefrontPath("/shop", currentStoreSlug)}
              className="rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Browse Shop
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
        <h1 className="mb-10 font-heading text-3xl font-bold text-foreground">Your Cart</h1>
        {hasMixedStoreItems ? (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Your browser currently has items from more than one store. This page is showing only the active storefront items for a safe checkout.
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {cartItems.map((item) => (
              <div key={`${item.storeId ?? "default"}-${item.productId}-${item.size}`} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                <img src={item.image} alt={item.name} className="h-24 w-24 rounded-md object-cover" />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-foreground">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {digitalOnlyCart ? "License" : "Size"}: {getCartVariantDisplayLabel(item.size)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1, item.storeId)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1, item.storeId)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-heading font-bold text-primary">BDT {item.price * item.quantity}</p>
                    <button
                      onClick={() => removeItem(item.productId, item.size, item.storeId)}
                      className="text-muted-foreground hover:text-destructive"
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
            <h2 className="mb-6 font-heading text-lg font-bold text-foreground">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>BDT {totalPrice}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{digitalOnlyCart ? "Digital delivery" : "Delivery"}</span>
                {deliveryLoading ? (
                  <Skeleton className="h-4 w-12" />
                ) : digitalOnlyCart ? (
                  <span data-testid="cart-delivery-total" className="font-medium text-primary">Included</span>
                ) : isFreeDelivery ? (
                  <span data-testid="cart-delivery-total" className="font-medium text-primary">Free</span>
                ) : (
                  <span data-testid="cart-delivery-total">BDT {deliveryFee}</span>
                )}
              </div>

              {!digitalOnlyCart && !deliveryLoading && deliveryData?.enabled && !isFreeDelivery && amountToFreeDelivery > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Add <strong>BDT {amountToFreeDelivery}</strong> more for free delivery!</span>
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
                  <span>Total</span>
                  {deliveryLoading ? <Skeleton className="h-5 w-16" /> : <span data-testid="cart-grand-total">BDT {grandTotal}</span>}
                </div>
              </div>
            </div>
            <Link
              to={storefrontPath("/checkout", currentStoreSlug)}
              className="mt-6 block w-full rounded-md bg-primary py-3 text-center font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow"
            >
              Proceed to Checkout
            </Link>
            <Link
              to={storefrontPath("/shop", currentStoreSlug)}
              className="mt-3 block w-full rounded-md border border-border py-3 text-center font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default Cart;
