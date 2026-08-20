"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";

export default function AdminTabRouteGuard({
  allowedTabs,
  defaultTab,
  fallbackLabel,
  children,
}: {
  allowedTabs: readonly string[];
  defaultTab: string;
  fallbackLabel: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const hasInvalidTab = Boolean(requestedTab && !allowedTabs.includes(requestedTab));

  useEffect(() => {
    if (!hasInvalidTab) return;

    const nextParams = new URLSearchParams(Array.from(searchParams.entries()));
    nextParams.set("tab", defaultTab);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [defaultTab, hasInvalidTab, pathname, router, searchParams]);

  if (hasInvalidTab) {
    return <AdminRouteFallback label={fallbackLabel} />;
  }

  return children;
}
