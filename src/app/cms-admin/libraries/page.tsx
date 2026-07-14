"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import CmsLibraryManager from "@/views/admin/CmsLibraryManager";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <CmsLibraryManager />
    </Suspense>
  );
}


