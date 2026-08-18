"use client";

import React, { Suspense } from "react";
import CmsAdminAccessEntry from "@/views/CmsAdminAccessEntry";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";

export default function CmsAdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading CMS admin" fullScreen />}>
      <CmsAdminAccessEntry>{children}</CmsAdminAccessEntry>
    </Suspense>
  );
}
