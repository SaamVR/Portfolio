"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import MerchantSetupJourney from "@/components/admin/MerchantSetupJourney";
import MerchantCommandCenter from "@/components/admin/MerchantCommandCenter";
import DashboardPage from "@/views/admin/Dashboard";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <div className="space-y-6">
        <MerchantSetupJourney />
        <MerchantCommandCenter />
        <DashboardPage />
      </div>
    </Suspense>
  );
}
