import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import CartDrawer from "@/components/CartDrawer";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import CookieConsent from "@/components/CookieConsent";
import { CouponBanner } from "@/components/CouponBanner";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontBaseTextSize } from "@/lib/storefront-theme-customization";
import { resolveStorefrontChromeLayout } from "@/lib/storefront-chrome-layout";
import { useOptionalStore } from "@/components/storefront/store-context";
import { cn } from "@/lib/utils";

const storefrontChromeCss = `
  .storefront-layout-shell .skip-link {
    position: fixed;
    left: 1rem;
    top: 0.5rem;
    z-index: 80;
    transform: translateY(-200%);
    opacity: 0;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    padding: 0.625rem 0.875rem;
    font-weight: 700;
    box-shadow: var(--shadow-card);
  }

  .storefront-layout-shell .skip-link:focus,
  .storefront-layout-shell .skip-link:focus-visible {
    transform: translateY(0);
    opacity: 1;
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .storefront-layout-shell .announcement-shimmer {
    height: auto !important;
    min-height: 2.75rem;
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
  }

  .storefront-layout-shell .announcement-shimmer > p {
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.25rem;
    text-align: center;
  }

  .storefront-layout-shell .announcement-shimmer button[aria-label="Dismiss announcement"] {
    width: 2.75rem !important;
    height: 2.75rem !important;
  }

  .storefront-layout-shell nav[aria-label="Main navigation"] {
    top: var(--storefront-announcement-height, 0px) !important;
    transition-property: transform, opacity, background-color, border-color, color, box-shadow !important;
  }

  .storefront-layout-shell nav[aria-label="Mobile navigation"] {
    padding-bottom: env(safe-area-inset-bottom) !important;
  }

  .storefront-layout-shell nav[aria-label="Mobile navigation"] :is(a, button) > span:not(.absolute) {
    display: -webkit-box;
    max-width: 5rem;
    max-height: 1.5rem;
    overflow: hidden;
    white-space: normal !important;
    overflow-wrap: anywhere;
    text-overflow: clip;
    text-align: center;
    line-height: 0.75rem !important;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  @media (max-width: 767px) {
    .storefront-layout-shell button[aria-label="Open navigation menu"] {
      width: 2.75rem !important;
      min-width: 2.75rem;
      height: 2.75rem !important;
      flex-shrink: 0;
    }

    .storefront-layout-shell nav[aria-label="Main navigation"] > div > div:first-child {
      flex: 1 1 auto;
      overflow: hidden;
    }

    .storefront-layout-shell nav[aria-label="Main navigation"] > div > div:first-child > a {
      display: flex;
      min-height: 2.75rem;
      align-items: center;
      flex: 1 1 auto;
      overflow: hidden;
    }

    .storefront-layout-shell nav[aria-label="Main navigation"] > div > div:last-child {
      flex: 0 0 auto;
    }
  }

  @media (max-width: 479px) {
    .storefront-layout-shell nav[aria-label="Main navigation"] a[aria-label="Sign in"],
    .storefront-layout-shell nav[aria-label="Main navigation"] a[href$="/account"],
    .storefront-layout-shell nav[aria-label="Main navigation"] a[href$="/wishlist"] {
      display: none;
    }
  }
`;

type ChromeMetrics = {
  announcementHeight: number;
  navbarHeight: number;
  bottomNavHeight: number;
};

const EMPTY_CHROME_METRICS: ChromeMetrics = {
  announcementHeight: 0,
  navbarHeight: 0,
  bottomNavHeight: 0,
};

function getRenderedHeight(element: HTMLElement | null) {
  return element ? Math.ceil(element.getBoundingClientRect().height) : 0;
}

const Layout = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [chromeMetrics, setChromeMetrics] = useState<ChromeMetrics>(EMPTY_CHROME_METRICS);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const currentStore = useOptionalStore();
  const { data: themeCustomization } = useStorefrontThemeCustomization(currentStore?.id);
  const navStyle = themeCustomization?.nav_style ?? "sticky";

  const handleVisibilityChange = useCallback((visible: boolean) => {
    setAnnouncementVisible(visible);
  }, []);

  const measureChrome = useCallback(() => {
    const root = layoutRef.current;
    if (!root) return;

    const announcement = root.querySelector<HTMLElement>(".announcement-shimmer");
    const navbar = root.querySelector<HTMLElement>('nav[aria-label="Main navigation"]');
    const bottomNav = root.querySelector<HTMLElement>('nav[aria-label="Mobile navigation"]');
    const nextMetrics = {
      announcementHeight: announcementVisible ? getRenderedHeight(announcement) : 0,
      navbarHeight: getRenderedHeight(navbar),
      bottomNavHeight: getRenderedHeight(bottomNav),
    };

    setChromeMetrics((current) => (
      current.announcementHeight === nextMetrics.announcementHeight
      && current.navbarHeight === nextMetrics.navbarHeight
      && current.bottomNavHeight === nextMetrics.bottomNavHeight
        ? current
        : nextMetrics
    ));
  }, [announcementVisible]);

  useEffect(() => {
    const root = layoutRef.current;
    if (!root) return;

    measureChrome();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measureChrome);
    const observedElements = [
      root.querySelector<HTMLElement>(".announcement-shimmer"),
      root.querySelector<HTMLElement>('nav[aria-label="Main navigation"]'),
      root.querySelector<HTMLElement>('nav[aria-label="Mobile navigation"]'),
    ].filter((element): element is HTMLElement => Boolean(element));

    observedElements.forEach((element) => observer?.observe(element));
    window.addEventListener("resize", measureChrome, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureChrome);
    };
  }, [currentStore?.id, measureChrome, navStyle]);

  const chromeLayout = resolveStorefrontChromeLayout({
    announcementVisible,
    announcementHeight: chromeMetrics.announcementHeight,
    navbarHeight: chromeMetrics.navbarHeight,
    bottomNavHeight: chromeMetrics.bottomNavHeight,
    navStyle,
  });
  const layoutStyle = {
    fontSize: getStorefrontBaseTextSize(themeCustomization?.text_size),
    paddingBottom: `${chromeLayout.bottomPadding}px`,
    "--storefront-announcement-height": `${chromeLayout.navbarTop}px`,
  } as CSSProperties;

  return (
    <div ref={layoutRef} className={cn("storefront-layout-shell min-h-screen bg-background", className)} style={layoutStyle}>
      <style>{storefrontChromeCss}</style>
      <CouponBanner />
      <AnnouncementBar onVisibilityChange={handleVisibilityChange} />
      <Navbar announcementVisible={announcementVisible} />
      <CartDrawer />
      <main style={{ paddingTop: `${chromeLayout.mainPaddingTop}px` }} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <BackToTop />
      <MobileBottomNav />
      <WhatsAppButton />
      <ExitIntentPopup />
      <CookieConsent />
    </div>
  );
};

export default Layout;
