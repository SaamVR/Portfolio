"use client";

import React, { Suspense } from "react";
import PageComponent from "@/views/ProductDetail";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageComponent />
    </Suspense>
  );
}
