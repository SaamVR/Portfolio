"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import PageComponent from "@/views/admin/OnlineStoreHub";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading Online Store Hub" />}>
      <PageComponent />
    </Suspense>
  );
}
