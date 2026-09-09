"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AdminDashboardRouteViewport({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const main = document.querySelector<HTMLElement>("main");
      main?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return <React.Fragment key={pathname}>{children}</React.Fragment>;
}
