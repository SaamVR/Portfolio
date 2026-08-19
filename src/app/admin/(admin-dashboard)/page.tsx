"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import MerchantDashboardHome from "@/components/admin/MerchantDashboardHome";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <MerchantDashboardHome />
    </Suspense>
  );
}
