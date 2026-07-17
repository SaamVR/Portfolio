import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRedirectInstruction,
  deriveStoreDomainStatus,
  getDomainPair,
  isPlatformHostname,
  normalizeDomainInput,
  type DomainRecordInstruction,
} from "@/lib/domains";
import {
  buildVercelDnsInstructions,
  addProjectDomain,
  getVercelConfigDebug,
  getDomainConfiguration,
  getProjectDomain,
  removeProjectDomain,
  updateProjectDomain,
  verifyProjectDomain,
  type VercelDomainConfiguration,
  type VercelProjectDomain,
  type VercelVerificationChallenge,
} from "@/lib/vercel-domains";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";

type StoreDomainRow = {
  id: string;
  store_id: string;
  hostname: string;
  status: string;
  is_primary: boolean;
  is_www_domain: boolean;
  vercel_verified: boolean;
  vercel_misconfigured: boolean;
  configured_by: string | null;
  verification_records: DomainRecordInstruction[] | null;
  dns_records: DomainRecordInstruction[] | null;
  last_vercel_error: Record<string, unknown> | null;
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
  getDomainPair,
  isPlatformHostname,
  addProjectDomain,
  getDomainConfiguration,
  getProjectDomain,
  verifyProjectDomain,
  updateProjectDomain,
  removeProjectDomain,
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

async function loadStoreSummaryByServiceRole(storeId: string) {
  const supabaseAdmin = domainRouteDeps.getSupabaseAdminClient();
  return loadStoreSummary(supabaseAdmin, storeId);
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
  return {
    id: row.id,
    hostname: row.hostname,
    status: row.status,
    isPrimary: row.is_primary,
    isActive: row.status === "active" && row.vercel_verified && !row.vercel_misconfigured,
    vercelVerified: row.vercel_verified,
    vercelMisconfigured: row.vercel_misconfigured,
    configuredBy: row.configured_by,
    verificationRecords: row.verification_records ?? [],
    dnsRecords: row.dns_records ?? [],
    lastError: row.last_vercel_error,
    lastCheckedAt: row.last_checked_at,
    activatedAt: row.activated_at,
    isWwwDomain: row.is_www_domain,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function addOrFetchProjectDomain(hostname: string) {
  try {
    return await domainRouteDeps.addProjectDomain(hostname);
  } catch (error) {
    const status = error instanceof Error && "status" in error
      ? Number((error as { status?: number }).status)
      : null;

    if (status === 409) {
      return domainRouteDeps.getProjectDomain(hostname);
    }

    throw error;
  }
}

async function syncHostnameStatus(
  supabaseAdmin: SupabaseClient,
  hostname: string,
  now = domainRouteDeps.now(),
) {
  let projectDomain: VercelProjectDomain;

  try {
    projectDomain = await domainRouteDeps.getProjectDomain(hostname);
  } catch (error) {
    const updated = await updateStoreDomain(supabaseAdmin, hostname, {
      status: "failed",
      last_vercel_error: asJson({ message: error instanceof Error ? error.message : "Failed to fetch Vercel domain" }),
      last_checked_at: now,
    });

    return serializeDomain(updated);
  }

  if (!projectDomain.verified) {
    try {
      projectDomain = await domainRouteDeps.verifyProjectDomain(hostname);
    } catch (error) {
      await updateStoreDomain(supabaseAdmin, hostname, {
        last_vercel_error: asJson({ message: error instanceof Error ? error.message : "Domain verification failed" }),
        last_checked_at: now,
      });
    }
  }

  const configuration = await domainRouteDeps.getDomainConfiguration(hostname);
  const normalized = domainRouteDeps.normalizeDomainInput(hostname);
  const verification = projectDomain.verification ?? [];
  const dnsRecords = buildVercelDnsInstructions(hostname, normalized.apexDomain, configuration, verification);
  const status = deriveStoreDomainStatus(projectDomain.verified, configuration.misconfigured);

  const updated = await updateStoreDomain(supabaseAdmin, hostname, {
    status,
    vercel_verified: projectDomain.verified,
    vercel_misconfigured: configuration.misconfigured,
    configured_by: configuration.configuredBy,
    verification_records: verification,
    dns_records: dnsRecords,
    last_vercel_error: null,
    last_checked_at: now,
    activated_at: status === "active" ? now : null,
  });

  return serializeDomain(updated);
}

async function configureApexRedirect(
  supabaseAdmin: SupabaseClient,
  storeId: string,
  hostname: string,
) {
  const { apexHostname, wwwHostname, defaultPrimaryHostname, redirectHostname } = domainRouteDeps.getDomainPair(hostname);

  const domains = await loadStoreDomains(supabaseAdmin, storeId);
  const domainMap = new Map(domains.map((domain) => [domain.hostname, domain]));
  const primaryHostname = domainMap.get(defaultPrimaryHostname)?.status === "active"
    ? defaultPrimaryHostname
    : hostname;

  await clearOtherPrimaryFlags(supabaseAdmin, storeId, primaryHostname);
  await updateStoreDomain(supabaseAdmin, primaryHostname, { is_primary: true });
  await supabaseAdmin.from("stores").update({ custom_domain: primaryHostname }).eq("id", storeId);

  if (redirectHostname && domainMap.has(redirectHostname) && primaryHostname === wwwHostname) {
    await domainRouteDeps.updateProjectDomain(apexHostname, {
      redirect: wwwHostname,
      redirectStatusCode: 308,
    });

    await updateStoreDomain(supabaseAdmin, apexHostname, {
      dns_records: [
        ...(domainMap.get(apexHostname)?.dns_records ?? []),
        buildRedirectInstruction(apexHostname, wwwHostname),
      ],
    });
  }
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
      return NextResponse.json({
        store,
        domains: domains.map(serializeDomain),
      });
    }

    if (!rawDomain) {
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    const normalized = domainRouteDeps.normalizeDomainInput(rawDomain);
    const projectDomain = await domainRouteDeps.getProjectDomain(normalized.hostname);
    const configuration = await domainRouteDeps.getDomainConfiguration(normalized.hostname);

    return NextResponse.json({
      hostname: normalized.hostname,
      verified: projectDomain.verified,
      misconfigured: configuration.misconfigured,
      status: deriveStoreDomainStatus(projectDomain.verified, configuration.misconfigured),
      configuredBy: configuration.configuredBy,
      verificationRecords: projectDomain.verification ?? [],
      dnsRecords: buildVercelDnsInstructions(
        normalized.hostname,
        normalized.apexDomain,
        configuration,
        projectDomain.verification ?? [],
      ),
    });
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

    const normalized = domainRouteDeps.normalizeDomainInput(rawDomain);
    const { apexHostname, wwwHostname, defaultPrimaryHostname } = domainRouteDeps.getDomainPair(normalized);

    const hostnamesToAdd = normalized.isApexDomain 
      ? [apexHostname, wwwHostname]
      : [normalized.hostname];

    for (const hostname of hostnamesToAdd) {
      const available = await ensureHostnameAvailable(access.supabaseAdmin, storeId, hostname);
      if (!available) {
        return NextResponse.json({ error: "Domain is already connected to another store" }, { status: 409 });
      }
    }

    const createdDomains: StoreDomainRow[] = [];

    for (const hostname of hostnamesToAdd) {
      const projectDomain = await addOrFetchProjectDomain(hostname);
      const configuration = await domainRouteDeps.getDomainConfiguration(hostname);
      const verification = projectDomain.verification ?? [];
      const dnsRecords = buildVercelDnsInstructions(hostname, normalized.apexDomain, configuration, verification);
      const status = deriveStoreDomainStatus(projectDomain.verified, configuration.misconfigured);

      const domainRow = await upsertStoreDomain(access.supabaseAdmin, {
        store_id: storeId,
        hostname,
        status,
        is_primary: hostname === defaultPrimaryHostname,
        is_www_domain: hostname === wwwHostname,
        vercel_verified: projectDomain.verified,
        vercel_misconfigured: configuration.misconfigured,
        configured_by: configuration.configuredBy,
        verification_records: verification,
        dns_records: dnsRecords,
        last_vercel_error: null,
        last_checked_at: domainRouteDeps.now(),
        activated_at: status === "active" ? domainRouteDeps.now() : null,
      });

      createdDomains.push(domainRow);
    }

    let warning: string | null = null;
    try {
      await configureApexRedirect(access.supabaseAdmin, storeId, normalized.hostname);
    } catch (error) {
      warning = error instanceof Error
        ? error.message
        : "The domain was added, but redirect setup still needs attention.";
    }

    const refreshed = await loadStoreDomains(access.supabaseAdmin, storeId);
    const store = await loadStoreSummary(access.supabaseAdmin, storeId);
    return NextResponse.json({
      success: true,
      store,
      domains: refreshed.map(serializeDomain),
      primaryHostname: defaultPrimaryHostname,
      warning,
    });
  } catch (error) {
    if (storeId) {
      try {
        const supabaseAdmin = domainRouteDeps.getSupabaseAdminClient();
        const domains = await loadStoreDomains(supabaseAdmin, storeId);

        if (domains.length > 0) {
          const store = await loadStoreSummaryByServiceRole(storeId);
          return NextResponse.json({
            success: true,
            store,
            domains: domains.map(serializeDomain),
            warning: error instanceof Error
              ? error.message
              : "The domain was added, but some follow-up configuration still needs attention.",
          });
        }
      } catch {
        // If recovery fails, return the original error response below.
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update custom domain",
        vercel: getVercelConfigDebug(),
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

    const normalized = domainRouteDeps.normalizeDomainInput(rawDomain);

    if (action === "check") {
      const domain = await syncHostnameStatus(access.supabaseAdmin, normalized.hostname);
      if (domain.isActive) {
        await configureApexRedirect(access.supabaseAdmin, storeId, normalized.hostname);
      }
      const store = await loadStoreSummary(access.supabaseAdmin, storeId);
      return NextResponse.json({ success: true, store, domain });
    }

    if (action === "make-primary") {
      const domains = await loadStoreDomains(access.supabaseAdmin, storeId);
      const selected = domains.find((domain) => domain.hostname === normalized.hostname);

      if (!selected) {
        return NextResponse.json({ error: "Domain not found" }, { status: 404 });
      }

      if (!(selected.status === "active" && selected.vercel_verified && !selected.vercel_misconfigured)) {
        return NextResponse.json({ error: "Only active domains can become primary" }, { status: 409 });
      }

      await clearOtherPrimaryFlags(access.supabaseAdmin, storeId, normalized.hostname);
      const updated = await updateStoreDomain(access.supabaseAdmin, normalized.hostname, { is_primary: true });

      await access.supabaseAdmin
        .from("stores")
        .update({ custom_domain: normalized.hostname })
        .eq("id", storeId);

      if (!selected.is_www_domain) {
        const domainPair = domainRouteDeps.getDomainPair(normalized.hostname);
        if (domainPair.redirectHostname) {
          await domainRouteDeps.updateProjectDomain(domainPair.redirectHostname, {
            redirect: normalized.hostname,
            redirectStatusCode: 308,
          });
        }
      }

      return NextResponse.json({ success: true, domain: serializeDomain(updated) });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update domain",
        vercel: getVercelConfigDebug(),
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

    const normalized = domainRouteDeps.normalizeDomainInput(rawDomain);
    const domainPair = domainRouteDeps.getDomainPair(normalized.hostname);

    for (const hostname of [domainPair.apexHostname, domainPair.wwwHostname]) {
      try {
        await domainRouteDeps.removeProjectDomain(hostname);
      } catch {
        // Let the DB cleanup continue even if Vercel already detached one hostname.
      }
    }

    const { error } = await access.supabaseAdmin
      .from("store_domains")
      .delete()
      .eq("store_id", storeId)
      .in("hostname", [domainPair.apexHostname, domainPair.wwwHostname]);

    if (error) throw error;

    // Clear custom_domain if it matches the removed domain
    await access.supabaseAdmin
      .from("stores")
      .update({ custom_domain: null })
      .eq("id", storeId)
      .in("custom_domain", [domainPair.apexHostname, domainPair.wwwHostname]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove custom domain" },
      { status: 500 },
    );
  }
}
