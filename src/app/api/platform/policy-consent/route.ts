import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { normalizeCountryCode, normalizeCountryRegionCode } from "@/lib/platform/jurisdiction";
import { PAID_BETA_POLICY_VERSION } from "@/lib/platform/public-policy";

const DOCUMENT_PATHS = ["/terms", "/privacy", "/billing-policy"] as const;
const ACCEPTANCE_CONTEXTS = new Set(["merchant_signup", "billing", "policy_update"]);

export const policyConsentRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  now: () => new Date(),
};

type PolicyConfig = {
  policy_version: string;
  binding: boolean;
  acceptance_text: string;
  effective_at: string | null;
};

type EnforcementConfig = {
  country_enforcement_enabled: boolean;
};

type MerchantLegalProfile = {
  business_country_code: string;
  legal_regime: string;
  geo_hint_country_code: string | null;
  geo_hint_region_code: string | null;
};

type JurisdictionRule = {
  merchant_contract_acceptance_required: boolean;
  privacy_acknowledgement_required: boolean;
};

function isBindingActive(config: PolicyConfig, now: Date) {
  if (!config.binding || !config.effective_at) return false;
  const effectiveAt = new Date(config.effective_at);
  return Number.isFinite(effectiveAt.getTime()) && effectiveAt.getTime() <= now.getTime();
}

function contextFromRequest(req: Request) {
  const value = new URL(req.url).searchParams.get("context")?.trim() ?? "";
  return ACCEPTANCE_CONTEXTS.has(value) ? value : null;
}

function readGeoHint(req: Request) {
  return {
    countryCode: normalizeCountryCode(req.headers.get("x-vercel-ip-country")),
    regionCode: normalizeCountryRegionCode(req.headers.get("x-vercel-ip-country-region")),
  };
}

function requiresAcceptance(rule: JurisdictionRule | null) {
  if (!rule) return true;
  return rule.merchant_contract_acceptance_required || rule.privacy_acknowledgement_required;
}

async function loadPolicyConfig(supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>) {
  return supabaseAdmin
    .from("platform_policy_config")
    .select("policy_version, binding, acceptance_text, effective_at")
    .eq("singleton", true)
    .maybeSingle();
}

async function loadEnforcementConfig(supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>) {
  return supabaseAdmin
    .from("platform_jurisdiction_enforcement_config")
    .select("country_enforcement_enabled")
    .eq("singleton", true)
    .maybeSingle();
}

async function loadMerchantProfile(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
) {
  return supabaseAdmin
    .from("merchant_legal_profiles")
    .select("business_country_code, legal_regime, geo_hint_country_code, geo_hint_region_code")
    .eq("user_id", userId)
    .maybeSingle();
}

async function loadJurisdictionRule(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  legalRegime: string,
) {
  return supabaseAdmin
    .from("platform_jurisdiction_rules")
    .select("merchant_contract_acceptance_required, privacy_acknowledgement_required")
    .eq("legal_regime", legalRegime)
    .maybeSingle();
}

async function loadAcceptance(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  policyVersion: string,
  countryCode: string,
  legalRegime: string,
) {
  return supabaseAdmin
    .from("platform_policy_acceptances")
    .select("id, accepted_at")
    .eq("user_id", userId)
    .eq("policy_version", policyVersion)
    .eq("business_country_code", countryCode)
    .eq("legal_regime", legalRegime)
    .maybeSingle();
}

export async function GET(req: Request) {
  try {
    const context = contextFromRequest(req);
    if (!context) {
      return NextResponse.json({ error: "A valid consent context is required" }, { status: 400 });
    }

    const user = await policyConsentRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = policyConsentRouteDeps.getSupabaseAdminClient();
    const [
      { data: rawConfig, error: configError },
      { data: rawEnforcement, error: enforcementError },
      { data: rawProfile, error: profileError },
    ] = await Promise.all([
      loadPolicyConfig(supabaseAdmin),
      loadEnforcementConfig(supabaseAdmin),
      loadMerchantProfile(supabaseAdmin, user.id),
    ]);
    if (configError) throw configError;
    if (enforcementError) throw enforcementError;
    if (profileError) throw profileError;
    if (!rawConfig || !rawEnforcement) {
      return NextResponse.json({ error: "Policy configuration is unavailable" }, { status: 503 });
    }

    const config = rawConfig as PolicyConfig;
    const enforcementEnabled = (rawEnforcement as EnforcementConfig).country_enforcement_enabled === true;
    const profile = rawProfile as MerchantLegalProfile | null;
    const bindingActive = isBindingActive(config, policyConsentRouteDeps.now());
    if (bindingActive && !enforcementEnabled) {
      return NextResponse.json({ error: "Jurisdiction enforcement must be enabled before binding policies" }, { status: 503 });
    }
    if (bindingActive && config.policy_version !== PAID_BETA_POLICY_VERSION) {
      return NextResponse.json({ error: "Policy version configuration is out of sync" }, { status: 503 });
    }
    if (bindingActive && !config.acceptance_text.trim()) {
      return NextResponse.json({ error: "Binding policy acceptance text is unavailable" }, { status: 503 });
    }

    let rule: JurisdictionRule | null = null;
    if (enforcementEnabled && profile?.legal_regime) {
      const { data, error } = await loadJurisdictionRule(supabaseAdmin, profile.legal_regime);
      if (error) throw error;
      rule = (data as JurisdictionRule | null) ?? null;
    }

    const countryRequired = enforcementEnabled && !profile?.business_country_code;
    const policyRequired = enforcementEnabled && bindingActive && requiresAcceptance(rule);
    let accepted = false;
    let acceptedAt: string | null = null;

    if (policyRequired && profile?.business_country_code && profile.legal_regime) {
      const { data, error } = await loadAcceptance(
        supabaseAdmin,
        user.id,
        config.policy_version,
        profile.business_country_code,
        profile.legal_regime,
      );
      if (error) throw error;
      accepted = Boolean(data?.id);
      acceptedAt = typeof data?.accepted_at === "string" ? data.accepted_at : null;
    }

    const geo = readGeoHint(req);
    return NextResponse.json({
      required: enforcementEnabled && (countryRequired || (policyRequired && !accepted)),
      enforcementEnabled,
      countryRequired,
      policyRequired,
      accepted,
      acceptedAt,
      policyVersion: config.policy_version,
      acceptanceText: policyRequired ? config.acceptance_text : null,
      documentPaths: DOCUMENT_PATHS,
      businessCountryCode: profile?.business_country_code ?? null,
      legalRegime: profile?.legal_regime ?? null,
      suggestedCountryCode: profile?.business_country_code ?? geo.countryCode,
      geoHintCountryCode: geo.countryCode,
      geoHintRegionCode: geo.regionCode,
      context,
    });
  } catch (error) {
    console.error("Policy consent read error:", error);
    return NextResponse.json({ error: "Failed to load policy consent status" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await policyConsentRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const accepted = body?.accepted === true;
    const policyVersion = typeof body?.policyVersion === "string" ? body.policyVersion.trim() : "";
    const context = typeof body?.context === "string" ? body.context.trim() : "";
    const countryCode = normalizeCountryCode(body?.countryCode);
    if (!countryCode || !ACCEPTANCE_CONTEXTS.has(context)) {
      return NextResponse.json({ error: "Select a valid business country before continuing" }, { status: 400 });
    }

    const supabaseAdmin = policyConsentRouteDeps.getSupabaseAdminClient();
    const [
      { data: rawConfig, error: configError },
      { data: rawEnforcement, error: enforcementError },
    ] = await Promise.all([
      loadPolicyConfig(supabaseAdmin),
      loadEnforcementConfig(supabaseAdmin),
    ]);
    if (configError) throw configError;
    if (enforcementError) throw enforcementError;
    if (!rawConfig || !rawEnforcement) {
      return NextResponse.json({ error: "Policy configuration is unavailable" }, { status: 503 });
    }

    const config = rawConfig as PolicyConfig;
    const enforcementEnabled = (rawEnforcement as EnforcementConfig).country_enforcement_enabled === true;
    const bindingActive = isBindingActive(config, policyConsentRouteDeps.now());
    if (bindingActive && !enforcementEnabled) {
      return NextResponse.json({ error: "Jurisdiction enforcement must be enabled before binding policies" }, { status: 409 });
    }
    if (bindingActive && config.policy_version !== PAID_BETA_POLICY_VERSION) {
      return NextResponse.json({ error: "Policy version configuration is out of sync" }, { status: 409 });
    }
    if (bindingActive && !config.acceptance_text.trim()) {
      return NextResponse.json({ error: "Binding policy acceptance text is unavailable" }, { status: 503 });
    }

    const { data: legalRegime, error: regimeError } = await supabaseAdmin.rpc("resolve_platform_legal_regime", {
      p_country_code: countryCode,
    });
    if (regimeError) throw regimeError;
    const regime = typeof legalRegime === "string" && legalRegime.trim() ? legalRegime.trim() : "GLOBAL";

    const { data: rawRule, error: ruleError } = await loadJurisdictionRule(supabaseAdmin, regime);
    if (ruleError) throw ruleError;
    const policyRequired = enforcementEnabled && bindingActive && requiresAcceptance((rawRule as JurisdictionRule | null) ?? null);

    if (policyRequired && (!accepted || !policyVersion)) {
      return NextResponse.json({ error: "A valid policy acceptance is required" }, { status: 400 });
    }
    if (policyRequired && policyVersion !== config.policy_version) {
      return NextResponse.json({ error: "Policy version configuration is out of sync" }, { status: 409 });
    }

    const geo = readGeoHint(req);
    const { data: profileResult, error: profileWriteError } = await supabaseAdmin.rpc("set_merchant_legal_profile", {
      p_user_id: user.id,
      p_business_country_code: countryCode,
      p_geo_hint_country_code: geo.countryCode,
      p_geo_hint_region_code: geo.regionCode,
    });
    if (profileWriteError) throw profileWriteError;

    if (!policyRequired) {
      return NextResponse.json({
        accepted: false,
        required: false,
        countrySaved: true,
        enforcementEnabled,
        policyVersion: config.policy_version,
        businessCountryCode: countryCode,
        legalRegime: regime,
        profile: profileResult ?? null,
      });
    }

    const existing = await loadAcceptance(supabaseAdmin, user.id, config.policy_version, countryCode, regime);
    if (existing.error) throw existing.error;
    if (existing.data?.id) {
      return NextResponse.json({
        accepted: true,
        required: false,
        policyVersion: config.policy_version,
        acceptedAt: existing.data.accepted_at ?? null,
        businessCountryCode: countryCode,
        legalRegime: regime,
        duplicated: true,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("platform_policy_acceptances")
      .insert({
        user_id: user.id,
        policy_version: config.policy_version,
        acceptance_text: config.acceptance_text,
        acceptance_context: context,
        document_paths: [...DOCUMENT_PATHS],
        business_country_code: countryCode,
        legal_regime: regime,
      })
      .select("accepted_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        const duplicate = await loadAcceptance(supabaseAdmin, user.id, config.policy_version, countryCode, regime);
        if (duplicate.error) throw duplicate.error;
        return NextResponse.json({
          accepted: true,
          required: false,
          policyVersion: config.policy_version,
          acceptedAt: duplicate.data?.accepted_at ?? null,
          businessCountryCode: countryCode,
          legalRegime: regime,
          duplicated: true,
        });
      }
      throw error;
    }

    return NextResponse.json({
      accepted: true,
      required: false,
      policyVersion: config.policy_version,
      acceptedAt: data?.accepted_at ?? null,
      businessCountryCode: countryCode,
      legalRegime: regime,
      duplicated: false,
    });
  } catch (error) {
    console.error("Policy consent write error:", error);
    return NextResponse.json({ error: "Failed to record policy acceptance" }, { status: 500 });
  }
}
