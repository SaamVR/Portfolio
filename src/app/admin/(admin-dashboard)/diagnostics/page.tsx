import { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import OperationsDiagnosticsPage from "@/views/admin/OperationsDiagnostics";

export default function DiagnosticsPage() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading diagnostics" />}>
      <OperationsDiagnosticsPage />
    </Suspense>
  );
}
