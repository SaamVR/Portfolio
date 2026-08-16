import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { resolveStorePlanState, type SubscriptionRecordLike } from "@/lib/billing/plans";

const PLATFORM_ROLE_PRIORITY = ["admin", "super_admin", "billing_admin", "support_agent", "co_admin"] as const;
const FULL_STORE_ACCESS_PLATFORM_ROLES = new Set(["admin", "super_admin"]);

function resolvePlatformRole(rows: Array<{ role?: unknown }> | null | undefined) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  for (const candidate of PLATFORM_ROLE_PRIORITY) {
    const match = rows.find((row) => typeof row?.role === "string" && row.role === candidate);
    if (match) {
      return candidate;
    }
  }

  return null;
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseAdminClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function getSupabaseAuthClient() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!publishableKey) {
    throw new Error("Missing Supabase publishable key");
  }

  return createClient(getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"), publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getAuthenticatedUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return null;
  }

  const supabase = getSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function canManageStore(
  supabaseAdmin: SupabaseClient,
  storeId: string,
  userId: string,
  allowedStoreRoles: string[] = ["owner", "admin", "editor"],
) {
  const [{ data: store }, { data: membership }, { data: platformRoleRows }] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id, owner_id")
      .eq("id", storeId)
      .maybeSingle(),
    supabaseAdmin
      .from("store_memberships")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
  ]);

  const platformRole = resolvePlatformRole(platformRoleRows as Array<{ role?: unknown }> | null | undefined);

  // Only full platform administrators may bypass tenant membership. Other
  // control-plane roles (billing/support/co-admin) must still be the owner or
  // an explicitly allowed store member for merchant-facing store operations.
  if (platformRole && FULL_STORE_ACCESS_PLATFORM_ROLES.has(platformRole)) {
    return true;
  }

  if (store?.owner_id === userId) {
    return true;
  }

  return Boolean(membership?.role && allowedStoreRoles.includes(String(membership.role)));
}

interface StoreSubscriptionWriteInput {
  storeId: string;
  planId: string;
  status: "trialing" | "active" | "past_due" | "cancelled";
  provider?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodEndsAt?: string | null;
  trialEndsAt?: string | null;
}

type StorePlanStateRow = {
  plan?: string | null;
  is_published?: boolean | null;
  store_subscriptions?: Array<SubscriptionRecordLike> | SubscriptionRecordLike | null;
};

export async function loadStorePlanState(
  supabaseAdmin: SupabaseClient,
  storeId: string,
  options?: {
    includePublished?: boolean;
  },
) {
  const includePublished = options?.includePublished === true;
  const selection = includePublished
    ? "plan, is_published, store_subscriptions(plan_id, status, trial_ends_at, current_period_ends_at)"
    : "plan, store_subscriptions(plan_id, status, trial_ends_at, current_period_ends_at)";

  const { data, error } = await supabaseAdmin
    .from("stores")
    .select(selection)
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  const row = (data ?? null) as StorePlanStateRow | null;
  const rawSubscription = Array.isArray(row?.store_subscriptions)
    ? (row?.store_subscriptions[0] ?? null)
    : (row?.store_subscriptions ?? null);

  return {
    data: row
      ? {
          legacyPlanId: typeof row.plan === "string" ? row.plan : null,
          isPublished: includePublished ? row.is_published ?? null : null,
          subscription: rawSubscription,
          resolved: resolveStorePlanState({
            subscription: rawSubscription,
            legacyPlanId: typeof row.plan === "string" ? row.plan : null,
          }),
        }
      : null,
    error: null,
  };
}

export async function upsertStoreSubscription(
  supabaseAdmin: SupabaseClient,
  input: StoreSubscriptionWriteInput,
) {
  const {
    storeId,
    planId,
    status,
    provider = null,
    providerSubscriptionId = null,
    currentPeriodEndsAt = null,
    trialEndsAt = null,
  } = input;

  const subscriptionWrite = await supabaseAdmin.from("store_subscriptions").upsert(
    {
      store_id: storeId,
      plan_id: planId,
      status,
      provider,
      provider_subscription_id: providerSubscriptionId,
      current_period_ends_at: currentPeriodEndsAt,
      trial_ends_at: trialEndsAt,
    },
    { onConflict: "store_id" },
  );

  if (subscriptionWrite.error) {
    return subscriptionWrite;
  }

  const storePlanWrite = await supabaseAdmin
    .from("stores")
    .update({ plan: planId })
    .eq("id", storeId);

  if (storePlanWrite.error) {
    return storePlanWrite;
  }

  return subscriptionWrite;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
