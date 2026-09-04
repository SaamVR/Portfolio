"use client";

import React, { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import BillingRenewalPreferences from "@/components/admin/BillingRenewalPreferences";
import PolicyConsentGate from "@/components/platform/PolicyConsentGate";
import PageComponent from "@/views/admin/Billing";

export default function Page() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
      <div className="space-y-6">
        <PolicyConsentGate context="billing" />
        <PageComponent />
        <div className="mx-auto max-w-5xl">
          <BillingRenewalPreferences />
        </div>
      </div>
    </Suspense>
  );
}
