import { NextResponse } from "next/server";
import { getCmsRootDomain, getPlatformSiteUrl, getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";

export const domainRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};

function normalizeDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function isValidDomain(domain: string) {
  if (domain.length > 253) return false;
  if (domain === "localhost" || domain.endsWith(".localhost")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return false;

  return /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain);
}

function configuredPlatformDomains() {
  return [
    getCmsRootDomain(),
    getStoreSubdomainBaseDomain(),
    getPlatformSiteUrl(),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeDomain);
}

function isPlatformDomain(domain: string) {
  return configuredPlatformDomains().some(
    (platformDomain) => domain === platformDomain || domain.endsWith(`.${platformDomain}`),
  );
}

async function requireDomainManager(req: Request, storeId: string) {
  const user = await domainRouteDeps.getAuthenticatedUser(req);
  if (!user) return null;

  const supabaseAdmin = domainRouteDeps.getSupabaseAdminClient();
  const authorized = await domainRouteDeps.canManageStore(supabaseAdmin, storeId, user.id, [
    "owner",
    "admin",
  ]);

  return authorized ? supabaseAdmin : null;
}

async function ensureDomainIsAvailable(storeId: string, domain: string) {
  const supabaseAdmin = domainRouteDeps.getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("custom_domain", domain)
    .neq("id", storeId)
    .maybeSingle();

  if (error) throw error;
  return !data;
}

export async function POST(req: Request) {
  try {
    const { storeId, domain: rawDomain } = await req.json();
    if (!storeId || !rawDomain) {
      return NextResponse.json({ error: "Missing storeId or domain" }, { status: 400 });
    }

    const domain = normalizeDomain(rawDomain);
    if (!isValidDomain(domain)) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    if (isPlatformDomain(domain)) {
      return NextResponse.json({ error: "Platform domains cannot be claimed" }, { status: 400 });
    }

    const supabaseAdmin = await requireDomainManager(req, storeId);
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domainAvailable = await ensureDomainIsAvailable(storeId, domain);
    if (!domainAvailable) {
      return NextResponse.json({ error: "Domain is already connected to another store" }, { status: 409 });
    }

    const vercelApiToken = process.env.VERCEL_API_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelApiToken || !vercelProjectId) {
      return NextResponse.json(
        { error: "Domain provisioning is not configured" },
        { status: 503 },
      );
    }

    const response = await domainRouteDeps.fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains`,
      {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
      },
    );

    const data = await response.json();
    if (!response.ok && response.status !== 409) {
      return NextResponse.json(
        { error: data.error?.message || "Failed to add domain to Vercel" },
        { status: response.status },
      );
    }

    const { error: dbError } = await supabaseAdmin
      .from("stores")
      .update({ custom_domain: domain })
      .eq("id", storeId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, verified: Boolean(data.verified), domain });
  } catch (error) {
    console.error("Domain API error:", error);
    return NextResponse.json({ error: "Failed to update custom domain" }, { status: 500 });
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

    const domain = normalizeDomain(rawDomain);
    const supabaseAdmin = await requireDomainManager(req, storeId);
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vercelApiToken = process.env.VERCEL_API_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelApiToken || !vercelProjectId) {
      return NextResponse.json(
        { error: "Domain provisioning is not configured" },
        { status: 503 },
      );
    }

    const response = await domainRouteDeps.fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
      {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${vercelApiToken}`,
      },
      },
    );

    if (!response.ok && response.status !== 404) {
      const data = await response.json();
      return NextResponse.json(
        { error: data.error?.message || "Failed to remove domain from Vercel" },
        { status: response.status },
      );
    }

    const { error: dbError } = await supabaseAdmin
      .from("stores")
      .update({ custom_domain: null })
      .eq("id", storeId)
      .eq("custom_domain", domain);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Domain delete error:", error);
    return NextResponse.json({ error: "Failed to remove custom domain" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawDomain = searchParams.get("domain");
    if (!rawDomain) {
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    const domain = normalizeDomain(rawDomain);
    if (!isValidDomain(domain)) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const vercelApiToken = process.env.VERCEL_API_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;
    if (!vercelApiToken || !vercelProjectId) {
      return NextResponse.json({ verified: false, configured: false });
    }

    const response = await domainRouteDeps.fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
      {
      headers: {
        Authorization: `Bearer ${vercelApiToken}`,
      },
      },
    );

    if (!response.ok) {
      return NextResponse.json({ verified: false, configured: true });
    }

    const data = await response.json();
    return NextResponse.json({ verified: Boolean(data.verified), configured: true });
  } catch (error) {
    console.error("Domain status error:", error);
    return NextResponse.json({ error: "Failed to check domain" }, { status: 500 });
  }
}
