"use client";

import React, { Suspense } from "react";
import { AdminFeatureGate } from "@/components/admin/AdminFeatureGate";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import SectionStylesWorkspace from "@/views/admin/SectionStylesWorkspace";

export default function SectionStylesPage() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading Section Styles" />}>
      <AdminFeatureGate
        featureKey="cms_pages"
        title="Section Styles"
        description="This store package does not currently include storefront section styling."
      >
        <SectionStylesWorkspace />
      </AdminFeatureGate>
    </Suspense>
  );
}
