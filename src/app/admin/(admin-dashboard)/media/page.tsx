"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import MediaLibraryManager from "@/components/admin/MediaLibraryManager";
import { AdminFeatureGate } from "@/components/admin/AdminFeatureGate";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <AdminFeatureGate
        featureKey="media_library"
        title="Media Library"
        description="This store package does not currently include the reusable media library."
      >
        <MediaLibraryManager />
      </AdminFeatureGate>
    </Suspense>
  );
}


