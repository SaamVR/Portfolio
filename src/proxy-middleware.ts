import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCmsRootDomain, getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";

export function normalizeHost(host?: string | null) {
  if (!host) return null;

  const trimmed = host.split(",")[0]?.trim() ?? host;
  return trimmed.replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0]?.toLowerCase() ?? null;
}

type RoutingEnv = Record<string, string | undefined>;

export function getBaseDomains(env: RoutingEnv = process.env) {
  const configured = [
    getCmsRootDomain(env),
    getStoreSubdomainBaseDomain(env),
    env.SITE_URL,
    env.NEXT_PUBLIC_SITE_URL,
  ]
    .map(normalizeHost)
    .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

  // Always include localhost as a base domain for local development
  if (!configured.includes("localhost")) {
    configured.push("localhost");
  }

  return configured;
}

export function resolveSubdomainStoreSlug(hostname: string, env: RoutingEnv = process.env) {
  for (const baseDomain of getBaseDomains(env)) {
    if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
      return null;
    }

    if (hostname.endsWith(`.${baseDomain}`)) {
      const slug = hostname.slice(0, -(baseDomain.length + 1));
      if (slug && !slug.includes(".")) {
        return slug;
      }
    }
  }

  return null;
}

type StoreSlugLookup = (hostname: string, init?: RequestInit & { next?: { revalidate?: number } }) => Promise<string | null>;

async function fetchStoreSlugByCustomDomain(
  hostname: string,
  init?: RequestInit & { next?: { revalidate?: number } },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const query = new URLSearchParams({
    select: "slug",
    custom_domain: `eq.${hostname}`,
    is_published: "eq.true",
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/stores?${query.toString()}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    next: { revalidate: 300 }, // Cache for 5 minutes to prevent database connection exhaustion
    ...init,
  });

  if (!response.ok) {
    return null;
  }

  const stores = (await response.json()) as Array<{ slug?: string }>;
  return stores[0]?.slug ?? null;
}

export async function resolveCustomDomainStoreSlug(
  hostname: string,
  lookupStoreSlug: StoreSlugLookup = fetchStoreSlugByCustomDomain,
) {
  const cached = await lookupStoreSlug(hostname, { next: { revalidate: 300 } });
  if (cached) {
    return cached;
  }

  // Fresh retry so newly verified domains can start routing without waiting
  // for the full cached lookup window to expire.
  return lookupStoreSlug(hostname, { cache: "no-store" });
}

export async function resolveStoreSlug(
  hostname: string,
  resolveCustomDomain: (hostname: string) => Promise<string | null> = resolveCustomDomainStoreSlug,
) {
  const subdomainSlug = resolveSubdomainStoreSlug(hostname);
  if (subdomainSlug) {
    return subdomainSlug;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  return resolveCustomDomain(hostname);
}

const BYPASSED_PREFIXES = /^\/(_next|api|admin|auth|plans|signup|stores|bkash|apple|manifest-icon|masked-icon|logo|site\.webmanifest)/;
const BYPASSED_EXACT = new Set(["/favicon.ico", "/robots.txt", "/sitemap.xml", "/manifest.json"]);

export function isBypassedPath(pathname: string) {
  return BYPASSED_EXACT.has(pathname) || BYPASSED_PREFIXES.test(pathname);
}

export function getTenantRewritePath(storeSlug: string, pathname: string) {
  return pathname === "/" ? `/stores/${storeSlug}` : `/stores/${storeSlug}${pathname}`;
}

export async function proxy(request: NextRequest) {
  const hostname = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  if (!hostname) {
    return NextResponse.next();
  }

  const storeSlug = await resolveStoreSlug(hostname);
  if (!storeSlug) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  // Rewrite ALL paths on a store subdomain to /stores/[slug]/[...path]
  const destinationPath = getTenantRewritePath(storeSlug, pathname);

  const url = request.nextUrl.clone();
  url.pathname = destinationPath;
  url.search = search;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
