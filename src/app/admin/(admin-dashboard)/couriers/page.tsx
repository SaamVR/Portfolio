import { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import CouriersPage from "@/views/admin/Couriers";

export default function CouriersRoutePage() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading courier workspace" />}>
      <CouriersPage />
    </Suspense>
  );
}
