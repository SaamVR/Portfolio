"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/react-router-dom-shim";

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
  const { platformRole , activeStoreId} = useAuth();
  const { data, isLoading } = useStoreEntitlements(activeStoreId);

  if (platformRole === "admin") {
    return <>{children}</>;
  }

  if (isLoading) {
    return null;
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
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/plans">View Packages</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

