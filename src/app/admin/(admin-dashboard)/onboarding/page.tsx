"use client";

import React, { Suspense } from "react";
import OnboardingWizard from "@/components/admin/OnboardingWizard";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OnboardingWizard />
    </Suspense>
  );
}
