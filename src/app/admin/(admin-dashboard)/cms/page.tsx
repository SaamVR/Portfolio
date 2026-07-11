"use client";

import React, { Suspense } from "react";
import { Navigate } from "@/lib/react-router-dom-shim";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Navigate to="/admin/page-builder" replace />
    </Suspense>
  );
}

