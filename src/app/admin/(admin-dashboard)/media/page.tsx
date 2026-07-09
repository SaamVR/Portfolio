"use client";

import React, { Suspense } from "react";
import MediaLibraryManager from "@/components/admin/MediaLibraryManager";
import { AdminFeatureGate } from "@/components/admin/AdminFeatureGate";

export default function Page() {
  return (
    <Suspense fallback={null}>
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
