"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AdminTabRouteGuard from "@/components/admin/AdminTabRouteGuard";
import PageComponent from "@/views/admin/Orders";

const ORDER_TABS = ["orders", "returns", "couriers"] as const;

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <AdminTabRouteGuard allowedTabs={ORDER_TABS} defaultTab="orders" fallbackLabel="Opening orders">
        <PageComponent />
      </AdminTabRouteGuard>
    </Suspense>
  );
}

