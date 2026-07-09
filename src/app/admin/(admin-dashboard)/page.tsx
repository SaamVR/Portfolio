"use client";

import React, { Suspense } from "react";
import DashboardPage from "@/views/admin/Dashboard";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DashboardPage />
    </Suspense>
  );
}
