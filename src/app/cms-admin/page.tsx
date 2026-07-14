"use client";

import React, { Suspense } from "react";
import PlatformControlPlane from "@/views/admin/PlatformControlPlane";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading CMS control" />}>
      <PlatformControlPlane />
    </Suspense>
  );
}
