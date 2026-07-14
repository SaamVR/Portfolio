"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import StoreBackupManager from "@/components/admin/StoreBackupManager";
import { AdminFeatureGate } from "@/components/admin/AdminFeatureGate";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <AdminFeatureGate
        featureKey="backup_import"
        title="Backup & Import"
        description="This store package does not currently include portability and backup tools."
      >
        <StoreBackupManager />
      </AdminFeatureGate>
    </Suspense>
  );
}


