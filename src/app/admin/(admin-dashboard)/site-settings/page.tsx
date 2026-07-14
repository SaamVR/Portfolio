"use client";

import React, { Suspense } from "react";
import PageComponent from "@/views/admin/SiteSettings";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading site settings" />}>
      <PageComponent />
    </Suspense>
  );
}
