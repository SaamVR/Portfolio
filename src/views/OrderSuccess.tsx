import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { useEffect, useRef } from "react";
import { CheckCircle, Package } from "lucide-react";
import Layout from "@/components/Layout";
import { StorefrontLayout } from "@/components/storefront/StorefrontLayout";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { useOptionalStore } from "@/components/storefront/store-context";
import SEOHead from "@/components/SEOHead";
import PageTransition from "@/components/PageTransition";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontOrderExperience } from "@/lib/cms/storefront-order-experience";

interface OrderSuccessProps {
  explicitStoreId?: string;
  explicitStoreSlug?: string;
}

const OrderSuccess = ({ explicitStoreId, explicitStoreSlug }: OrderSuccessProps = {}) => {
  const location = useLocation();
  const orderNumber = new URLSearchParams(location.search).get("order") || undefined;
  const currentStore = useOptionalStore();
  const { trackEvent } = useStorefrontAnalytics();
  const storeSlug = explicitStoreSlug ?? currentStore?.slug;
  const storeName = currentStore?.name ?? "the store";
  const experience = resolveStorefrontOrderExperience(currentStore);
  const trackedPurchaseRef = useRef<string | null>(null);

  const LayoutWrapper = (explicitStoreId ?? currentStore?.id) ? StorefrontLayout : Layout;
  const trackOrderPath = orderNumber
    ? storefrontPath(`/track-order?order=${encodeURIComponent(orderNumber)}`, storeSlug)
    : storefrontPath("/track-order", storeSlug);

  useEffect(() => {
    if (!currentStore?.id || !orderNumber || trackedPurchaseRef.current === orderNumber) return;
    if (typeof window === "undefined") return;

    const storageKey = `storefront-purchase:${currentStore.id}`;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const purchase = JSON.parse(raw) as {
        orderId?: string;
        orderNumber?: string;
        value?: number;
        currencyCode?: string;
        items?: Array<Record<string, unknown>>;
      };
      if (purchase.orderNumber !== orderNumber) return;

      trackedPurchaseRef.current = orderNumber;
      trackEvent({
        eventName: "purchase",
        eventCategory: "commerce",
        orderId: purchase.orderId,
        orderNumber,
        value: purchase.value,
        currencyCode: purchase.currencyCode,
        skipFirstParty: true,
        metadata: {
          items: purchase.items ?? [],
        },
      });
      window.sessionStorage.removeItem(storageKey);
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [currentStore?.id, orderNumber, trackEvent]);

  return (
    <LayoutWrapper>
      <SEOHead title={experience.labels.orderPlacedTitle} description={`Your order with ${storeName} has been placed successfully.`} noindex />
      <PageTransition>
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-10 sm:py-14">
          <div className="w-full max-w-lg rounded-2xl border border-primary/20 bg-card px-5 py-8 text-center shadow-sm sm:px-8 sm:py-10">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-14 w-14 text-primary animate-bounce-in" />
            </div>

            <h1 className="font-heading text-3xl font-bold text-foreground">{experience.labels.orderPlacedTitle}!</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
              Thank you for choosing {storeName}. {experience.labels.orderPlacedDescription}
            </p>

            <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-left sm:p-5">
              {orderNumber && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Order reference</p>
                    <p className="mt-1 break-all font-heading text-lg font-bold text-foreground">{orderNumber}</p>
                  </div>
                </div>
              )}

              <div className={orderNumber ? "mt-4 border-t border-border pt-4" : ""}>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {experience.labels.postOrderStatusLabel}
                </p>
                <p className="mt-1 font-semibold text-foreground">{experience.labels.deliveryEstimateLabel}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {orderNumber ? (
                <>
                  <Link
                    to={trackOrderPath}
                    className="flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-6 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 glow-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {experience.labels.trackActionLabel}
                  </Link>
                  <Link
                    to={storefrontPath("/shop", storeSlug)}
                    className="flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-background px-6 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {experience.labels.continueActionLabel}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={storefrontPath("/shop", storeSlug)}
                    className="flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-6 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 glow-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {experience.labels.continueActionLabel}
                  </Link>
                  <Link
                    to={trackOrderPath}
                    className="flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-background px-6 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {experience.labels.trackActionLabel}
                  </Link>
                </>
              )}

              <Link
                to={storefrontPath("/account", storeSlug)}
                className="mx-auto flex min-h-11 w-fit items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {experience.labels.accountActionLabel}
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    </LayoutWrapper>
  );
};

export default OrderSuccess;
