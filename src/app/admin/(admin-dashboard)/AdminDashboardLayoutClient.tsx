"use client";

import React, { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";

export default function AdminDashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading dashboard" fullScreen />}>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  );
}
