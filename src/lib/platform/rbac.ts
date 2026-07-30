export type PlatformRole =
  | "super_admin"
  | "admin"
  | "billing_admin"
  | "support_agent"
  | "co_admin"
  | null;

export interface PlatformRoleMetadata {
  key: NonNullable<PlatformRole>;
  label: string;
  description: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
}

export const PLATFORM_ROLES: PlatformRoleMetadata[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Full platform access: modify feature matrix, delete stores, change plan prices, and manage system roles.",
    badgeVariant: "default",
  },
  {
    key: "admin",
    label: "Super Admin (Legacy)",
    description: "Full administrative access across the platform.",
    badgeVariant: "default",
  },
  {
    key: "billing_admin",
    label: "Billing Admin",
    description: "Approve/reject manual bKash invoices and monitor SaaS revenue and subscription metrics.",
    badgeVariant: "secondary",
  },
  {
    key: "support_agent",
    label: "Support Agent",
    description: "Inspect store health, send lifecycle reminders, and impersonate merchants. Cannot modify pricing or delete stores.",
    badgeVariant: "outline",
  },
];

export interface PlatformPermissions {
  isPlatformUser: boolean;
  isSuperAdmin: boolean;
  isBillingAdmin: boolean;
  isSupportAgent: boolean;
  roleLabel: string;

  canAccessControlPlane: boolean;
  canViewOverview: boolean;
  canViewAnalytics: boolean;
  canViewRevenue: boolean;
  canViewMerchants: boolean;
  canImpersonateMerchant: boolean;
  canDeleteStore: boolean;
  canDeleteStores: boolean;
  canManagePlans: boolean;
  canManageSubscriptions: boolean;
  canModifyFeatureMatrix: boolean;
  canReviewInvoices: boolean;
  canReviewManualInvoices: boolean;
  canViewHealth: boolean;
  canTriggerLifecycle: boolean;
  canTriggerLifecycleActions: boolean;
  canViewAuditLogs: boolean;
  canGrantFeatureException: boolean;
  canManageBackups: boolean;
  canAssignPlatformRoles: boolean;
  canManageRoles: boolean;
}

export function isPlatformRole(role: PlatformRole): boolean {
  if (!role) return false;
  return ["super_admin", "admin", "billing_admin", "support_agent"].includes(role);
}

export function getPlatformPermissions(role: PlatformRole): PlatformPermissions {
  const isSuper = role === "super_admin" || role === "admin";
  const isBilling = role === "billing_admin";
  const isSupport = role === "support_agent";
  const isPlatformUser = isSuper || isBilling || isSupport;

  let roleLabel = "Merchant / User";
  if (isSuper) roleLabel = "Super Admin";
  else if (isBilling) roleLabel = "Billing Admin";
  else if (isSupport) roleLabel = "Support Agent";
  else if (role === "co_admin") roleLabel = "Co-Admin";

  return {
    isPlatformUser,
    isSuperAdmin: isSuper,
    isBillingAdmin: isBilling,
    isSupportAgent: isSupport,
    roleLabel,

    canAccessControlPlane: isPlatformUser,
    canViewOverview: isPlatformUser,
    canViewAnalytics: isPlatformUser,
    canViewRevenue: isSuper || isBilling,
    canViewMerchants: isPlatformUser,
    canImpersonateMerchant: isSuper || isSupport,
    canDeleteStore: isSuper,
    canDeleteStores: isSuper,
    canManagePlans: isSuper,
    canManageSubscriptions: isSuper || isBilling,
    canModifyFeatureMatrix: isSuper,
    canReviewInvoices: isSuper || isBilling,
    canReviewManualInvoices: isSuper || isBilling,
    canViewHealth: isPlatformUser,
    canTriggerLifecycle: isSuper || isSupport,
    canTriggerLifecycleActions: isSuper || isSupport,
    canViewAuditLogs: isPlatformUser,
    canGrantFeatureException: isSuper,
    canManageBackups: isSuper,
    canAssignPlatformRoles: isSuper,
    canManageRoles: isSuper,
  };
}
