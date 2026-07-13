import React from "react";
import CmsAdminLayoutClient from "./CmsAdminLayoutClient";

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CmsAdminLayoutClient>{children}</CmsAdminLayoutClient>;
}
