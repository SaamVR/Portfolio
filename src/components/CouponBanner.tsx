"use client";

import { useCart } from "@/context/useCart";
import { Tag, X } from "lucide-react";
import { useState } from "react";

export function CouponBanner() {
  const { couponCode, setCouponCode } = useCart();
  const [dismissed, setDismissed] = useState(false);

  if (!couponCode || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleRemove = () => {
    setCouponCode(null);
    setDismissed(true);
  };

  return (
    <div className="relative z-40 border-b border-primary/20 bg-primary/10 px-4 py-2.5 text-primary transition-all">
      <div className="container mx-auto flex items-center justify-between gap-3 text-sm font-medium">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Coupon <strong className="font-mono font-bold tracking-wide">{couponCode}</strong> applied
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-semibold underline hover:no-underline text-muted-foreground hover:text-foreground"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss coupon banner"
            className="rounded p-1 hover:bg-primary/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
