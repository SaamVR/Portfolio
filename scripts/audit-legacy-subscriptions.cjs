const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

for (const file of [".env.local", ".env"]) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;

  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function getEffectiveStatus(subscription, now = new Date()) {
  const status = subscription?.status ?? null;
  if (subscription?.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at);
    if (!Number.isNaN(trialEnd.getTime())) {
      if (trialEnd.getTime() >= now.getTime() && status !== "active" && status !== "cancelled") {
        return "trialing";
      }
      if (status === "trialing" && trialEnd.getTime() < now.getTime()) {
        return "past_due";
      }
    }
  }
  return status;
}

(async () => {
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id,name,slug,plan,is_published,created_at")
    .neq("plan", "free")
    .order("created_at", { ascending: true })
    .limit(5000);

  if (storesError) throw storesError;

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("store_subscriptions")
    .select("store_id,plan_id,status,trial_ends_at,current_period_ends_at,updated_at");

  if (subscriptionsError) throw subscriptionsError;

  const subscriptionMap = new Map((subscriptions ?? []).map((item) => [item.store_id, item]));
  const mismatches = [];

  for (const store of stores ?? []) {
    const subscription = subscriptionMap.get(store.id) ?? null;
    const effectiveStatus = getEffectiveStatus(subscription);
    const live = effectiveStatus === "active" || effectiveStatus === "trialing";

    if (!subscription || !live || subscription.plan_id !== store.plan) {
      mismatches.push({
        store_id: store.id,
        name: store.name,
        slug: store.slug,
        store_plan: store.plan,
        sub_plan: subscription?.plan_id ?? null,
        sub_status: subscription?.status ?? null,
        effective_status: effectiveStatus,
        trial_ends_at: subscription?.trial_ends_at ?? null,
        current_period_ends_at: subscription?.current_period_ends_at ?? null,
        updated_at: subscription?.updated_at ?? null,
        is_published: store.is_published,
        created_at: store.created_at,
      });
    }
  }

  console.log(JSON.stringify({
    audited_at: new Date().toISOString(),
    total_paid_plan_stores: stores?.length ?? 0,
    mismatches: mismatches.length,
    results: mismatches,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
