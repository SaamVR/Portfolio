import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface AnnouncementSettings {
  enabled: boolean;
  messages: string[];
  bg_color: string; // hex color
}

const DEFAULT_MESSAGES = [
  "Enjoy 5% Off with bKash",
  "Free Delivery on Orders Over ৳2000",
  "New Drop Shoulders Just Landed 🔥",
];

const AnnouncementBar = ({ onVisibilityChange }: { onVisibilityChange?: (visible: boolean) => void }) => {
  const { data: settings } = useSiteSettings<AnnouncementSettings>("announcement_bar");

  const enabled = settings?.enabled ?? true;
  const messages = settings?.messages?.filter(Boolean).length
    ? settings.messages.filter(Boolean)
    : DEFAULT_MESSAGES;
  const bgColor = settings?.bg_color ?? "";

  const [dismissed, setDismissed] = useState(() => 
    typeof window !== "undefined" ? sessionStorage.getItem("announcement-dismissed") === "true" : false
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const visible = enabled && !dismissed;

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  useEffect(() => {
    if (!visible || messages.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [visible, messages.length]);

  // Reset index if messages shrink
  useEffect(() => {
    setCurrentIndex((prev) => (prev >= messages.length ? 0 : prev));
  }, [messages.length]);

  if (!visible) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("announcement-dismissed", "true");
    setDismissed(true);
  };

  const inlineStyle = bgColor
    ? { backgroundColor: bgColor }
    : undefined;

  // Decide text color: white or dark based on luminance of the chosen color
  const textClass = bgColor ? getContrastTextClass(bgColor) : "text-primary-foreground";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex h-9 items-center justify-center announcement-shimmer"
      style={inlineStyle ?? { backgroundColor: "hsl(var(--primary))" }}
    >
      <p
        className={`text-xs font-medium tracking-wide transition-opacity duration-300 ${textClass} ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        {messages[currentIndex]}
      </p>
      <button
        onClick={handleDismiss}
        className={`absolute right-3 top-1/2 -translate-y-1/2 smooth-hover ${textClass} opacity-70 hover:opacity-100`}
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

/** Simple luminance check to choose white or dark text */
function getContrastTextClass(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "text-primary-foreground";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "text-gray-900" : "text-white";
}

export default AnnouncementBar;
