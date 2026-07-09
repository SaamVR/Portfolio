"use client";

import React, { Suspense } from "react";
import PlatformControlPlane from "@/views/admin/PlatformControlPlane";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PlatformControlPlane />
    </Suspense>
  );
}
