"use client";

import React, { Suspense } from "react";
import PaymentCallback from "@/views/PaymentCallback";

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCallback />
    </Suspense>
  );
}
