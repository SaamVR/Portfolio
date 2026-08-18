"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import AdminLoginEntry from "@/views/AdminLoginEntry";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <AdminLoginEntry />
    </Suspense>
  );
}
