import { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import LaunchReadinessPage from "@/views/admin/LaunchReadiness";

export default function LaunchPage() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading launch readiness" />}>
      <LaunchReadinessPage />
    </Suspense>
  );
}
