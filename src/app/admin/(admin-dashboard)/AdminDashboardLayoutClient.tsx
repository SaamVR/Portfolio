"use client";

import React, { Suspense } from "react";
import AdminDashboardAccessEntry from "@/views/AdminDashboardAccessEntry";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AdminDashboardRouteViewport from "@/components/admin/AdminDashboardRouteViewport";

export default function AdminDashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading dashboard" fullScreen />}>
      <AdminDashboardAccessEntry>
        <AdminDashboardRouteViewport>{children}</AdminDashboardRouteViewport>
      </AdminDashboardAccessEntry>
    </Suspense>
  );
}
