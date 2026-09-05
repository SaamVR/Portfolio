import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { listSmsProviderOptions, getSmsProviderAdapter } from "@/lib/messaging/providers/registry";
import { requirePlatformConfigurationAdmin, writePlatformConfigurationAudit } from "@/lib/platform/configuration-admin";

const PAID_BETA_POLICY_VERSION = "2026-09-04-paid-beta-1";

function safeProviderConnection(row: any) {
  if (!row) {
    return {
      provider: "greenweb",
      configured: false,
      status: "not_configured",
      verificationStatus: "not_checked",
      lastVerifiedAt: null,
      verificationError: null,
      metadata: {},
    };
  }
  return {
    provider: String(row.provider ?? ""),
    configured: row.status === "configured",
    status: String(row.status ?? "not_configured"),
    verificationStatus: String(row.verification_status ?? "not_checked"),
    lastVerifiedAt: typeof row.last_verified_at === "string" ? row.last_verified_at : null,
    verificationError: typeof row.verification_error === "string" ? row.verification_error : null,
    metadata: row.public_metadata && typeof row.public_metadata === "object" ? row.public_metadata : {},
  };
}

async function loadConfiguration(supabaseAdmin: any) {
  const [identityRes, policyRes, jurisdictionRes, availabilityRes, messagingRes, connectionRes] = await Promise.all([
    supabaseAdmin
      .from("platform_identity_config")
      .select("site_name, legal_operator_name, updated_at")
      .eq("singleton", true)
      .maybeSingle(),
    supabaseAdmin
      .from("platform_policy_config")
      .select("policy_version, binding, acceptance_text, effective_at, site_name_snapshot, legal_operator_name_snapshot, updated_at")
      .eq("singleton", true)
      .maybeSingle(),
    supabaseAdmin
      .from("platform_jurisdiction_enforcement_config")
      .select("country_enforcement_enabled, updated_at, updated_by")
      .eq("singleton", true)
      .maybeSingle(),
    supabaseAdmin
      .from("platform_availability_config")
      .select("monitoring_started_at, commitment_percent, updated_at")
      .eq("singleton", true)
      .maybeSingle(),
    supabaseAdmin
      .from("platform_messaging_config")
      .select("active_sms_provider, sms_enabled, otp_enabled, transactional_enabled, updated_at")
      .eq("singleton", true)
      .maybeSingle(),
    supabaseAdmin
      .from("platform_sms_provider_connections")
      .select("provider, status, verification_status, last_verified_at, verification_error, public_metadata, updated_at")
      .eq("provider", "greenweb")
      .maybeSingle(),
  ]);

  for (const result of [identityRes, policyRes, jurisdictionRes, availabilityRes, messagingRes, connectionRes]) {
    if (result.error) throw result.error;
  }

  const identity = identityRes.data;
  const policy = policyRes.data;
  const jurisdiction = jurisdictionRes.data;
  const availability = availabilityRes.data;
  const messaging = messagingRes.data;
  const connection = safeProviderConnection(connectionRes.data);

  return {
    identity: {
      siteName: String(identity?.site_name ?? "EZComo"),
      legalOperatorName: typeof identity?.legal_operator_name === "string" ? identity.legal_operator_name : "",
      updatedAt: identity?.updated_at ?? null,
    },
    policy: {
      approvedVersion: PAID_BETA_POLICY_VERSION,
      policyVersion: String(policy?.policy_version ?? "2026-08-31-review-1"),
      binding: policy?.binding === true,
      effectiveAt: policy?.effective_at ?? null,
      acceptanceText: policy?.binding === true ? String(policy?.acceptance_text ?? "") : null,
      siteNameSnapshot: policy?.site_name_snapshot ?? null,
      legalOperatorNameSnapshot: policy?.legal_operator_name_snapshot ?? null,
      reissueRequired:
        policy?.binding === true &&
        (policy?.site_name_snapshot !== identity?.site_name ||
          policy?.legal_operator_name_snapshot !== identity?.legal_operator_name),
    },
    jurisdiction: {
      countryEnforcementEnabled: jurisdiction?.country_enforcement_enabled === true,
      updatedAt: jurisdiction?.updated_at ?? null,
    },
    availability: {
      monitoringStartedAt: availability?.monitoring_started_at ?? null,
      commitmentPercent: Number(availability?.commitment_percent ?? 99),
    },
    messaging: {
      activeProvider: String(messaging?.active_sms_provider ?? "greenweb"),
      smsEnabled: messaging?.sms_enabled === true,
      otpEnabled: messaging?.otp_enabled === true,
      transactionalEnabled: messaging?.transactional_enabled === true,
      provider: connection,
      providerOptions: listSmsProviderOptions(),
    },
  };
}

async function verifyProvider(supabaseAdmin: any, provider: string, secret: string, actorId: string) {
  const adapter = getSmsProviderAdapter(provider);
  if (!adapter) throw new Error("Unsupported SMS provider");

  const verification = await adapter.verifyCredential(secret);
  const { error } = await supabaseAdmin.rpc("mark_platform_sms_provider_verification", {
    p_provider: provider,
    p_success: verification.ok,
    p_error: verification.error,
    p_public_metadata: verification.metadata,
    p_updated_by: actorId,
  });
  if (error) throw error;
  return verification;
}

export async function GET(req: Request) {
  try {
    const guard = await requirePlatformConfigurationAdmin(req);
    if ("error" in guard) return guard.error;
    return NextResponse.json(await loadConfiguration(guard.supabaseAdmin));
  } catch (error) {
    console.error("Platform configuration load error:", error);
    return NextResponse.json({ error: "Failed to load platform configuration" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requirePlatformConfigurationAdmin(req);
    if ("error" in guard) return guard.error;
    const body = await req.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "";
    const actor = { userId: guard.userId, userEmail: guard.userEmail, role: guard.role };

    if (action === "update_identity") {
      const siteName = typeof body?.siteName === "string" ? body.siteName : "";
      const legalOperatorName = typeof body?.legalOperatorName === "string" ? body.legalOperatorName : "";
      const { error } = await guard.supabaseAdmin.rpc("set_platform_identity", {
        p_site_name: siteName,
        p_legal_operator_name: legalOperatorName,
        p_updated_by: guard.userId,
      });
      if (error) throw error;
      await writePlatformConfigurationAudit(guard.supabaseAdmin, actor, "platform_identity_updated", "platform_identity", "singleton", {
        site_name: siteName.trim(),
        legal_operator_configured: Boolean(legalOperatorName.trim()),
      });
      revalidateTag("platform-runtime-identity", "max");
      revalidateTag("public-policy-runtime", "max");
      revalidatePath("/", "layout");
    } else if (action === "set_jurisdiction_enforcement") {
      if (typeof body?.enabled !== "boolean") {
        return NextResponse.json({ error: "Jurisdiction enforcement state is required" }, { status: 400 });
      }
      const enabled = body.enabled;
      const currentConfiguration = await loadConfiguration(guard.supabaseAdmin);
      if (enabled && !currentConfiguration.identity.legalOperatorName.trim()) {
        return NextResponse.json({ error: "Legal operator identity is required before jurisdiction enforcement" }, { status: 409 });
      }
      const { error } = await guard.supabaseAdmin
        .from("platform_jurisdiction_enforcement_config")
        .update({
          country_enforcement_enabled: enabled,
          updated_at: new Date().toISOString(),
          updated_by: guard.userId,
        })
        .eq("singleton", true);
      if (error) throw error;
      await writePlatformConfigurationAudit(
        guard.supabaseAdmin,
        actor,
        "platform_jurisdiction_enforcement_updated",
        "platform_jurisdiction_enforcement",
        "singleton",
        {
          previous_country_enforcement_enabled: currentConfiguration.jurisdiction.countryEnforcementEnabled,
          country_enforcement_enabled: enabled,
        },
      );
    } else if (action === "configure_sms_provider") {
      const provider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "greenweb";
      const credential = typeof body?.credential === "string" ? body.credential.trim() : "";
      if (!credential) return NextResponse.json({ error: "SMS provider credential is required" }, { status: 400 });
      if (!getSmsProviderAdapter(provider)) return NextResponse.json({ error: "Unsupported SMS provider" }, { status: 400 });

      const { error } = await guard.supabaseAdmin.rpc("configure_platform_sms_provider", {
        p_provider: provider,
        p_secret: credential,
        p_updated_by: guard.userId,
      });
      if (error) throw error;
      const verification = await verifyProvider(guard.supabaseAdmin, provider, credential, guard.userId);
      await writePlatformConfigurationAudit(guard.supabaseAdmin, actor, "platform_sms_provider_configured", "sms_provider", provider, {
        provider,
        verified: verification.ok,
      });
    } else if (action === "verify_sms_provider") {
      const provider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "greenweb";
      if (!getSmsProviderAdapter(provider)) return NextResponse.json({ error: "Unsupported SMS provider" }, { status: 400 });
      const { data: secret, error: secretError } = await guard.supabaseAdmin.rpc("get_platform_sms_provider_secret", { p_provider: provider });
      if (secretError) throw secretError;
      if (typeof secret !== "string" || !secret.trim()) {
        return NextResponse.json({ error: "SMS provider is not configured" }, { status: 409 });
      }
      const verification = await verifyProvider(guard.supabaseAdmin, provider, secret, guard.userId);
      await writePlatformConfigurationAudit(guard.supabaseAdmin, actor, "platform_sms_provider_verified", "sms_provider", provider, {
        provider,
        verified: verification.ok,
      });
    } else if (action === "revoke_sms_provider") {
      const provider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "greenweb";
      const { error } = await guard.supabaseAdmin.rpc("revoke_platform_sms_provider", {
        p_provider: provider,
        p_updated_by: guard.userId,
      });
      if (error) throw error;
      await writePlatformConfigurationAudit(guard.supabaseAdmin, actor, "platform_sms_provider_revoked", "sms_provider", provider, { provider });
    } else if (action === "set_messaging") {
      const provider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "greenweb";
      const smsEnabled = body?.smsEnabled === true;
      const otpEnabled = smsEnabled && body?.otpEnabled === true;
      const transactionalEnabled = smsEnabled && body?.transactionalEnabled === true;
      const { error } = await guard.supabaseAdmin.rpc("set_platform_messaging_config", {
        p_provider: provider,
        p_sms_enabled: smsEnabled,
        p_otp_enabled: otpEnabled,
        p_transactional_enabled: transactionalEnabled,
        p_updated_by: guard.userId,
      });
      if (error) throw error;
      await writePlatformConfigurationAudit(guard.supabaseAdmin, actor, "platform_messaging_config_updated", "platform_messaging", "singleton", {
        provider,
        sms_enabled: smsEnabled,
        otp_enabled: otpEnabled,
        transactional_enabled: transactionalEnabled,
      });
    } else if (action === "activate_policy") {
      const currentConfiguration = await loadConfiguration(guard.supabaseAdmin);
      if (!currentConfiguration.identity.legalOperatorName.trim()) {
        return NextResponse.json({ error: "Legal operator identity is required before policy activation" }, { status: 409 });
      }
      if (!currentConfiguration.jurisdiction.countryEnforcementEnabled) {
        return NextResponse.json({ error: "Jurisdiction enforcement must be enabled before policy activation" }, { status: 409 });
      }
      if (!currentConfiguration.availability.monitoringStartedAt) {
        return NextResponse.json({ error: "Availability monitoring must be started before policy activation" }, { status: 409 });
      }
      const effectiveAt = typeof body?.effectiveAt === "string" && body.effectiveAt.trim()
        ? new Date(body.effectiveAt).toISOString()
        : new Date().toISOString();
      const { error } = await guard.supabaseAdmin.rpc("activate_platform_policy_version", {
        p_policy_version: PAID_BETA_POLICY_VERSION,
        p_effective_at: effectiveAt,
        p_approved_by: guard.userId,
      });
      if (error) throw error;
      await writePlatformConfigurationAudit(guard.supabaseAdmin, actor, "platform_policy_activated", "platform_policy", PAID_BETA_POLICY_VERSION, {
        policy_version: PAID_BETA_POLICY_VERSION,
        effective_at: effectiveAt,
      });
      revalidateTag("platform-runtime-identity", "max");
      revalidateTag("public-policy-runtime", "max");
      revalidatePath("/terms");
      revalidatePath("/privacy");
      revalidatePath("/billing-policy");
      revalidatePath("/", "layout");
    } else if (action === "activate_availability") {
      const { error } = await guard.supabaseAdmin.rpc("activate_platform_availability_monitoring");
      if (error) throw error;
      await writePlatformConfigurationAudit(guard.supabaseAdmin, actor, "platform_availability_monitoring_activated", "platform_availability", "core", {
        commitment_percent: 99,
        interval_minutes: 5,
      });
    } else {
      return NextResponse.json({ error: "Unsupported configuration action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, configuration: await loadConfiguration(guard.supabaseAdmin) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Platform configuration update failed";
    console.error("Platform configuration update error:", message);
    const safeMessage = /site name|legal operator|policy version|jurisdiction enforcement|availability monitoring|SMS provider|effective_at/i.test(message)
      ? message
      : "Failed to update platform configuration";
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
