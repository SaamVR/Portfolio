"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AnalyticsPage from "@/views/admin/Analytics";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading analytics" />}>
      <AnalyticsPage />
    </Suspense>
  );
}
