import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getRoutingDnsRecordName,
  normalizeDomainInput,
  type DomainRecordInstruction,
} from "@/lib/domains";
import {
  createCloudflareCustomHostname,
  deleteCloudflareCustomHostname,
  getCloudflareConfigDebug,
  getCloudflareCustomHostname,
  getCustomDomainCnameTarget,
  type CloudflareCustomHostname,
} from "@/lib/cloudflare-domains";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { getDomainRoutingKvAdapter } from "@/lib/domain-routing-kv";
import { getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";
import { canUseCustomDomains } from "@/lib/billing/plans";

type StoreDomainRow = {
  id: string;
  store_id: string;
  hostname: string;
  status: string;
  domain_type?: string | null;
  is_primary: boolean;
  is_www_domain: boolean;
  vercel_verified: boolean;
  vercel_misconfigured: boolean;
  configured_by: string | null;
  verification_records: DomainRecordInstruction[] | null;
  dns_records: DomainRecordInstruction[] | null;
  last_vercel_error: Record<string, unknown> | null;
  cloudflare_hostname_id?: string | null;
  cloudflare_hostname_status?: string | null;
  cloudflare_ssl_status?: string | null;
  last_cloudflare_error?: Record<string, unknown> | null;
  last_checked_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
};

export const domainRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  normalizeDomainInput,
  createCloudflareCustomHostname,
  getCloudflareCustomHostname,
  deleteCloudflareCustomHostname,
  getCustomDomainCnameTarget,
  now: () => new Date().toISOString(),
};

async function requireDomainManager(req: Request, storeId: string) {
  const user = await domainRouteDeps.getAuthenticatedUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseAdmin = domainRouteDeps.getSupabaseAdminClient();
  const authorized = await domainRouteDeps.canManageStore(supabaseAdmin, storeId, user.id, ["owner", "admin"]);
  if (!authorized) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabaseAdmin, userId: user.id };
}

function asJson(value: unknown) {
  return (value ?? null) as Record<string, unknown> | null;
}

function getCloudflareStatus(hostname: CloudflareCustomHostname) {
  const hostnameStatus = hostname.status ?? "pending";
  const sslStatus = hostname.ssl?.status ?? "pending";

  if (hostnameStatus === "active" && sslStatus === "active") {
    return "active";
  }

  if (hostnameStatus === "moved" || hostnameStatus === "deleted") {
    return "failed";
  }

  if (hostnameStatus !== "active") {
    return "pending_dns";
  }

  return "pending_verification";
}

function buildCloudflareDnsInstructions(
  hostname: string,
  cloudflareHostname: CloudflareCustomHostname,
): DomainRecordInstruction[] {
  const records: DomainRecordInstruction[] = [];
  const verification = cloudflareHostname.ownership_verification;

  if (verification?.type && verification.name && verification.value) {
    records.push({
      type: verification.type.toUpperCase(),
      name: verification.name,
      value: verification.value,
      purpose: "verification",
    });
  }

  records.push({
    type: "CNAME",
    name: getRoutingDnsRecordName(hostname),
    value: domainRouteDeps.getCustomDomainCnameTarget(),
    purpose: "routing",
  });

  return records;
}

async function loadStoreDomains(supabaseAdmin: SupabaseClient, storeId: string) {
  const { data, error } = await supabaseAdmin
    .from("store_domains")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StoreDomainRow[];
}

async function loadStoreSummary(supabaseAdmin: SupabaseClient, storeId: string) {
  const { data, error } = await supabaseAdmin
    .from("stores")
    .select("slug")
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw error;

  const slug = typeof data?.slug === "string" ? data.slug : "";
  const baseDomain = getStoreSubdomainBaseDomain();

  return {
    slug,
    platformDomain: slug && baseDomain ? `${slug}.${baseDomain}` : "",
  };
}

async function syncDomainRoutingKv(
  payload:
    | {
        action: "upsert";
        hostname: string;
        storeSlug: string;
        isActive: boolean;
        isPrimary: boolean;
        source: "domain-created" | "domain-checked" | "domain-primary";
      }
    | {
        action: "delete";
        hostname: string;
      },
) {
  const kv = getDomainRoutingKvAdapter();

  if (payload.action === "delete") {
    await kv.delete(payload.hostname);
    return;
  }

  if (!payload.storeSlug) {
    return;
  }

  if (!payload.isActive) {
    await kv.delete(payload.hostname);
    return;
  }

  await kv.set({
    hostname: payload.hostname,
    storeSlug: payload.storeSlug,
    isActive: payload.isActive,
    isPrimary: payload.isPrimary,
    source: payload.source,
  });
}

type DomainRoutingSyncWarning = {
  message: string;
};

async function syncDomainRoutingKvSafely(
  payload: Parameters<typeof syncDomainRoutingKv>[0],
): Promise<DomainRoutingSyncWarning | null> {
  try {
    await syncDomainRoutingKv(payload);
    return null;
  } catch (error) {
    return {
      message: error instanceof Error
        ? `Domain route saved, but Cloudflare KV sync needs a retry: ${error.message}`
        : "Domain route saved, but Cloudflare KV sync needs a retry.",
    };
  }
}

type DomainAccessState = {
  allowed: boolean;
  featureEnabled: boolean;
  message: string;
  planName: string | null;
  subscriptionStatus: string | null;
};

async function loadDomainAccess(supabaseAdmin: SupabaseClient, storeId: string): Promise<DomainAccessState> {
  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from("store_subscriptions")
    .select("plan_id, status, trial_ends_at, cms_plans(name, monthly_price, annual_price)")
    .eq("store_id", storeId)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;

  const planId = typeof subscription?.plan_id === "string" ? subscription.plan_id : null;
  const { data: customDomainFeature, error: featureError } = planId
    ? await supabaseAdmin
        .from("cms_plan_features")
        .select("enabled")
        .eq("plan_id", planId)
        .eq("feature_key", "custom_domains")
        .maybeSingle()
    : { data: null, error: null };

  if (featureError) throw featureError;

  const featureEnabled = Boolean(customDomainFeature?.enabled);
  const plan = (subscription?.cms_plans ?? null) as { name?: string | null; monthly_price?: number | null; annual_price?: number | null } | null;
  const allowed = canUseCustomDomains(
    subscription as { status?: string | null; trial_ends_at?: string | null } | null,
    planId
      ? {
          id: planId,
          monthly_price: plan?.monthly_price ?? null,
          annual_price: plan?.annual_price ?? null,
        }
      : null,
    featureEnabled,
  );

  let message = "Custom domains are unavailable for this store.";
  if (!featureEnabled) {
    message = "This plan does not include custom domains. Upgrade to a package that includes domain access.";
  } else if ((subscription?.status ?? null) === "trialing") {
    message = "Custom domains unlock only after your paid package becomes active. They stay unavailable during trial.";
  } else if (!allowed) {
    message = "Custom domains unlock only on active paid packages.";
  }

  return {
    allowed,
    featureEnabled,
    message,
    planName: typeof plan?.name === "string" ? plan.name : null,
    subscriptionStatus: typeof subscription?.status === "string" ? subscription.status : null,
  };
}

async function requireCustomDomainAccess(supabaseAdmin: SupabaseClient, storeId: string) {
  const domainAccess = await loadDomainAccess(supabaseAdmin, storeId);
  if (!domainAccess.allowed) {
    return {
      error: NextResponse.json({ error: domainAccess.message, domainAccess }, { status: 403 }),
      domainAccess,
    };
  }

  return { domainAccess };
}

async function upsertStoreDomain(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("store_domains")
    .upsert(payload, { onConflict: "hostname" })
    .select("*")
    .single();

  if (error) throw error;
  return data as StoreDomainRow;
}

async function updateStoreDomain(
  supabaseAdmin: SupabaseClient,
  hostname: string,
  payload: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("store_domains")
    .update(payload)
    .eq("hostname", hostname)
    .select("*")
    .single();

  if (error) throw error;
  return data as StoreDomainRow;
}

async function ensureHostnameAvailable(
  supabaseAdmin: SupabaseClient,
  storeId: string,
  hostname: string,
) {
  const { data, error } = await supabaseAdmin
    .from("store_domains")
    .select("store_id")
    .eq("hostname", hostname)
    .neq("store_id", storeId)
    .maybeSingle();

  if (error) throw error;
  return !data;
}

async function clearOtherPrimaryFlags(supabaseAdmin: SupabaseClient, storeId: string, keepHostname: string) {
  const { error } = await supabaseAdmin
    .from("store_domains")
    .update({ is_primary: false })
    .eq("store_id", storeId)
    .neq("hostname", keepHostname);

  if (error) throw error;
}

function serializeDomain(row: StoreDomainRow) {
  const hostnameStatus = row.cloudflare_hostname_status ?? (row.vercel_verified ? "active" : "pending");
  const sslStatus = row.cloudflare_ssl_status ?? (row.vercel_misconfigured ? "pending" : "active");

  return {
    id: row.id,
    hostname: row.hostname,
    status: row.status,
    domainType: row.domain_type ?? "custom",
    isPrimary: row.is_primary,
    isActive: row.status === "active" && hostnameStatus === "active" && sslStatus === "active",
    vercelVerified: hostnameStatus === "active",
    vercelMisconfigured: sslStatus !== "active",
    cloudflareHostnameId: row.cloudflare_hostname_id ?? null,
    cloudflareHostnameStatus: hostnameStatus,
    cloudflareSslStatus: sslStatus,
    configuredBy: row.configured_by,
    verificationRecords: row.verification_records ?? [],
    dnsRecords: row.dns_records ?? [],
    lastError: row.last_cloudflare_error ?? row.last_vercel_error,
    lastCheckedAt: row.last_checked_at,
    activatedAt: row.activated_at,
    isWwwDomain: row.is_www_domain,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireSupportedCustomHostname(rawDomain: string) {
  // Provision exactly the hostname the merchant entered. Apex vanity domains are
  // first-class custom hostnames; www remains an opt-in compatibility fallback.
  return domainRouteDeps.normalizeDomainInput(rawDomain);
}

async function syncHostnameStatus(
  supabaseAdmin: SupabaseClient,
  domain: StoreDomainRow,
  now = domainRouteDeps.now(),
) {
  if (!domain.cloudflare_hostname_id) {
    const updated = await updateStoreDomain(supabaseAdmin, domain.hostname, {
      status: "failed",
      last_cloudflare_error: asJson({ message: "Missing Cloudflare hostname ID. Remove and add this domain again." }),
      last_vercel_error: asJson({ message: "Missing Cloudflare hostname ID. Remove and add this domain again." }),
      last_checked_at: now,
    });
    return serializeDomain(updated);
  }

  let cloudflareHostname: CloudflareCustomHostname;
  try {
    cloudflareHostname = await domainRouteDeps.getCloudflareCustomHostname(domain.cloudflare_hostname_id);
  } catch (error) {
    const updated = await updateStoreDomain(supabaseAdmin, domain.hostname, {
      status: "failed",
      last_cloudflare_error: asJson({ message: error instanceof Error ? error.message : "Failed to fetch Cloudflare hostname" }),
      last_vercel_error: asJson({ message: error instanceof Error ? error.message : "Failed to fetch Cloudflare hostname" }),
      last_checked_at: now,
    });

    return serializeDomain(updated);
  }

  const normalized = domainRouteDeps.normalizeDomainInput(domain.hostname);
  const status = getCloudflareStatus(cloudflareHostname);
  const hostnameStatus = cloudflareHostname.status ?? "pending";
  const sslStatus = cloudflareHostname.ssl?.status ?? "pending";
  const records = buildCloudflareDnsInstructions(domain.hostname, cloudflareHostname);
  const errorMessages = [
    ...(cloudflareHostname.verification_errors ?? []),
    ...(cloudflareHostname.ssl?.validation_errors ?? []).map((error) => error.message).filter((message): message is string => Boolean(message)),
  ];

  const updated = await updateStoreDomain(supabaseAdmin, domain.hostname, {
    status,
    domain_type: "custom",
    is_www_domain: normalized.isWwwDomain,
    vercel_verified: hostnameStatus === "active",
    vercel_misconfigured: sslStatus !== "active",
    configured_by: "CNAME",
    verification_records: records.filter((record) => record.purpose === "verification"),
    dns_records: records.filter((record) => record.purpose === "routing"),
    cloudflare_hostname_status: hostnameStatus,
    cloudflare_ssl_status: sslStatus,
    last_cloudflare_error: errorMessages.length ? asJson({ message: errorMessages.join(", ") }) : null,
    last_vercel_error: errorMessages.length ? asJson({ message: errorMessages.join(", ") }) : null,
    last_checked_at: now,
    activated_at: status === "active" ? now : null,
  });

  return serializeDomain(updated);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const rawDomain = searchParams.get("domain");

    if (storeId) {
      const access = await requireDomainManager(req, storeId);
      if (access.error) return access.error;

      const domains = await loadStoreDomains(access.supabaseAdmin, storeId);
      const store = await loadStoreSummary(access.supabaseAdmin, storeId);
      const domainAccess = await loadDomainAccess(access.supabaseAdmin, storeId);
      return NextResponse.json({
        store,
        domainAccess,
        domains: domains.map(serializeDomain),
      });
    }

    if (!rawDomain) {
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    const normalized = requireSupportedCustomHostname(rawDomain);
    const supabaseAdmin = domainRouteDeps.getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("store_domains")
      .select("*")
      .eq("hostname", normalized.hostname)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json(serializeDomain(data as StoreDomainRow));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check domain" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let storeId: string | null = null;
  try {
    const body = await req.json();
    storeId = typeof body.storeId === "string" ? body.storeId : null;
    const rawDomain = body.domain;
    if (!storeId || !rawDomain) {
      return NextResponse.json({ error: "Missing storeId or domain" }, { status: 400 });
    }

    const access = await requireDomainManager(req, storeId);
    if (access.error) return access.error;
    const domainAccessResult = await requireCustomDomainAccess(access.supabaseAdmin, storeId);
    if (domainAccessResult.error) return domainAccessResult.error;

    const normalized = requireSupportedCustomHostname(rawDomain);
    const available = await ensureHostnameAvailable(access.supabaseAdmin, storeId, normalized.hostname);
    if (!available) {
      return NextResponse.json({ error: "Domain is already connected to another store" }, { status: 409 });
    }

    const cloudflareHostname = await domainRouteDeps.createCloudflareCustomHostname(normalized.hostname);
    const status = getCloudflareStatus(cloudflareHostname);
    const hostnameStatus = cloudflareHostname.status ?? "pending";
    const sslStatus = cloudflareHostname.ssl?.status ?? "pending";
    const records = buildCloudflareDnsInstructions(normalized.hostname, cloudflareHostname);
    const now = domainRouteDeps.now();

    await clearOtherPrimaryFlags(access.supabaseAdmin, storeId, normalized.hostname);
    await upsertStoreDomain(access.supabaseAdmin, {
      store_id: storeId,
      hostname: normalized.hostname,
      status,
      domain_type: "custom",
      is_primary: true,
      is_www_domain: normalized.isWwwDomain,
      vercel_verified: hostnameStatus === "active",
      vercel_misconfigured: sslStatus !== "active",
      configured_by: "CNAME",
      verification_records: records.filter((record) => record.purpose === "verification"),
      dns_records: records.filter((record) => record.purpose === "routing"),
      last_vercel_error: null,
      cloudflare_hostname_id: cloudflareHostname.id,
      cloudflare_hostname_status: hostnameStatus,
      cloudflare_ssl_status: sslStatus,
      last_cloudflare_error: null,
      last_checked_at: now,
      activated_at: status === "active" ? now : null,
    });

    const refreshed = await loadStoreDomains(access.supabaseAdmin, storeId);
    const store = await loadStoreSummary(access.supabaseAdmin, storeId);
    const routingSyncWarning = await syncDomainRoutingKvSafely({
      action: "upsert",
      hostname: normalized.hostname,
      storeSlug: store.slug,
      isActive: status === "active" && hostnameStatus === "active" && sslStatus === "active",
      isPrimary: true,
      source: "domain-created",
    });
    return NextResponse.json({
      success: true,
      store,
      domainAccess: domainAccessResult.domainAccess,
      domains: refreshed.map(serializeDomain),
      primaryHostname: normalized.hostname,
      warning: routingSyncWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update custom domain",
        cloudflare: getCloudflareConfigDebug(),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { storeId, action, domain: rawDomain } = await req.json();
    if (!storeId || !action || !rawDomain) {
      return NextResponse.json({ error: "Missing storeId, action, or domain" }, { status: 400 });
    }

    const access = await requireDomainManager(req, storeId);
    if (access.error) return access.error;
    const domainAccessResult = await requireCustomDomainAccess(access.supabaseAdmin, storeId);
    if (domainAccessResult.error) return domainAccessResult.error;

    const normalized = requireSupportedCustomHostname(rawDomain);
    const domains = await loadStoreDomains(access.supabaseAdmin, storeId);
    const selected = domains.find((domain) => domain.hostname === normalized.hostname);

    if (!selected) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (action === "check") {
      const domain = await syncHostnameStatus(access.supabaseAdmin, selected);
      if (domain.isActive) {
        await clearOtherPrimaryFlags(access.supabaseAdmin, storeId, normalized.hostname);
        await updateStoreDomain(access.supabaseAdmin, normalized.hostname, { is_primary: true });
        await access.supabaseAdmin
          .from("stores")
          .update({ custom_domain: normalized.hostname })
          .eq("id", storeId);
      }

      const store = await loadStoreSummary(access.supabaseAdmin, storeId);
      const routingSyncWarning = await syncDomainRoutingKvSafely({
        action: "upsert",
        hostname: normalized.hostname,
        storeSlug: store.slug,
        isActive: domain.isActive,
        isPrimary: domain.isPrimary || domain.isActive,
        source: "domain-checked",
      });
      return NextResponse.json({
        success: true,
        store,
        domainAccess: domainAccessResult.domainAccess,
        domain,
        warning: routingSyncWarning,
      });
    }

    if (action === "make-primary") {
      if (!(selected.status === "active")) {
        return NextResponse.json({ error: "Only active domains can become primary" }, { status: 409 });
      }

      await clearOtherPrimaryFlags(access.supabaseAdmin, storeId, normalized.hostname);
      const updated = await updateStoreDomain(access.supabaseAdmin, normalized.hostname, { is_primary: true });

      await access.supabaseAdmin
        .from("stores")
        .update({ custom_domain: normalized.hostname })
        .eq("id", storeId);

      const store = await loadStoreSummary(access.supabaseAdmin, storeId);
      const routingSyncWarning = await syncDomainRoutingKvSafely({
        action: "upsert",
        hostname: normalized.hostname,
        storeSlug: store.slug,
        isActive: updated.status === "active",
        isPrimary: true,
        source: "domain-primary",
      });

      return NextResponse.json({
        success: true,
        domain: serializeDomain(updated),
        warning: routingSyncWarning,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update domain",
        cloudflare: getCloudflareConfigDebug(),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const rawDomain = searchParams.get("domain");

    if (!storeId || !rawDomain) {
      return NextResponse.json({ error: "Missing storeId or domain" }, { status: 400 });
    }

    const access = await requireDomainManager(req, storeId);
    if (access.error) return access.error;
    const domainAccessResult = await requireCustomDomainAccess(access.supabaseAdmin, storeId);
    if (domainAccessResult.error) return domainAccessResult.error;

    const normalized = requireSupportedCustomHostname(rawDomain);
    const domains = await loadStoreDomains(access.supabaseAdmin, storeId);
    const selected = domains.find((domain) => domain.hostname === normalized.hostname);

    if (selected?.cloudflare_hostname_id) {
      try {
        await domainRouteDeps.deleteCloudflareCustomHostname(selected.cloudflare_hostname_id);
      } catch {
        // Continue DB cleanup when Cloudflare already removed the hostname.
      }
    }

    const { error } = await access.supabaseAdmin
      .from("store_domains")
      .delete()
      .eq("store_id", storeId)
      .in("hostname", [normalized.hostname]);

    if (error) throw error;

    await access.supabaseAdmin
      .from("stores")
      .update({ custom_domain: null })
      .eq("id", storeId)
      .in("custom_domain", [normalized.hostname]);

    const routingSyncWarning = await syncDomainRoutingKvSafely({
      action: "delete",
      hostname: normalized.hostname,
    });

    return NextResponse.json({
      success: true,
      domainAccess: domainAccessResult.domainAccess,
      warning: routingSyncWarning,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove custom domain" },
      { status: 500 },
    );
  }
}
