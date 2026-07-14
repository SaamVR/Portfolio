"use client";

import React, { Suspense } from "react";
import AdminDashboardLayoutClient from "@/app/admin/(admin-dashboard)/AdminDashboardLayoutClient";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import { AdminFeatureGate } from "@/components/admin/AdminFeatureGate";
import MediaLibraryManager from "@/components/admin/MediaLibraryManager";
import OnboardingWizard from "@/components/admin/OnboardingWizard";
import StoreBackupManager from "@/components/admin/StoreBackupManager";
import Billing from "@/views/admin/Billing";
import Categories from "@/views/admin/Categories";
import Coupons from "@/views/admin/Coupons";
import CmsPagesManager from "@/views/admin/CmsPagesManager";
import InviteCodes from "@/views/admin/InviteCodes";
import Messages from "@/views/admin/Messages";
import Orders from "@/views/admin/Orders";
import PlatformControlPlane from "@/views/admin/PlatformControlPlane";
import Products from "@/views/admin/Products";
import Reviews from "@/views/admin/Reviews";
import SiteSettings from "@/views/admin/SiteSettings";
import Users from "@/views/admin/Users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/react-router-dom-shim";

function AdminDashboardRoute({ route }: { route: string }) {
  switch (route) {
    case "backup":
      return (
        <AdminFeatureGate
          featureKey="backup_import"
          title="Store Backup"
          description="This store package does not currently include backup export and import tools."
        >
          <StoreBackupManager />
        </AdminFeatureGate>
      );
    case "billing":
      return <Billing />;
    case "categories":
      return <Categories />;
    case "cms":
    case "page-builder":
      return (
        <AdminFeatureGate
          featureKey="cms_pages"
          title="Page Builder"
          description="This store package does not currently include the storefront page builder."
        >
          <CmsPagesManager />
        </AdminFeatureGate>
      );
    case "coupons":
      return <Coupons />;
    case "invite-codes":
      return <InviteCodes />;
    case "media":
      return (
        <AdminFeatureGate
          featureKey="media_library"
          title="Media Library"
          description="This store package does not currently include the reusable media library."
        >
          <MediaLibraryManager />
        </AdminFeatureGate>
      );
    case "messages":
      return <Messages />;
    case "onboarding":
      return <OnboardingWizard />;
    case "orders":
      return <Orders />;
    case "platform":
      return <PlatformControlPlane />;
    case "products":
      return <Products />;
    case "reviews":
      return <Reviews />;
    case "site-settings":
      return <SiteSettings />;
    case "users":
      return <Users />;
    default:
      return (
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Admin page not found</CardTitle>
            <CardDescription>This admin screen is missing, unpublished, or moved.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/admin">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      );
  }
}

export default function AdminDashboardCatchAllClient({ dashboardPath }: { dashboardPath: string[] }) {
  const route = dashboardPath[0] ?? "";

  return (
    <AdminDashboardLayoutClient>
      <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
        <AdminDashboardRoute route={route} />
      </Suspense>
    </AdminDashboardLayoutClient>
  );
}
