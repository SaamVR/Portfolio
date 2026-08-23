import { useEffect } from "react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { storefrontPath } from "@/lib/slug";

interface GuestCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Compatibility shim for the old cart-drawer "instant checkout" entry point.
 *
 * Checkout used to be implemented twice: once in the canonical Checkout view
 * and again in this modal, including a separate direct bKash flow. Keeping two
 * order/payment engines made idempotency and gateway recovery diverge. The cart
 * drawer can keep its existing component contract while every purchase now
 * enters the single authoritative checkout/recovery path.
 */
export default function GuestCheckoutModal({ open, onOpenChange }: GuestCheckoutModalProps) {
  const currentStore = useOptionalStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    onOpenChange(false);
    navigate(storefrontPath("/checkout", currentStore?.slug));
  }, [currentStore?.slug, navigate, onOpenChange, open]);

  return null;
}
