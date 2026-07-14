import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useOptionalStore } from "@/components/storefront/store-context";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

const COOKIE_CONSENT_KEY = "cookie-consent";

const CookieConsent = () => {
  const currentStore = useOptionalStore();
  const storageKey = getScopedStorefrontStorageKey(COOKIE_CONSENT_KEY, currentStore?.id);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(storageKey);
    if (!consent) {
      // Small delay to not overwhelm the user immediately
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const handleAccept = () => {
    localStorage.setItem(storageKey, "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(storageKey, "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pb-20 sm:pb-6 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-card border border-border shadow-2xl rounded-lg p-5 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-500">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 pr-6">
            <h3 className="text-sm font-semibold mb-1 text-foreground">We value your privacy</h3>
            <p className="text-sm text-muted-foreground">
              We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={handleDecline}
              className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors flex-1 sm:flex-none"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex-1 sm:flex-none"
            >
              Accept All
            </button>
          </div>
          
          <button 
            onClick={handleDecline}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
