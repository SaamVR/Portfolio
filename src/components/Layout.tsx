import { useState, useCallback } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  const handleVisibilityChange = useCallback((visible: boolean) => {
    setAnnouncementVisible(visible);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar onVisibilityChange={handleVisibilityChange} />
      <Navbar announcementVisible={announcementVisible} />
      <main className={`${announcementVisible ? "pt-[100px]" : "pt-16"} pb-16 md:pb-0`} id="main-content">
        {children}
      </main>
      <Footer />
      <BackToTop />
      <MobileBottomNav />
      <WhatsAppButton />
    </div>
  );
};

export default Layout;

