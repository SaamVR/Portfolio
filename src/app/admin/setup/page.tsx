"use client";

import React, { Suspense } from "react";
import PageComponent from "@/views/AdminSetup";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageComponent />
    </Suspense>
  );
}
