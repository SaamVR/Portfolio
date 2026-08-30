"use client";

import Link from "next/link";
import React, { Suspense } from "react";
import MerchantSignupEntry from "@/views/MerchantSignupEntry";

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-muted/30 px-4 py-2.5 text-center text-xs leading-5 text-muted-foreground">
        Before paid beta, review the current <Link href="/terms" className="font-semibold text-primary">Terms</Link> and <Link href="/privacy" className="font-semibold text-primary">Privacy</Link> disclosures. Final owner/legal approval and the binding consent version are still pending.
      </div>
      <Suspense fallback={null}>
        <MerchantSignupEntry />
      </Suspense>
    </div>
  );
}
