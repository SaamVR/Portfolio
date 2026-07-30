import nextEnv from "@next/env";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const { loadEnvConfig } = nextEnv;
loadEnvConfig(repoRoot);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !publicKey || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL, a public Supabase key, or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const ownerClient = createClient(supabaseUrl, publicKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const userId = randomUUID();
const subscribedStoreId = randomUUID();
const unsubscribedStoreId = randomUUID();
const uniqueSuffix = randomUUID().replaceAll("-", "");
const email = `subscription-rls-${uniqueSuffix}@example.com`;
const password = `Rls-${uniqueSuffix}-Aa9!`;

function isPermissionDenied(error: PostgrestError | null) {
  return Boolean(
    error &&
      (error.code === "42501" ||
        /permission denied|row-level security/i.test(`${error.message} ${error.details ?? ""}`)),
  );
}

async function expectPermissionDenied(
  label: string,
  operation: PromiseLike<{ error: PostgrestError | null }>,
) {
  const { error } = await operation;
  if (!isPermissionDenied(error)) {
    throw new Error(
      `${label} was not rejected with a permission error${error ? ` (${error.code}: ${error.message})` : ""}.`,
    );
  }
  console.log(`PASS: owner JWT cannot ${label}`);
}

try {
  const { data: plans, error: plansError } = await admin
    .from("cms_plans")
    .select("id")
    .eq("is_active", true)
    .order("sort_order")
    .limit(2);
  if (plansError) throw plansError;
  if (!plans || plans.length < 2) {
    throw new Error("The live smoke test requires at least two active billing plans.");
  }

  const [currentPlan, upgradePlan] = plans;
  const { error: userError } = await admin.auth.admin.createUser({
    id: userId,
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw userError;

  const { error: storesError } = await admin.from("stores").insert([
    {
      id: subscribedStoreId,
      owner_id: userId,
      name: "Subscription owner JWT smoke",
      slug: `subscription-rls-${uniqueSuffix.slice(0, 16)}`,
      description: "Temporary store for subscription RLS verification.",
      currency_code: "BDT",
      locale: "en-BD",
      plan: currentPlan.id,
      store_type: "general",
      is_published: false,
    },
    {
      id: unsubscribedStoreId,
      owner_id: userId,
      name: "Subscription insert JWT smoke",
      slug: `subscription-insert-${uniqueSuffix.slice(0, 16)}`,
      description: "Temporary store for subscription INSERT verification.",
      currency_code: "BDT",
      locale: "en-BD",
      plan: currentPlan.id,
      store_type: "general",
      is_published: false,
    },
  ]);
  if (storesError) throw storesError;

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: subscriptionError } = await admin.from("store_subscriptions").insert({
    store_id: subscribedStoreId,
    plan_id: currentPlan.id,
    status: "active",
    current_period_ends_at: periodEnd,
    provider: "rls-smoke",
  });
  if (subscriptionError) throw subscriptionError;

  const { error: signInError } = await ownerClient.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const { data: readableSubscription, error: readError } = await ownerClient
    .from("store_subscriptions")
    .select("store_id, plan_id, status")
    .eq("store_id", subscribedStoreId)
    .maybeSingle();
  if (readError || readableSubscription?.store_id !== subscribedStoreId) {
    throw readError ?? new Error("Owner JWT could not read its scoped subscription.");
  }
  console.log("PASS: owner JWT can read its scoped subscription");

  await expectPermissionDenied(
    "self-upgrade",
    ownerClient
      .from("store_subscriptions")
      .update({ plan_id: upgradePlan.id })
      .eq("store_id", subscribedStoreId),
  );
  await expectPermissionDenied(
    "reactivate",
    ownerClient
      .from("store_subscriptions")
      .update({ status: "active" })
      .eq("store_id", subscribedStoreId),
  );
  await expectPermissionDenied(
    "extend a billing period",
    ownerClient
      .from("store_subscriptions")
      .update({ current_period_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() })
      .eq("store_id", subscribedStoreId),
  );
  await expectPermissionDenied(
    "create a subscription",
    ownerClient.from("store_subscriptions").insert({
      store_id: unsubscribedStoreId,
      plan_id: upgradePlan.id,
      status: "active",
    }),
  );
  await expectPermissionDenied(
    "delete a subscription",
    ownerClient.from("store_subscriptions").delete().eq("store_id", subscribedStoreId),
  );

  console.log("Subscription owner JWT smoke checks passed");
} finally {
  await ownerClient.auth.signOut();
  await admin.from("stores").delete().in("id", [subscribedStoreId, unsubscribedStoreId]);
  await admin.auth.admin.deleteUser(userId);
}
