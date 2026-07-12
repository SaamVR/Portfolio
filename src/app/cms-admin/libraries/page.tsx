"use client";

import React, { Suspense } from "react";
import CmsLibraryManager from "@/views/admin/CmsLibraryManager";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CmsLibraryManager />
    </Suspense>
  );
}
