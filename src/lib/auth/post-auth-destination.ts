export type AuthEntryIntent = "auto" | "dashboard" | "merchant-signup" | "customer";
export type AuthDestinationKind = "platform" | "merchant" | "customer" | "unassigned";

export type CustomerStoreAccess = {
  storeId: string;
  slug: string;
  updatedAt?: string | null;
};

export type AuthIdentitySnapshot = {
  platformRole?: string | null;
  hasMerchantAccess: boolean;
  customerStores?: CustomerStoreAccess[];
};

export type AuthDestination = {
  kind: AuthDestinationKind;
  path: string;
  reason: string;
  storeId?: string | null;
  storeSlug?: string | null;
};

const CONTROL_PLANE_ROLES = new Set(["super_admin", "admin", "billing_admin", "support_agent"]);

export function parseAuthEntryIntent(value?: string | null): AuthEntryIntent {
  return value === "dashboard" || value === "merchant-signup" || value === "customer"
    ? value
    : "auto";
}

export function sanitizeInternalReturnPath(value?: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return null;
  }

  try {
    const base = new URL("https://ezcomo.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function matchesPathPrefix(path: string, prefix: string) {
  return path === prefix
    || path.startsWith(`${prefix}/`)
    || path.startsWith(`${prefix}?`)
    || path.startsWith(`${prefix}#`);
}

function isCmsAdminPath(path: string | null) {
  return Boolean(path && matchesPathPrefix(path, "/cms-admin"));
}

function isMerchantAdminPath(path: string | null) {
  if (!path || !matchesPathPrefix(path, "/admin")) return false;
  return !matchesPathPrefix(path, "/admin/login") && !matchesPathPrefix(path, "/admin/setup");
}

function isMerchantSignupPath(path: string | null) {
  return Boolean(
    path
      && (matchesPathPrefix(path, "/signup") || matchesPathPrefix(path, "/merchant-signup")),
  );
}

function isCustomerPath(path: string | null) {
  if (!path) return false;
  const blockedPrefixes = [
    "/admin",
    "/cms-admin",
    "/signup",
    "/merchant-signup",
    "/api",
    "/auth/redirect",
  ];
  return !blockedPrefixes.some((prefix) => matchesPathPrefix(path, prefix));
}

function normalizeStoreSlug(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized) ? normalized : null;
}

function customerAccountPath(storeSlug?: string | null) {
  const normalized = normalizeStoreSlug(storeSlug);
  return normalized ? `/stores/${encodeURIComponent(normalized)}/account` : "/account";
}

function selectCustomerStore(stores: CustomerStoreAccess[], storeSlugHint?: string | null) {
  const normalizedHint = normalizeStoreSlug(storeSlugHint);
  if (normalizedHint) {
    const hinted = stores.find((store) => normalizeStoreSlug(store.slug) === normalizedHint);
    if (hinted) return hinted;
  }

  return [...stores].sort((left, right) => {
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return rightTime - leftTime;
  })[0] ?? null;
}

export function resolvePostAuthDestination(input: {
  identity: AuthIdentitySnapshot;
  intent?: AuthEntryIntent;
  requestedNext?: string | null;
  storeSlugHint?: string | null;
}): AuthDestination {
  const intent = input.intent ?? "auto";
  const nextPath = sanitizeInternalReturnPath(input.requestedNext);
  const platformRole = input.identity.platformRole ?? null;

  if (platformRole && CONTROL_PLANE_ROLES.has(platformRole)) {
    return {
      kind: "platform",
      path: isCmsAdminPath(nextPath) ? (nextPath as string) : "/cms-admin",
      reason: "platform-role",
    };
  }

  if (input.identity.hasMerchantAccess || platformRole === "co_admin") {
    return {
      kind: "merchant",
      path: isMerchantAdminPath(nextPath) ? (nextPath as string) : "/admin",
      reason: input.identity.hasMerchantAccess ? "store-access" : "legacy-co-admin",
    };
  }

  const customerStores = input.identity.customerStores ?? [];
  const customerStore = selectCustomerStore(customerStores, input.storeSlugHint);
  if (customerStore) {
    return {
      kind: "customer",
      path: isCustomerPath(nextPath) ? (nextPath as string) : customerAccountPath(customerStore.slug),
      reason: "customer-profile",
      storeId: customerStore.storeId,
      storeSlug: customerStore.slug,
    };
  }

  if (intent === "merchant-signup") {
    return {
      kind: "unassigned",
      path: isMerchantSignupPath(nextPath) ? (nextPath as string) : "/signup?entry=dashboard",
      reason: "merchant-onboarding",
    };
  }

  if (intent === "customer") {
    return {
      kind: "unassigned",
      path: isCustomerPath(nextPath) ? (nextPath as string) : customerAccountPath(input.storeSlugHint),
      reason: "customer-onboarding",
      storeSlug: normalizeStoreSlug(input.storeSlugHint),
    };
  }

  if (intent === "dashboard") {
    return {
      kind: "unassigned",
      path: "/admin/login?mode=invite&signedIn=1",
      reason: "dashboard-access-unassigned",
    };
  }

  return {
    kind: "unassigned",
    path: "/",
    reason: "unassigned",
  };
}
