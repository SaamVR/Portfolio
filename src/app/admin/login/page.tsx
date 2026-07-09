"use client";

import React, { Suspense } from "react";
import PageComponent from "@/views/AdminLogin";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageComponent />
    </Suspense>
  );
}
