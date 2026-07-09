import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "You must be signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const ownerName = String(payload.owner_name ?? "").trim();
    const siteUrl = String(payload.site_url ?? "").trim();
    const storeName = String(payload.store_name ?? "").trim();
    const requestedSlug = String(payload.store_slug ?? "").trim();
    const businessType = String(payload.business_type ?? "general").trim() || "general";
    const planId = String(payload.plan_id ?? "starter").trim() || "starter";

    if (!storeName) {
      return new Response(JSON.stringify({ error: "Store name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeSlug = slugify(requestedSlug || storeName);
    if (!storeSlug) {
      return new Response(JSON.stringify({ error: "A valid store slug is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: existingStoreBySlug }, { count: existingMembershipCount }, { data: existingPlan }, { data: recentStore }] = await Promise.all([
      supabaseAdmin.from("stores").select("id").eq("slug", storeSlug).maybeSingle(),
      supabaseAdmin.from("store_memberships").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "owner"),
      supabaseAdmin.from("cms_plans").select("id, monthly_price, store_limit").eq("id", planId).eq("is_active", true).maybeSingle(),
      supabaseAdmin.from("stores").select("created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (recentStore?.created_at) {
      const hoursSinceLastStore = (new Date().getTime() - new Date(recentStore.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastStore < 24) {
        return new Response(JSON.stringify({ error: "You can only create one store every 24 hours." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (existingStoreBySlug) {
      return new Response(JSON.stringify({ error: "That store slug is already taken" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeLimit = existingPlan?.store_limit === null ? Infinity : (existingPlan?.store_limit ?? 1);
    if (existingMembershipCount !== null && existingMembershipCount >= storeLimit) {
      return new Response(JSON.stringify({ error: `Your selected plan allows a maximum of ${storeLimit} store(s). Please select a higher tier to create more.` }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPlanId = existingPlan?.id ?? "starter";
    const planRequiresPayment = finalPlanId !== "starter" && existingPlan?.monthly_price !== 0;
    const subscriptionStatus = planRequiresPayment ? "past_due" : "active";

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .insert({
        owner_id: user.id,
        name: storeName,
        slug: storeSlug,
        description: `${storeName} storefront powered by Commerce Engine.`,
        currency_code: "BDT",
        locale: "en-BD",
        plan: finalPlanId,
        store_type: businessType,
        is_published: false,
      })
      .select("id, slug, name")
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Failed to create store workspace", details: storeError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ error: membershipError }, { error: subscriptionError }, { error: leadError }] = await Promise.all([
      supabaseAdmin.from("store_memberships").insert({
        store_id: store.id,
        user_id: user.id,
        role: "owner",
      }),
      supabaseAdmin.from("store_subscriptions").upsert({
        store_id: store.id,
        plan_id: finalPlanId,
        status: subscriptionStatus,
        trial_ends_at: null,
      }, { onConflict: "store_id" }),
      supabaseAdmin.from("cms_signup_leads").insert({
        email: user.email,
        name: ownerName || (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null),
        business_type: businessType,
        desired_plan: finalPlanId,
        status: "converted",
        metadata: { store_id: store.id, store_slug: store.slug, site_url: siteUrl || null },
      }),
    ]);

    if (membershipError || subscriptionError) {
      return new Response(JSON.stringify({
        error: "Store workspace was created but setup could not finish",
        details: membershipError?.message || subscriptionError?.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (leadError) {
      console.warn("merchant-signup lead insert failed:", leadError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      store_id: store.id,
      store_slug: store.slug,
      dashboard_path: `/admin/onboarding?storeId=${store.id}`,
      payment_required: planRequiresPayment,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("merchant-signup unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
