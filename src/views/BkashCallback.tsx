import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { storefrontPath } from "@/lib/slug";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const BkashCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "cancelled">("loading");
  const [message, setMessage] = useState("Processing your payment...");
  const executeCalled = useRef(false);

  const paymentID = searchParams.get("paymentID");
  const callbackStatus = searchParams.get("status");
  const orderId = searchParams.get("order_id");
  const storeId = searchParams.get("store_id");

  const resolveStoreSlug = async () => {
    if (!storeId) return undefined;

    const { data } = await (supabase as any)
      .from("stores")
      .select("slug")
      .eq("id", storeId)
      .maybeSingle();

    return data?.slug ?? undefined;
  };

  useEffect(() => {
    if (executeCalled.current) return;
    executeCalled.current = true;

    const executePayment = async () => {
      if (!paymentID) {
        setStatus("error");
        setMessage("Invalid payment ID. Please contact support.");
        return;
      }

      if (callbackStatus === "cancel") {
        setStatus("cancelled");
        setMessage("Payment was cancelled. You can try checkout again.");
        return;
      }

      if (callbackStatus === "failure" || callbackStatus === "error") {
        setStatus("error");
        setMessage("Payment failed. Please try again.");
        return;
      }

      try {
        setStatus("loading");
        setMessage("Verifying payment with bKash...");

        const { data, error } = await supabase.functions.invoke("bkash-payment", {
          body: {
            action: "execute",
            paymentID,
            order_id: orderId,
            store_id: storeId,
          },
        });

        if (error || !data || !data.success) {
          setStatus("error");
          setMessage(data?.error || error?.message || "Failed to verify payment with bKash.");
          return;
        }

        setStatus("success");
        setMessage("Payment successful! Redirecting to confirmation page...");
        toast.success("Payment verified successfully!");
        
        setTimeout(() => {
          void (async () => {
            const storeSlug = await resolveStoreSlug();
            navigate(storefrontPath(`/order-success?order=${encodeURIComponent(data.order_number)}`, storeSlug));
          })();
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "An unexpected error occurred during verification.");
      }
    };

    executePayment();
  }, [paymentID, callbackStatus, orderId, storeId, navigate]);

  return (
    <Layout>
      <SEOHead title="bKash Payment Verification" description="Verifying your bKash payment." noindex />
      <PageTransition>
        <section className="py-20 flex min-h-[60vh] items-center justify-center">
          <div className="container mx-auto max-w-md px-4 text-center">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
              {status === "loading" && (
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <h2 className="font-heading text-xl font-semibold text-foreground">Processing Payment</h2>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              )}

              {status === "success" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 animate-bounce-in">
                    <CheckCircle2 className="h-10 w-10 animate-bounce-in" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">Payment Successful</h2>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              )}

              {status === "cancelled" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                    <AlertCircle className="h-10 w-10" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">Payment Cancelled</h2>
                  <p className="text-sm text-muted-foreground mb-4">{message}</p>
                  <Button onClick={() => void (async () => navigate(storefrontPath("/checkout", await resolveStoreSlug())))} className="w-full">
                    Return to Checkout
                  </Button>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                    <XCircle className="h-10 w-10" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">Payment Failed</h2>
                  <p className="text-sm text-muted-foreground mb-4">{message}</p>
                  <div className="flex w-full gap-3">
                    <Button variant="outline" onClick={() => void (async () => navigate(storefrontPath("/", await resolveStoreSlug())))} className="flex-1">
                      Go Home
                    </Button>
                    <Button onClick={() => void (async () => navigate(storefrontPath("/checkout", await resolveStoreSlug())))} className="flex-1">
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default BkashCallback;
