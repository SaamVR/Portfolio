import { Suspense } from "react";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import NotificationsCenterPage from "@/views/admin/NotificationsCenter";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<AdminRouteFallback label="Loading notifications" />}>
      <NotificationsCenterPage />
    </Suspense>
  );
}
