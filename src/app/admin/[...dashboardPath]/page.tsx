import AdminDashboardCatchAllClient from "./AdminDashboardCatchAllClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ dashboardPath?: string[] }> }) {
  const { dashboardPath = [] } = await params;
  return <AdminDashboardCatchAllClient dashboardPath={dashboardPath} />;
}
