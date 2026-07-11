"use client";

import React, { Suspense } from "react";
import PageComponent from "@/views/admin/CmsPagesManager";
import { AdminFeatureGate } from "@/components/admin/AdminFeatureGate";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminFeatureGate
        featureKey="cms_pages"
        title="Page Builder"
        description="This store package does not currently include the storefront page builder."
      >
        <PageComponent />
      </AdminFeatureGate>
    </Suspense>
  );
}
