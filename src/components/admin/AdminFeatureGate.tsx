"use client";

import type { ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/react-router-dom-shim";
import AdminRecoveryPanel from "@/components/admin/AdminRecoveryPanel";

export function AdminFeatureGate({
  featureKey,
  title,
  description,
  children,
}: {
  featureKey: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { platformRole, activeStoreId, loading, authRecovery } = useAuth();
  const { data, isLoading } = useStoreEntitlements(activeStoreId);

  if (platformRole === "admin") {
    return <>{children}</>;
  }

  if (loading || isLoading) {
    return (
      <AdminRecoveryPanel
        title={title}
        description={
          authRecovery.reason === "offline"
            ? "The store package permissions cannot refresh while this device is offline."
            : authRecovery.reason === "permission_timeout"
              ? "The store package permission check took too long."
              : "The store package permissions are still being restored."
        }
        loadingLabel="Checking feature access for the active store."
        retryLabel="Refresh dashboard"
        onRetry={() => window.location.reload()}
        autoRetry
        statusHint={authRecovery.detail ?? undefined}
      />
    );
  }

  const enabled = getFeatureEnabled(data?.featureMap, featureKey, false);
  if (enabled) {
    return <>{children}</>;
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-4 w-4 text-primary" />
          {title} is not enabled for this store
        </CardTitle>
        <CardDescription>
          {description} Upgrade the store package or contact support if you need help choosing the right setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/admin/billing">View Packages</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/contact">Contact Support</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

