import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parse } from "tldts";
import { getDomainRoutingKvAdapter } from "@/lib/domain-routing-kv";
import {
  STORE_PREVIEW_SLUG_HEADER,
  STORE_PREVIEW_TOKEN_HEADER,
  STORE_PREVIEW_TTL_SECONDS,
  getStorePreviewCookieName,
} from "@/lib/cms/store-preview-constants";
import { getEzcomoRequestHostname, getEzcomoRequestStoreSlug } from "@/lib/platform/request-host";
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

function shouldLookupCustomDomain(hostname: string, env: RoutingEnv = process.env) {
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return false;
  }

  if (resolveSubdomainStoreSlug(hostname, env)) {
    return false;
  }

  if (getBaseDomains(env).includes(hostname)) {
    return false;
  }

  const parsed = parse(hostname);
  if (parsed.isIp || !parsed.isIcann || !parsed.hostname || !parsed.domain) {
    return false;
  }

  return true;
}

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
    select: "store:stores!inner(slug,is_published)",
    hostname: `eq.${hostname}`,
    status: "eq.active",
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/store_domains?${query.toString()}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    next: { revalidate: 300 },
    ...init,
  });

  if (!response.ok) {
    return null;
  }

  const domains = (await response.json()) as Array<{ store?: { slug?: string; is_published?: boolean } }>;
  if (domains[0]?.store?.is_published === false) {
    return null;
  }

  return domains[0]?.store?.slug ?? null;
}

export async function resolveCustomDomainStoreSlug(
  hostname: string,
  lookupStoreSlug: StoreSlugLookup = fetchStoreSlugByCustomDomain,
) {
  if (!shouldLookupCustomDomain(hostname)) {
    return null;
  }

  try {
    const kvRecord = await getDomainRoutingKvAdapter().get(hostname);
    if (kvRecord?.storeSlug) {
      return kvRecord.storeSlug;
    }
  } catch {
    // Fall back to the primary source of truth when KV is unavailable.
  }

  return lookupStoreSlug(hostname, { next: { revalidate: 300 } });
}

export async function resolveStoreSlug(
  hostname: string,
  resolveCustomDomain: (hostname: string) => Promise<string | null> = resolveCustomDomainStoreSlug,
) {
  const subdomainSlug = resolveSubdomainStoreSlug(hostname);
  if (subdomainSlug) {
    return subdomainSlug;
  }

  if (!shouldLookupCustomDomain(hostname)) {
    return null;
  }

  return resolveCustomDomain(hostname);
}

const BYPASSED_PREFIXES = /^\/(_next|api|admin|auth|plans|signup|stores|bkash|payment)/;
const BRAND_SEO_PREFIXES = /^\/(apple|manifest-icon|masked-icon|logo|site\.webmanifest)/;
const BYPASSED_EXACT = new Set(["/favicon.ico", "/robots.txt", "/sitemap.xml", "/manifest.json"]);

export function getStoreSlugFromStorefrontPath(pathname: string) {
  const match = pathname.match(/^\/stores\/([^/]+)(?:\/|$)/);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function applyPreviewResponseSecurity(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function resolveStorefrontPreviewResponse(request: NextRequest) {
  const storeSlug = getStoreSlugFromStorefrontPath(request.nextUrl.pathname);
  if (!storeSlug) return null;

  const cookieName = getStorePreviewCookieName(storeSlug);
  const explicitPreviewToken = request.nextUrl.searchParams.get("preview")?.trim() || null;
  const cookiePreviewToken = request.cookies.get(cookieName)?.value?.trim() || null;
  const previewToken = explicitPreviewToken ?? cookiePreviewToken;
  if (!previewToken) return null;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(STORE_PREVIEW_TOKEN_HEADER, previewToken);
  requestHeaders.set(STORE_PREVIEW_SLUG_HEADER, storeSlug);

  let response: NextResponse;
  if (explicitPreviewToken) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set(cookieName, explicitPreviewToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: STORE_PREVIEW_TTL_SECONDS,
    });
  } else {
    const url = request.nextUrl.clone();
    url.searchParams.set("preview", previewToken);
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return applyPreviewResponseSecurity(response);
}

export function isBypassedPath(pathname: string, isStoreDomain: boolean) {
  if (BYPASSED_PREFIXES.test(pathname)) {
    return true;
  }

  if (isStoreDomain) {
    return false;
  }

  return BYPASSED_EXACT.has(pathname) || BRAND_SEO_PREFIXES.test(pathname);
}

export function getTenantRewritePath(storeSlug: string, pathname: string) {
  return pathname === "/" ? `/stores/${storeSlug}` : `/stores/${storeSlug}${pathname}`;
}

export async function proxy(request: NextRequest) {
  const previewResponse = resolveStorefrontPreviewResponse(request);
  if (previewResponse) {
    return previewResponse;
  }

  const hostname = getEzcomoRequestHostname(request);
  if (!hostname) {
    return NextResponse.next();
  }

  const trustedStoreSlug = getEzcomoRequestStoreSlug(request);
  const storeSlug = trustedStoreSlug ?? await resolveStoreSlug(hostname);
  if (!storeSlug) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (isBypassedPath(pathname, true)) {
    return NextResponse.next();
  }

  const destinationPath = getTenantRewritePath(storeSlug, pathname);
  const url = request.nextUrl.clone();
  url.pathname = destinationPath;
  url.search = search;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|mp4|webm|pdf)$).*)",
  ],
};
