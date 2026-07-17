"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import { Navigate } from "@/lib/react-router-dom-shim";
import { buildPageBuilderPath } from "@/lib/admin-paths";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <Navigate to={buildPageBuilderPath("basic")} replace />
    </Suspense>
  );
}



