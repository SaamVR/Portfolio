import { useState, useEffect } from "react";
import { X } from "lucide-react";

const messages = [
  "Free Delivery on Orders Over ৳2000",
  "New Drop Shoulders Just Landed 🔥",
  "Pay with bKash for 5% Off",
];

const AnnouncementBar = ({ onVisibilityChange }: { onVisibilityChange?: (visible: boolean) => void }) => {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("announcement-dismissed") === "true");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    onVisibilityChange?.(!dismissed);
  }, [dismissed, onVisibilityChange]);

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("announcement-dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex h-9 items-center justify-center bg-primary announcement-shimmer">
      <p
        className={`text-xs font-medium tracking-wide text-primary-foreground transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        {messages[currentIndex]}
      </p>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/70 hover:text-primary-foreground smooth-hover"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default AnnouncementBar;
