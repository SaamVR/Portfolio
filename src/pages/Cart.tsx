import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { useCart } from "@/context/CartContext";

const Cart = () => {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <Layout>
        <SEOHead title="Cart" description="Review your ThreadBD shopping cart." noindex />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 font-heading text-2xl font-bold text-foreground">Your cart is empty</h1>
            <p className="mb-8 text-muted-foreground">Add some premium tees to get started.</p>
            <Link
              to="/shop"
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
      <SEOHead title="Cart" description="Review your ThreadBD shopping cart." noindex />
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-10 font-heading text-3xl font-bold text-foreground">Your Cart</h1>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={`${item.productId}-${item.size}`} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                <img src={item.image} alt={item.name} className="h-24 w-24 rounded-md object-cover" />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-foreground">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">Size: {item.size}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-heading font-bold text-primary">৳{item.price * item.quantity}</p>
                    <button
                      onClick={() => removeItem(item.productId, item.size)}
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
                <span className="text-primary">Free</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-heading text-lg font-bold text-foreground">
                  <span>Total</span>
                  <span>৳{totalPrice}</span>
                </div>
              </div>
            </div>
            <Link
              to="/checkout"
              className="mt-6 block w-full rounded-md bg-primary py-3 text-center font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 glow-shadow"
            >
              Checkout with bKash
            </Link>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Also accepting Nagad & Cash on Delivery
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
