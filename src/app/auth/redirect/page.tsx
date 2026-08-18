"use client";

import React, { Suspense } from "react";
import AuthRedirect from "@/views/AuthRedirect";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthRedirect />
    </Suspense>
  );
}
