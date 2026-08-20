import { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import CouriersPluginManager from "@/views/admin/CouriersPluginManager";

export default function CouriersRoutePage() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading courier workspace" />}>
      <CouriersPluginManager />
    </Suspense>
  );
}
