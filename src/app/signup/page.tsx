"use client";

import React, { Suspense } from "react";
import MerchantSignupEntry from "@/views/MerchantSignupEntry";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MerchantSignupEntry />
    </Suspense>
  );
}
