"use client";

import React, { Suspense } from "react";
import PlatformControlPlane from "@/views/admin/PlatformControlPlane";
import PlatformOperationsHub from "@/components/admin/PlatformOperationsHub";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading CMS control" />}>
      <div className="space-y-6">
        <PlatformOperationsHub />
        <PlatformControlPlane />
      </div>
    </Suspense>
  );
}
