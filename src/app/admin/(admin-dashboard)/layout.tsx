import React from "react";
import AdminDashboardLayoutClient from "./AdminDashboardLayoutClient";

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminDashboardLayoutClient>{children}</AdminDashboardLayoutClient>;
}
