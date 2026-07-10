import { Link } from "@/lib/react-router-dom-shim";
import { Minus, Plus, Trash2, Truck } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { useCart } from "@/context/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

interface DeliverySettings {
  enabled: boolean;
  free_threshold: number;
  delivery_fee: number;
}

const Cart = () => {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const { data: deliveryData, isLoading: deliveryLoading } = useSiteSettings<DeliverySettings>("delivery_settings");
  const currentStore = useOptionalStore();

  const deliveryFee = (() => {
    if (!deliveryData) return 80;
    if (!deliveryData.enabled) return 0;
    return totalPrice >= deliveryData.free_threshold ? 0 : deliveryData.delivery_fee;
  })();

  const grandTotal = totalPrice + deliveryFee;
  const isFreeDelivery = deliveryData?.enabled && totalPrice >= (deliveryData?.free_threshold ?? 2000);
  const amountToFreeDelivery = deliveryData ? Math.max(0, deliveryData.free_threshold - totalPrice) : 0;

  if (items.length === 0) {
    return (
      <Layout>
        <SEOHead title="Cart" description="Review your shopping cart." noindex />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 font-heading text-2xl font-bold text-foreground">Your cart is empty</h1>
            <p className="mb-8 text-muted-foreground">Add some premium tees to get started.</p>
            <Link
              to={storefrontPath("/shop", currentStore?.slug)}
              className="rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Browse Shop
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title="Cart" description="Review your shopping cart." noindex />
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-10 font-heading text-3xl font-bold text-foreground">Your Cart</h1>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <div key={`${item.storeId ?? "default"}-${item.productId}-${item.size}`} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                <img src={item.image} alt={item.name} className="h-24 w-24 rounded-md object-cover" />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-foreground">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">Size: {item.size}</p>
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
                    <p className="font-heading font-bold text-primary">৳{item.price * item.quantity}</p>
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
                <span>৳{totalPrice}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                {deliveryLoading ? (
                  <Skeleton className="h-4 w-12" />
                ) : isFreeDelivery ? (
                  <span className="font-medium text-primary">Free</span>
                ) : (
                  <span>৳{deliveryFee}</span>
                )}
              </div>

              {!deliveryLoading && deliveryData?.enabled && !isFreeDelivery && amountToFreeDelivery > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Add <strong>৳{amountToFreeDelivery}</strong> more for free delivery!</span>
                </div>
              )}

              {!deliveryLoading && isFreeDelivery && (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span>You qualify for free delivery!</span>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-heading text-lg font-bold text-foreground">
                  <span>Total</span>
                  {deliveryLoading ? <Skeleton className="h-5 w-16" /> : <span>৳{grandTotal}</span>}
                </div>
              </div>
            </div>
            <Link
              to={storefrontPath("/checkout", currentStore?.slug)}
              className="mt-6 block w-full rounded-md bg-primary py-3 text-center font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow"
            >
              Proceed to Checkout
            </Link>
            <Link
              to={storefrontPath("/shop", currentStore?.slug)}
              className="mt-3 block w-full rounded-md border border-border py-3 text-center font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
