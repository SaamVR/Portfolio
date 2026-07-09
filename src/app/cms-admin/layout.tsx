"use client";

import React, { Suspense } from "react";
import CmsAdminLayout from "@/components/admin/CmsAdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <CmsAdminLayout>{children}</CmsAdminLayout>
    </Suspense>
  );
}
