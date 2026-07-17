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

type BlueprintRecord = {
  id: string;
  business_family: string | null;
  catalog_mode: string | null;
  store_description: string | null;
  default_theme: Record<string, unknown> | null;
  default_site_settings: Record<string, unknown> | null;
};

type OwnerMembershipRecord = {
  store_id: string;
};

type OwnedStoreRecord = {
  id: string;
};

type StoreSubscriptionRecord = {
  store_id: string;
  plan_id: string | null;
  status: string | null;
  trial_ends_at?: string | null;
};

type StorePlanRecord = {
  id: string;
  monthly_price: number | null;
  store_limit: number | null;
  trial_days?: number | null;
  contact_only?: boolean | null;
};

type ThemePackageRecord = {
  id: string;
  version?: number | null;
  preset_id: string | null;
  mode: "light" | "dark" | null;
  custom_css?: string | null;
  tokens: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
    typography?: {
      headingFont?: string;
      bodyFont?: string;
    };
    components?: {
      borderRadius?: string;
    };
  } | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildThemeSeed(
  defaultTheme: Record<string, unknown> | null,
  themePackage: ThemePackageRecord | null,
) {
  const mode = defaultTheme?.mode === "light" ? "light" : "dark";
  const typography = isPlainObject(themePackage?.tokens?.typography)
    ? themePackage?.tokens?.typography
    : {};
  const components = isPlainObject(themePackage?.tokens?.components)
    ? themePackage?.tokens?.components
    : {};
  const resolvedTokens = mode === "light"
    ? themePackage?.tokens?.light ?? {}
    : themePackage?.tokens?.dark ?? {};

  return {
    preset_id: typeof defaultTheme?.presetId === "string"
      ? defaultTheme.presetId
      : (themePackage?.preset_id ?? themePackage?.id ?? "default"),
    theme_package_id: themePackage?.id ?? null,
    theme_package_version: typeof themePackage?.version === "number" ? themePackage.version : null,
    mode,
    typography: {
      headingFont: typeof defaultTheme?.headingFont === "string"
        ? defaultTheme.headingFont
        : (typeof typography.headingFont === "string" ? typography.headingFont : null),
      bodyFont: typeof defaultTheme?.bodyFont === "string"
        ? defaultTheme.bodyFont
        : (typeof typography.bodyFont === "string" ? typography.bodyFont : null),
    },
    components: {
      borderRadius: typeof defaultTheme?.borderRadius === "string"
        ? defaultTheme.borderRadius
        : (typeof components.borderRadius === "string" ? components.borderRadius : null),
    },
    colors: resolvedTokens,
    resolved_tokens: {
      light: themePackage?.tokens?.light ?? {},
      dark: themePackage?.tokens?.dark ?? {},
    },
    custom_css: typeof themePackage?.custom_css === "string" ? themePackage.custom_css : null,
  };
}

function buildSiteSettingRows(storeId: string, defaultSiteSettings: Record<string, unknown> | null) {
  if (!isPlainObject(defaultSiteSettings)) {
    return [];
  }

  return Object.entries(defaultSiteSettings)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      store_id: storeId,
      key,
      value: value ?? {},
    }));
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
    const businessType = String(payload.business_type ?? "general-catalog").trim() || "general-catalog";
    const requestedPlanId = String(payload.plan_id ?? "").trim();
    const sourceStoreId = String(payload.source_store_id ?? "").trim();
    const intent = String(payload.intent ?? "").trim();
    const isAdditionalStoreFlow = intent === "new-store";

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

    const [
      { data: existingStoreBySlug },
      { data: ownedStores },
      { data: ownerMemberships },
      { data: blueprintRecord },
    ] = await Promise.all([
      supabaseAdmin.from("stores").select("id").eq("slug", storeSlug).maybeSingle(),
      supabaseAdmin.from("stores").select("id").eq("owner_id", user.id),
      supabaseAdmin.from("store_memberships").select("store_id").eq("user_id", user.id).eq("role", "owner"),
      supabaseAdmin
        .from("store_blueprints")
        .select("id, business_family, catalog_mode, store_description, default_theme, default_site_settings")
        .eq("id", businessType)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (existingStoreBySlug) {
      return new Response(JSON.stringify({ error: "That store slug is already taken" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blueprint = (blueprintRecord as BlueprintRecord | null) ?? null;
    const resolvedBusinessType = blueprint?.id ?? "general-catalog";
    const defaultTheme = isPlainObject(blueprint?.default_theme) ? blueprint.default_theme : null;
    const defaultSiteSettings = isPlainObject(blueprint?.default_site_settings) ? blueprint.default_site_settings : null;
    const defaultThemePresetId = typeof defaultTheme?.presetId === "string" ? defaultTheme.presetId : null;
    const { data: themePackageRecord } = defaultThemePresetId
      ? await supabaseAdmin
        .from("theme_packages")
        .select("id, version, preset_id, mode, tokens, custom_css")
        .or(`id.eq.${defaultThemePresetId},preset_id.eq.${defaultThemePresetId},slug.eq.${defaultThemePresetId}`)
        .limit(1)
        .maybeSingle()
      : { data: null };
    const themeSeed = buildThemeSeed(defaultTheme, (themePackageRecord as ThemePackageRecord | null) ?? null);

    if (existingPlan?.contact_only) {
      return new Response(JSON.stringify({ error: "This plan is activated through support. Please contact support to continue." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownedStoreIds = Array.from(new Set([
      ...(((ownedStores as OwnedStoreRecord[] | null) ?? []).map((row) => row.id).filter(Boolean)),
      ...(((ownerMemberships as OwnerMembershipRecord[] | null) ?? []).map((row) => row.store_id).filter(Boolean)),
    ]));

    const requestedPlan = !isAdditionalStoreFlow && requestedPlanId
      ? await supabaseAdmin
        .from("cms_plans")
        .select("id, name, monthly_price, store_limit, trial_days, contact_only")
        .eq("id", requestedPlanId)
        .eq("is_active", true)
        .maybeSingle()
      : { data: null };

    let inheritedPlanId = requestedPlan.data?.id ?? null;
    let inheritedPlanRecord = (requestedPlan.data as StorePlanRecord | null) ?? null;
    let inheritedTrialEndsAt: string | null = null;

    if (ownedStoreIds.length > 0) {
      const { data: ownedSubscriptions } = await supabaseAdmin
        .from("store_subscriptions")
        .select("store_id, plan_id, status, trial_ends_at")
        .in("store_id", ownedStoreIds);

      const activePaidSubscriptions = ((ownedSubscriptions as StoreSubscriptionRecord[] | null) ?? []).filter(
        (row) => row.status === "active" && typeof row.plan_id === "string" && row.plan_id.length > 0,
      );

      const activeOrTrialSubscriptions = ((ownedSubscriptions as StoreSubscriptionRecord[] | null) ?? []).filter(
        (row) => (row.status === "active" || row.status === "trialing") && typeof row.plan_id === "string" && row.plan_id.length > 0,
      );

      if (isAdditionalStoreFlow) {
        if (sourceStoreId && !ownedStoreIds.includes(sourceStoreId)) {
          return new Response(JSON.stringify({ error: "The selected source store does not belong to your account." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const preferredSubscription = sourceStoreId
          ? activeOrTrialSubscriptions.find((row) => row.store_id === sourceStoreId)
          : activeOrTrialSubscriptions[0];

        inheritedPlanId = preferredSubscription?.plan_id ?? inheritedPlanId;
        inheritedTrialEndsAt = preferredSubscription?.status === "trialing"
          ? (preferredSubscription.trial_ends_at ?? null)
          : null;
      }

      if (activePaidSubscriptions.length === 0) {
        return new Response(JSON.stringify({
          error: "Trial accounts can create only one store. Complete payment on your first store to unlock the rest of your plan capacity.",
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const activePlanIds = Array.from(new Set(activePaidSubscriptions.map((row) => row.plan_id).filter(Boolean))) as string[];
      const { data: activePlans } = activePlanIds.length > 0
        ? await supabaseAdmin.from("cms_plans").select("id, name, store_limit, monthly_price, trial_days, contact_only").in("id", activePlanIds)
        : { data: [] };

      if (isAdditionalStoreFlow && inheritedPlanId) {
        inheritedPlanRecord = ((activePlans as StorePlanRecord[] | null) ?? []).find((plan) => plan.id === inheritedPlanId) ?? inheritedPlanRecord;
      }

      const maxAllowedStores = ((activePlans as StorePlanRecord[] | null) ?? []).reduce<number>((max, plan) => {
        if (plan.store_limit === null) {
          return Number.POSITIVE_INFINITY;
        }
        const limit = Math.max(0, Number(plan.store_limit ?? 0) || 0);
        return Math.max(max, limit);
      }, 0);

      if (Number.isFinite(maxAllowedStores) && ownedStoreIds.length >= maxAllowedStores) {
        return new Response(JSON.stringify({
          error: `Your active package allows up to ${maxAllowedStores} store${maxAllowedStores === 1 ? "" : "s"}. Upgrade or contact support to unlock more.`,
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const effectivePlan = inheritedPlanRecord;
    if (effectivePlan?.contact_only) {
      return new Response(JSON.stringify({ error: "This plan is activated through support. Please contact support to continue." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPlanId = effectivePlan?.id ?? (isAdditionalStoreFlow ? "basic" : requestedPlanId || "basic");
    const trialLengthDays = Math.max(0, Number(effectivePlan?.trial_days ?? 14) || 14);
    const trialEndsAt = inheritedTrialEndsAt ?? new Date(Date.now() + trialLengthDays * 24 * 60 * 60 * 1000).toISOString();
    const planRequiresPayment = false;
    const subscriptionStatus = inheritedTrialEndsAt ? "trialing" : "trialing";

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .insert({
        owner_id: user.id,
        name: storeName,
        slug: storeSlug,
        description: blueprint?.store_description ?? `${storeName} storefront powered by EZComo.`,
        currency_code: "BDT",
        locale: "en-BD",
        plan: finalPlanId,
        store_type: resolvedBusinessType,
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

    const siteSettingRows = buildSiteSettingRows(store.id, defaultSiteSettings);
    const [
      { error: membershipError },
      { error: subscriptionError },
      { error: leadError },
      { error: businessProfileError },
      { error: themeError },
      siteSettingsResult,
    ] = await Promise.all([
      supabaseAdmin.from("store_memberships").insert({
        store_id: store.id,
        user_id: user.id,
        role: "owner",
      }),
      supabaseAdmin.from("store_subscriptions").upsert({
        store_id: store.id,
        plan_id: finalPlanId,
        status: subscriptionStatus,
        trial_ends_at: trialEndsAt,
      }, { onConflict: "store_id" }),
      supabaseAdmin.from("cms_signup_leads").insert({
        email: user.email,
        name: ownerName || (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null),
        business_type: resolvedBusinessType,
        desired_plan: finalPlanId,
        status: "converted",
        metadata: { store_id: store.id, store_slug: store.slug, site_url: siteUrl || null },
      }),
      supabaseAdmin.from("store_business_profiles").upsert({
        store_id: store.id,
        blueprint_id: resolvedBusinessType,
        blueprint_version: 1,
        business_family: blueprint?.business_family ?? "commerce",
        catalog_mode: blueprint?.catalog_mode ?? "multi_product",
      }, { onConflict: "store_id" }),
      supabaseAdmin.from("store_themes").upsert({
        store_id: store.id,
        ...themeSeed,
      }, { onConflict: "store_id" }),
      siteSettingRows.length > 0
        ? supabaseAdmin.from("site_settings").upsert(siteSettingRows, { onConflict: "store_id,key" })
        : Promise.resolve({ error: null }),
    ]);

    if (membershipError || subscriptionError || businessProfileError || themeError || siteSettingsResult.error) {
      return new Response(JSON.stringify({
        error: "Store workspace was created but setup could not finish",
        details: membershipError?.message
          || subscriptionError?.message
          || businessProfileError?.message
          || themeError?.message
          || siteSettingsResult.error?.message,
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
