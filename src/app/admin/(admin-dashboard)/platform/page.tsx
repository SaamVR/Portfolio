"use client";

import { Navigate } from "@/lib/react-router-dom-shim";

export default function Page() {
  return <Navigate to="/cms-admin" replace />;
}
