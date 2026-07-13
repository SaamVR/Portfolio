"use client";

import React, { Suspense } from "react";


import AdminLayout from "@/components/admin/AdminLayout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  );
}
