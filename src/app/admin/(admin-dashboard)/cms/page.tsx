"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import { Navigate } from "@/lib/react-router-dom-shim";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <Navigate to="/admin/page-builder" replace />
    </Suspense>
  );
}



