"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Store } from "@/lib/cms/schema";
import {
  analyticsSettingsKey,
  buildAnalyticsStorageKey,
  createAnalyticsId,
  extractAttribution,
  inferPageType,
  mapEventToGa4,
  mapEventToMeta,
  normalizeAnalyticsSettings,
  type AnalyticsAttribution,
  type AnalyticsSettings,
  type StorefrontAnalyticsEvent,
} from "@/lib/analytics/storefront-analytics";

type StorefrontAnalyticsContextValue = {
  settings: AnalyticsSettings;
  visitorId: string;
  sessionId: string;
  trackEvent: (event: StorefrontAnalyticsEvent) => void;
};

const StorefrontAnalyticsContext = createContext<StorefrontAnalyticsContextValue>({
  settings: {},
  visitorId: "",
  sessionId: "",
  trackEvent: () => undefined,
});

const analyticsBatchSize = 10;
const analyticsFlushDelayMs = 1_500;

function parseAttribution(value: string | null): AnalyticsAttribution {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as AnalyticsAttribution : {};
  } catch {
    return {};
  }
}

function callGlobalTrackers(event: StorefrontAnalyticsEvent, settings: AnalyticsSettings) {
  if (typeof window === "undefined") return;

  if (settings.ga4Enabled && settings.ga4MeasurementId && typeof (window as any).gtag === "function") {
    (window as any).gtag("event", event.eventName, mapEventToGa4(event));
  }

  const metaEvent = mapEventToMeta(event);
  if (settings.metaPixelEnabled && settings.metaPixelId && metaEvent && typeof (window as any).fbq === "function") {
    (window as any).fbq("track", metaEvent.event, metaEvent.payload);
  }
}

function shouldTrack(settings: AnalyticsSettings, eventName: StorefrontAnalyticsEvent["eventName"]) {
  if (eventName === "page_view") return settings.trackPageViews !== false;
  if (eventName === "search" || eventName === "search_result_click" || eventName === "tag_click" || eventName === "filter_used" || eventName === "sort_changed") return settings.trackSearches !== false;
  if (eventName.includes("wishlist")) return settings.trackWishlist !== false;
  if (eventName.includes("cart") || eventName === "view_cart") return settings.trackCart !== false;
  if (eventName === "begin_checkout" || eventName === "purchase") return settings.trackCheckout !== false;
  return true;
}

export function StorefrontAnalyticsProvider({
  store,
  children,
}: {
  store: Store;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settings = useMemo(
    () => normalizeAnalyticsSettings(store.siteSettings?.[analyticsSettingsKey]),
    [store.siteSettings],
  );
  const [visitorId, setVisitorId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const pageViewRef = useRef("");
  const queueRef = useRef<Array<Record<string, unknown>>>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readSessionAttribution = useCallback((): AnalyticsAttribution => {
    if (typeof window === "undefined") return {};
    return parseAttribution(window.sessionStorage.getItem(buildAnalyticsStorageKey(store.id, "session-attribution")));
  }, [store.id]);

  const resolveAttribution = useCallback((queryString: string) => {
    if (typeof window === "undefined") return {};
    const sessionKey = buildAnalyticsStorageKey(store.id, "session-attribution");
    const firstTouchKey = buildAnalyticsStorageKey(store.id, "first-touch-attribution");
    const existingSession = parseAttribution(window.sessionStorage.getItem(sessionKey));
    const nextAttribution = extractAttribution(
      new URLSearchParams(queryString),
      document.referrer,
      window.location.hostname,
    );

    const shouldReplace = nextAttribution.source && nextAttribution.source !== "direct";
    const resolved = shouldReplace ? nextAttribution : (existingSession.source ? existingSession : nextAttribution);
    window.sessionStorage.setItem(sessionKey, JSON.stringify(resolved));
    if (shouldReplace && !window.localStorage.getItem(firstTouchKey)) {
      window.localStorage.setItem(firstTouchKey, JSON.stringify(resolved));
    }
    return resolved;
  }, [store.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visitorKey = buildAnalyticsStorageKey(store.id, "visitor-id");
    const sessionKey = buildAnalyticsStorageKey(store.id, "session-id");
    const existingVisitorId = window.localStorage.getItem(visitorKey) || createAnalyticsId();
    const existingSessionId = window.sessionStorage.getItem(sessionKey) || createAnalyticsId();
    window.localStorage.setItem(visitorKey, existingVisitorId);
    window.sessionStorage.setItem(sessionKey, existingSessionId);
    setVisitorId(existingVisitorId);
    setSessionId(existingSessionId);
  }, [store.id]);

  const flushQueue = useCallback(() => {
    if (typeof window === "undefined") return;
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }

    const batch = queueRef.current.splice(0, analyticsBatchSize);
    if (batch.length === 0) return;

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(() => {
      queueRef.current.unshift(...batch);
    });
  }, []);

  const enqueueEvent = useCallback((payload: Record<string, unknown>) => {
    queueRef.current.push(payload);
    if (queueRef.current.length >= analyticsBatchSize) {
      flushQueue();
      return;
    }

    if (flushTimeoutRef.current) return;
    flushTimeoutRef.current = setTimeout(() => {
      flushQueue();
    }, analyticsFlushDelayMs);
  }, [flushQueue]);

  const trackEvent = useCallback((event: StorefrontAnalyticsEvent) => {
    if (typeof window === "undefined") return;
    if (!shouldTrack(settings, event.eventName)) return;

    const fullPath = event.pagePath || `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    const persistedAttribution = settings.trackTrafficSources !== false ? readSessionAttribution() : {};
    const metadata = {
      ...persistedAttribution,
      ...(event.metadata || {}),
    };
    const payload = {
      storeId: store.id,
      visitorId,
      sessionId,
      eventName: event.eventName,
      eventCategory: event.eventCategory || "engagement",
      pagePath: fullPath,
      pageType: event.pageType || inferPageType(pathname),
      referrer: event.referrer || document.referrer || "",
      searchQuery: event.searchQuery,
      productId: event.productId,
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      quantity: event.quantity,
      value: event.value,
      currencyCode: event.currencyCode || store.currencyCode || "BDT",
      metadata,
    };

    if (settings.firstPartyEnabled !== false && !event.skipFirstParty) {
      enqueueEvent(payload);
    }

    callGlobalTrackers(
      {
        ...event,
        pagePath: payload.pagePath,
        pageType: payload.pageType,
        currencyCode: payload.currencyCode,
        metadata,
      },
      settings,
    );
  }, [enqueueEvent, pathname, readSessionAttribution, searchParams, sessionId, settings, store.currencyCode, store.id, visitorId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const flushOnExit = () => {
      flushQueue();
    };

    window.addEventListener("pagehide", flushOnExit);
    window.addEventListener("beforeunload", flushOnExit);
    document.addEventListener("visibilitychange", flushOnExit);

    return () => {
      window.removeEventListener("pagehide", flushOnExit);
      window.removeEventListener("beforeunload", flushOnExit);
      document.removeEventListener("visibilitychange", flushOnExit);
      flushQueue();
    };
  }, [flushQueue]);

  useEffect(() => {
    if (!pathname || !visitorId || !sessionId || settings.trackPageViews === false) return;

    const queryString = searchParams?.toString() ?? "";
    const pageKey = `${pathname}?${queryString}`;
    if (pageViewRef.current === pageKey) return;
    pageViewRef.current = pageKey;

    const attribution: AnalyticsAttribution = settings.trackTrafficSources !== false
      ? resolveAttribution(queryString)
      : {};

    trackEvent({
      eventName: "page_view",
      eventCategory: "navigation",
      pagePath: queryString ? `${pathname}?${queryString}` : pathname,
      pageType: inferPageType(pathname),
      referrer: typeof document !== "undefined" ? document.referrer : "",
      metadata: {
        title: typeof document !== "undefined" ? document.title : "",
        ...attribution,
      },
    });
  }, [pathname, resolveAttribution, searchParams, sessionId, settings.trackPageViews, settings.trackTrafficSources, trackEvent, visitorId]);

  const contextValue = useMemo(
    () => ({
      settings,
      visitorId,
      sessionId,
      trackEvent,
    }),
    [sessionId, settings, trackEvent, visitorId],
  );

  const ga4MeasurementId = settings.ga4MeasurementId || "";
  const metaPixelId = settings.metaPixelId || "";

  return (
    <StorefrontAnalyticsContext.Provider value={contextValue}>
      {settings.ga4Enabled && ga4MeasurementId ? (
        <>
          <Script
            id={`ga4-loader-${store.id}`}
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId)}`}
            strategy="afterInteractive"
          />
          <Script id={`ga4-inline-${store.id}`} strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('config', '${ga4MeasurementId}', { send_page_view: false });`}
          </Script>
        </>
      ) : null}
      {settings.metaPixelEnabled && metaPixelId ? (
        <Script id={`meta-pixel-${store.id}`} strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
        </Script>
      ) : null}
      {children}
    </StorefrontAnalyticsContext.Provider>
  );
}

export function useStorefrontAnalytics() {
  return useContext(StorefrontAnalyticsContext);
}
