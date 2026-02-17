import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

const OrderSuccess = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="flex min-h-[70vh] items-center justify-center pt-16" id="main-content">
          <div className="container mx-auto max-w-md px-4 text-center">
            <CheckCircle className="mx-auto mb-6 h-16 w-16 text-primary animate-bounce-in" />
            <h1 className="mb-4 font-heading text-3xl font-bold text-foreground">Order Confirmed!</h1>
            <p className="mb-2 text-muted-foreground">
              Thank you for shopping with ThreadBD. Your order has been placed successfully.
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
              Estimated delivery: <span className="font-semibold text-foreground">2-5 business days</span>
            </p>
            <Link
              to="/shop"
              className="inline-block rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 glow-shadow"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default OrderSuccess;
