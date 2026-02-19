import { Link, useLocation } from "react-router-dom";
import { CheckCircle, Package } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import PageTransition from "@/components/PageTransition";

const OrderSuccess = () => {
  const location = useLocation();
  const orderNumber = (location.state as { orderNumber?: string })?.orderNumber;

  return (
    <Layout>
      <SEOHead title="Order Confirmed" description="Your ThreadBD order has been placed successfully." noindex />
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
              Thank you for shopping with ThreadBD. Your order has been placed successfully.
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
              Estimated delivery: <span className="font-semibold text-foreground">2-5 business days</span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/shop"
                className="inline-block rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 glow-shadow"
              >
                Continue Shopping
              </Link>
              <Link
                to="/account"
                className="inline-block rounded-md border border-border px-8 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground hover:bg-secondary"
              >
                View Orders
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
};

export default OrderSuccess;
