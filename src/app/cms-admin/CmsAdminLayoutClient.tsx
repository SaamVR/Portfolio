"use client";

import React, { Suspense } from "react";
import CmsAdminLayout from "@/components/admin/CmsAdminLayout";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";

export default function CmsAdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading CMS admin" fullScreen />}>
      <CmsAdminLayout>{children}</CmsAdminLayout>
    </Suspense>
  );
}
