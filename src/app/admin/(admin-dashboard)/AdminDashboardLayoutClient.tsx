"use client";

import React, { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminDashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  );
}
