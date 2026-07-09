import { useEffect } from "react";
import { useLocation } from "@/lib/react-router-dom-shim";

/**
 * Instantly scrolls to the top of the page on every route change.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use instant scroll — smooth scroll is unreliable on mobile
    // and causes the "stuck on related products" issue.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
