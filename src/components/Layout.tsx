import { useState, useCallback } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import CartDrawer from "@/components/CartDrawer";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import CookieConsent from "@/components/CookieConsent";
import { useStorefrontThemeCustomization } from "@/hooks/useStorefrontThemeCustomization";
import { getStorefrontBaseTextSize } from "@/lib/storefront-theme-customization";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const { data: themeCustomization } = useStorefrontThemeCustomization();

  const handleVisibilityChange = useCallback((visible: boolean) => {
    setAnnouncementVisible(visible);
  }, []);

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontSize: getStorefrontBaseTextSize(themeCustomization?.text_size) }}
    >
      <AnnouncementBar onVisibilityChange={handleVisibilityChange} />
      <Navbar announcementVisible={announcementVisible} />
      <CartDrawer />
      <main
        className={`${themeCustomization?.nav_style === "static" ? "pt-0" : announcementVisible ? "pt-[100px]" : "pt-16"} pb-16 md:pb-0`}
        id="main-content"
      >
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

