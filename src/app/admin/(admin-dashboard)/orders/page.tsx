"use client";

import React, { Suspense } from "react";
import PageComponent from "@/views/admin/Orders";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageComponent />
    </Suspense>
  );
}
