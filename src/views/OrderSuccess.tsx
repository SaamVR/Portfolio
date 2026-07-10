import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { CheckCircle, Package } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { useOptionalStore } from "@/components/storefront/store-context";
import SEOHead from "@/components/SEOHead";
import PageTransition from "@/components/PageTransition";
import { storefrontPath } from "@/lib/slug";

interface OrderSuccessProps {
  explicitStoreId?: string;
  explicitStoreSlug?: string;
}

const OrderSuccess = ({ explicitStoreId, explicitStoreSlug }: OrderSuccessProps = {}) => {
  const location = useLocation();
  const orderNumber = new URLSearchParams(location.search).get("order") || undefined;
  const currentStore = useOptionalStore();
  const storeSlug = explicitStoreSlug ?? currentStore?.slug;
  const storeName = currentStore?.name ?? "the store";

  const LayoutWrapper = explicitStoreId ? StorefrontLayout : Layout;

  return (
    <LayoutWrapper>
      <SEOHead title="Order Confirmed" description={`Your order with ${storeName} has been placed successfully.`} noindex />
      <PageTransition>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="container mx-auto max-w-md px-4 text-center">
            <CheckCircle className="mx-auto mb-6 h-16 w-16 text-primary animate-bounce-in" />
            <h1 className="mb-4 font-heading text-3xl font-bold text-foreground">Order Confirmed!</h1>
            {orderNumber && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-heading text-sm font-bold text-foreground">{orderNumber}</span>
              </div>
            )}
            <p className="mb-2 text-muted-foreground">
              Thank you for shopping with {storeName}. Your order has been placed successfully.
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
              Estimated delivery: <span className="font-semibold text-foreground">2-5 business days</span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to={storefrontPath("/shop", storeSlug)}
                className="inline-block rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 glow-shadow"
              >
                Continue Shopping
              </Link>
              <Link
                to={orderNumber ? storefrontPath(`/track-order?order=${encodeURIComponent(orderNumber)}`, storeSlug) : storefrontPath("/track-order", storeSlug)}
                className="inline-block rounded-md border border-primary/50 bg-primary/5 px-8 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary hover:bg-primary/10"
              >
                Track Order
              </Link>
              <Link
                to={storefrontPath("/account", storeSlug)}
                className="inline-block rounded-md border border-border px-8 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground hover:bg-secondary"
              >
                View Orders
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    </LayoutWrapper>
  );
};

export default OrderSuccess;
