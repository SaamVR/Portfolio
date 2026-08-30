"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import AdminDashboardLayoutClient from "@/app/admin/(admin-dashboard)/AdminDashboardLayoutClient";
import AdminRouteFallback from "@/components/admin/AdminRouteFallback";
import { AdminFeatureGate } from "@/components/admin/AdminFeatureGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/react-router-dom-shim";

const workspaceLoading = () => <AdminRouteFallback label="Loading workspace" />;

const MediaLibraryManager = dynamic(() => import("@/components/admin/MediaLibraryManager"), { loading: workspaceLoading });
const OnboardingWizard = dynamic(() => import("@/components/admin/OnboardingWizard"), { loading: workspaceLoading });
const StoreBackupManager = dynamic(() => import("@/components/admin/StoreBackupManager"), { loading: workspaceLoading });
const Billing = dynamic(() => import("@/views/admin/Billing"), { loading: workspaceLoading });
const AnalyticsPage = dynamic(() => import("@/views/admin/Analytics"), { loading: workspaceLoading });
const LaunchReadinessPage = dynamic(() => import("@/views/admin/LaunchReadiness"), { loading: workspaceLoading });
const NotificationsCenterPage = dynamic(() => import("@/views/admin/NotificationsCenter"), { loading: workspaceLoading });
const OperationsDiagnosticsPage = dynamic(() => import("@/views/admin/OperationsDiagnostics"), { loading: workspaceLoading });
const CouriersPluginManager = dynamic(() => import("@/views/admin/CouriersPluginManager"), { loading: workspaceLoading });
const BlogManager = dynamic(() => import("@/views/admin/BlogManager"), { loading: workspaceLoading });
const BlogPerformance = dynamic(() => import("@/views/admin/BlogPerformance"), { loading: workspaceLoading });
const QrCodeGeneratorPage = dynamic(() => import("@/views/admin/QrCodeGenerator"), { loading: workspaceLoading });
const CartRecoveryPage = dynamic(() => import("@/views/admin/CartRecovery"), { loading: workspaceLoading });
const Categories = dynamic(() => import("@/views/admin/Categories"), { loading: workspaceLoading });
const Coupons = dynamic(() => import("@/views/admin/Coupons"), { loading: workspaceLoading });
const InviteCodes = dynamic(() => import("@/views/admin/InviteCodes"), { loading: workspaceLoading });
const Messages = dynamic(() => import("@/views/admin/Messages"), { loading: workspaceLoading });
const Orders = dynamic(() => import("@/views/admin/Orders"), { loading: workspaceLoading });
const PlatformControlPlane = dynamic(() => import("@/views/admin/PlatformControlPlane"), { loading: workspaceLoading });
const Products = dynamic(() => import("@/views/admin/Products"), { loading: workspaceLoading });
const ReturnsOperationsPage = dynamic(() => import("@/views/admin/ReturnsOperations"), { loading: workspaceLoading });
const Reviews = dynamic(() => import("@/views/admin/Reviews"), { loading: workspaceLoading });
const SiteSettings = dynamic(() => import("@/views/admin/SiteSettings"), { loading: workspaceLoading });
const Users = dynamic(() => import("@/views/admin/Users"), { loading: workspaceLoading });
const OnlineStoreHub = dynamic(() => import("@/views/admin/OnlineStoreHub"), { loading: workspaceLoading });
const SiteGuideView = dynamic(() => import("@/views/admin/SiteGuideView"), { loading: workspaceLoading });

class AdminWorkspaceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" aria-live="assertive">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Workspace failed to load</CardTitle>
            <CardDescription>
              The admin workspace could not finish loading. This can happen after a connection interruption or when a cached route chunk is stale.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => window.location.reload()}>
              Retry workspace
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

function AdminDashboardRoute({ route }: { route: string }) {
  switch (route) {
    case "online-store":
      return (
        <AdminFeatureGate
          featureKey="cms_pages"
          title="Online Store"
          description="This store package does not currently include the storefront visual editor or page manager."
        >
          <OnlineStoreHub />
        </AdminFeatureGate>
      );
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
    case "analytics":
      return <AnalyticsPage />;
    case "blog":
      return <BlogManager />;
    case "blog-performance":
      return <BlogPerformance />;
    case "launch":
      return <LaunchReadinessPage />;
    case "categories":
      return <Categories />;
    case "cms":
    case "page-builder":
      return (
        <AdminFeatureGate
          featureKey="cms_pages"
          title="Online Store"
          description="This store package does not currently include the storefront page builder."
        >
          <OnlineStoreHub />
        </AdminFeatureGate>
      );
    case "marketing":
    case "coupons":
      return <Coupons />;
    case "invite-codes":
      return (
        <AdminFeatureGate
          featureKey="staff_management"
          title="Team Access"
          description="This store package does not currently include staff invitations and seat management."
        >
          <InviteCodes />
        </AdminFeatureGate>
      );
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
    case "customers":
    case "messages":
      return <Messages />;
    case "notifications":
      return <NotificationsCenterPage />;
    case "onboarding":
      return <OnboardingWizard />;
    case "orders":
      return <Orders />;
    case "returns":
      return <ReturnsOperationsPage />;
    case "qr":
      return <QrCodeGeneratorPage />;
    case "recovery":
      return <CartRecoveryPage />;
    case "diagnostics":
      return <OperationsDiagnosticsPage />;
    case "couriers":
      return <CouriersPluginManager />;
    case "platform":
      return <PlatformControlPlane />;
    case "products":
      return <Products />;
    case "reviews":
      return <Reviews />;
    case "site-settings":
      return <SiteSettings />;
    case "guide":
    case "help":
    case "how-to":
      return <SiteGuideView />;
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
      <AdminWorkspaceErrorBoundary key={route}>
        <Suspense fallback={<AdminRouteFallback label="Loading workspace" />}>
          <AdminDashboardRoute route={route} />
        </Suspense>
      </AdminWorkspaceErrorBoundary>
    </AdminDashboardLayoutClient>
  );
}
