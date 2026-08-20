"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AdminTabRouteGuard from "@/components/admin/AdminTabRouteGuard";
import PageComponent from "@/views/admin/Products";

const PRODUCT_TABS = ["catalog", "categories"] as const;

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <AdminTabRouteGuard allowedTabs={PRODUCT_TABS} defaultTab="catalog" fallbackLabel="Opening products">
        <PageComponent />
      </AdminTabRouteGuard>
    </Suspense>
  );
}

