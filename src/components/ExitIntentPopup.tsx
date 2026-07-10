import { useOptionalStore } from "@/components/storefront/store-context";
import { useState, useEffect } from "react";
import { X, Copy, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ExitIntentPopup() {
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id;

  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: siteSettings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      if (!storeId) return {};
      const { data } = await (supabase as any).from("site_settings").select("*").eq("store_id", storeId);
      const map: Record<string, any> = {};
      data?.forEach((row) => {
        map[row.key] = row.value;
      });
      return map;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!storeId,
  });

  const exitIntent = siteSettings?.exit_intent || {};

  useEffect(() => {
    // Only run if enabled
    if (exitIntent.enabled === false) return;
    
    // Check if already shown in this session
    if (sessionStorage.getItem("exit_intent_shown")) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger when mouse moves up towards the address bar
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        setIsVisible(true);
        sessionStorage.setItem("exit_intent_shown", "true");
        // Remove listener after triggering
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    };

    // Add a slight delay before attaching the listener to avoid instant popups
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 3000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [exitIntent.enabled]);

  if (!isVisible || exitIntent.enabled === false) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exitIntent.discount_code || "WELCOME10");
    setCopied(true);
    toast.success("Discount code copied!");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={() => setIsVisible(false)}
      />
      <div className="fixed left-[50%] top-[50%] z-[111] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-4 animate-in zoom-in-95 fade-in duration-300">
        <div 
          className="relative flex flex-col md:flex-row overflow-hidden rounded-2xl border border-border shadow-2xl"
          style={{ backgroundColor: exitIntent.bg_color || "#101418" }}
        >
          {/* Close Button */}
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/20 text-white hover:bg-background/40 transition-colors backdrop-blur-md"
            aria-label="Close popup"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Left Side Image */}
          {exitIntent.image_url && (
            <div className="md:w-5/12 h-48 md:h-auto hidden md:block relative">
              <img 
                src={exitIntent.image_url} 
                alt="Special Offer" 
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50" />
            </div>
          )}

          {/* Content */}
          <div className={cn("flex flex-1 flex-col justify-center p-8 md:p-12 text-white", !exitIntent.image_url && "items-center text-center")}>
            <div className="mb-2 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/20">
              <span className="mr-2 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Limited Time Offer
            </div>
            
            <h2 className="mb-2 font-heading text-3xl md:text-4xl font-bold leading-tight">
              {exitIntent.title || "Wait! Don't leave empty handed."}
            </h2>
            
            <p className="mb-8 text-white/80">
              {exitIntent.offer_text || "Unlock 10% off your first order."}
            </p>

            <div className={cn("flex flex-col gap-4", !exitIntent.image_url && "w-full max-w-sm")}>
              <div className="flex items-center justify-between rounded-lg border border-dashed border-white/30 bg-white/5 p-4 backdrop-blur-sm">
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Use Code at Checkout</p>
                  <p className="font-mono text-2xl font-bold text-white tracking-widest">
                    {exitIntent.discount_code || "WELCOME10"}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-black hover:bg-white/90 transition-colors"
                  aria-label="Copy code"
                >
                  {copied ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>

              <button
                onClick={() => setIsVisible(false)}
                className="w-full rounded-md bg-primary px-4 py-4 font-heading text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(var(--primary),0.3)]"
              >
                Continue Shopping
              </button>
              
              <button 
                onClick={() => setIsVisible(false)}
                className="text-xs text-white/50 hover:text-white/80 transition-colors underline underline-offset-4"
              >
                No thanks, I prefer paying full price
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
