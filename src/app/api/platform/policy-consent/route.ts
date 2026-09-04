import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
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

function isBindingActive(config: PolicyConfig, now: Date) {
  if (!config.binding || !config.effective_at) return false;
  const effectiveAt = new Date(config.effective_at);
  return Number.isFinite(effectiveAt.getTime()) && effectiveAt.getTime() <= now.getTime();
}

async function loadPolicyConfig(supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>) {
  return supabaseAdmin
    .from("platform_policy_config")
    .select("policy_version, binding, acceptance_text, effective_at")
    .eq("singleton", true)
    .maybeSingle();
}

async function loadAcceptance(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  policyVersion: string,
) {
  return supabaseAdmin
    .from("platform_policy_acceptances")
    .select("id, accepted_at")
    .eq("user_id", userId)
    .eq("policy_version", policyVersion)
    .maybeSingle();
}

export async function GET(req: Request) {
  try {
    const user = await policyConsentRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = policyConsentRouteDeps.getSupabaseAdminClient();
    const { data: rawConfig, error: configError } = await loadPolicyConfig(supabaseAdmin);
    if (configError) throw configError;
    if (!rawConfig) {
      return NextResponse.json({ error: "Policy configuration is unavailable" }, { status: 503 });
    }

    const config = rawConfig as PolicyConfig;
    const required = isBindingActive(config, policyConsentRouteDeps.now());
    if (required && config.policy_version !== PAID_BETA_POLICY_VERSION) {
      return NextResponse.json({ error: "Policy version configuration is out of sync" }, { status: 503 });
    }
    if (required && !config.acceptance_text.trim()) {
      return NextResponse.json({ error: "Binding policy acceptance text is unavailable" }, { status: 503 });
    }

    let accepted = false;
    let acceptedAt: string | null = null;
    if (required) {
      const { data, error } = await loadAcceptance(supabaseAdmin, user.id, config.policy_version);
      if (error) throw error;
      accepted = Boolean(data?.id);
      acceptedAt = typeof data?.accepted_at === "string" ? data.accepted_at : null;
    }

    return NextResponse.json({
      required,
      accepted,
      acceptedAt,
      policyVersion: config.policy_version,
      acceptanceText: required ? config.acceptance_text : null,
      documentPaths: DOCUMENT_PATHS,
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
    if (!accepted || !policyVersion || !ACCEPTANCE_CONTEXTS.has(context)) {
      return NextResponse.json({ error: "A valid policy acceptance is required" }, { status: 400 });
    }

    const supabaseAdmin = policyConsentRouteDeps.getSupabaseAdminClient();
    const { data: rawConfig, error: configError } = await loadPolicyConfig(supabaseAdmin);
    if (configError) throw configError;
    if (!rawConfig) {
      return NextResponse.json({ error: "Policy configuration is unavailable" }, { status: 503 });
    }

    const config = rawConfig as PolicyConfig;
    if (!isBindingActive(config, policyConsentRouteDeps.now())) {
      return NextResponse.json({ error: "No binding policy acceptance is currently required" }, { status: 409 });
    }
    if (
      config.policy_version !== PAID_BETA_POLICY_VERSION ||
      policyVersion !== config.policy_version ||
      !config.acceptance_text.trim()
    ) {
      return NextResponse.json({ error: "Policy version configuration is out of sync" }, { status: 409 });
    }

    const existing = await loadAcceptance(supabaseAdmin, user.id, config.policy_version);
    if (existing.error) throw existing.error;
    if (existing.data?.id) {
      return NextResponse.json({
        accepted: true,
        policyVersion: config.policy_version,
        acceptedAt: existing.data.accepted_at ?? null,
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
      })
      .select("accepted_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        const duplicate = await loadAcceptance(supabaseAdmin, user.id, config.policy_version);
        if (duplicate.error) throw duplicate.error;
        return NextResponse.json({
          accepted: true,
          policyVersion: config.policy_version,
          acceptedAt: duplicate.data?.accepted_at ?? null,
          duplicated: true,
        });
      }
      throw error;
    }

    return NextResponse.json({
      accepted: true,
      policyVersion: config.policy_version,
      acceptedAt: data?.accepted_at ?? null,
      duplicated: false,
    });
  } catch (error) {
    console.error("Policy consent write error:", error);
    return NextResponse.json({ error: "Failed to record policy acceptance" }, { status: 500 });
  }
}
