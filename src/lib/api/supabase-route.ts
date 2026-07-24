import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

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
  const [{ data: store }, { data: membership }, { data: platformRole }] = await Promise.all([
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
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
  ]);

  if (platformRole?.role === "admin") {
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
