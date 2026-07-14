"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import OnboardingWizard from "@/components/admin/OnboardingWizard";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <OnboardingWizard />
    </Suspense>
  );
}


