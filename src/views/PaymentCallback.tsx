import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import SEOHead from "@/components/SEOHead";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { storefrontPath } from "@/lib/slug";
import { getPaymentProviderManifest } from "@/lib/payments/provider-registry";
import {
  handleRedirectPaymentCallback,
  type PaymentCallbackStatus,
} from "@/lib/payments/checkout-runtime";
import { toast } from "sonner";

const PaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const executeCalled = useRef(false);
  const providerId = searchParams.get("provider")?.trim().toLowerCase() ?? "";
  const provider = getPaymentProviderManifest(providerId);
  const providerLabel = provider?.label ?? "Payment";
  const initialStoreId = searchParams.get("store_id")?.trim() || undefined;
  const [storeId, setStoreId] = useState<string | undefined>(initialStoreId);
  const [status, setStatus] = useState<"loading" | PaymentCallbackStatus>("loading");
  const [message, setMessage] = useState(`Processing your ${providerLabel} payment...`);

  const resolveStoreSlug = useCallback(async () => {
    if (!storeId) return undefined;

    const { data } = await supabase
      .from("stores")
      .select("slug")
      .eq("id", storeId)
      .maybeSingle();

    return data?.slug ?? undefined;
  }, [storeId]);

  useEffect(() => {
    if (executeCalled.current) return;
    executeCalled.current = true;

    const settle = async () => {
      if (!providerId || !provider) {
        setStatus("error");
        setMessage("This payment provider is not available. Please contact support.");
        return;
      }

      setStatus("loading");
      setMessage(`Verifying payment with ${providerLabel}...`);

      const params = Object.fromEntries(searchParams.entries());
      try {
        const result = await handleRedirectPaymentCallback(
          {
            invokeFunction: async (functionName, body) => {
              const { data, error } = await supabase.functions.invoke(functionName, { body });
              return {
                data: data && typeof data === "object" ? data as Record<string, unknown> : null,
                error: error ? { message: error.message } : null,
              };
            },
          },
          { providerId, params },
        );

        if (result.storeId) setStoreId(result.storeId);
        setStatus(result.status);
        setMessage(result.message);

        if (result.status === "success" && result.orderNumber) {
          toast.success(`${providerLabel} payment verified successfully!`);
          window.setTimeout(() => {
            void (async () => {
              const slug = result.storeId
                ? await supabase
                    .from("stores")
                    .select("slug")
                    .eq("id", result.storeId)
                    .maybeSingle()
                    .then(({ data }) => data?.slug ?? undefined)
                : await resolveStoreSlug();
              navigate(storefrontPath(`/order-success?order=${encodeURIComponent(result.orderNumber as string)}`, slug));
            })();
          }, 1500);
        }
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "An unexpected payment verification error occurred.");
      }
    };

    void settle();
  }, [navigate, provider, providerId, providerLabel, resolveStoreSlug, searchParams]);

  const LayoutWrapper = storeId ? StorefrontLayout : Layout;
  const returnToCheckout = async () => navigate(storefrontPath("/checkout", await resolveStoreSlug()));
  const returnHome = async () => navigate(storefrontPath("/", await resolveStoreSlug()));

  return (
    <LayoutWrapper>
      <SEOHead title={`${providerLabel} Payment Verification`} description={`Verifying your ${providerLabel} payment.`} noindex />
      <PageTransition>
        <section className="flex min-h-[60vh] items-center justify-center py-20">
          <div className="container mx-auto max-w-md px-4 text-center">
            <div className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
              {status === "loading" && (
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <h2 className="font-heading text-xl font-semibold text-foreground">Processing Payment</h2>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              )}

              {status === "success" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">Payment Successful</h2>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              )}

              {status === "cancelled" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600">
                    <AlertCircle className="h-10 w-10" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">Payment Cancelled</h2>
                  <p className="text-sm text-muted-foreground">{message}</p>
                  <Button className="w-full" onClick={() => void returnToCheckout()}>
                    Return to Checkout
                  </Button>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <XCircle className="h-10 w-10" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold text-foreground">Payment Failed</h2>
                  <p className="text-sm text-muted-foreground">{message}</p>
                  <div className="flex w-full gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => void returnHome()}>
                      Go Home
                    </Button>
                    <Button className="flex-1" onClick={() => void returnToCheckout()}>
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </PageTransition>
    </LayoutWrapper>
  );
};

export default PaymentCallback;
