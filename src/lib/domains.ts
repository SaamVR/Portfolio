import { getDomain, parse } from "tldts";
import { getCmsRootDomain, getPlatformSiteUrl, getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";

export const STORE_DOMAIN_STATUSES = [
  "pending_vercel",
  "pending_verification",
  "pending_dns",
  "active",
  "misconfigured",
  "removing",
  "failed",
] as const;

export type StoreDomainStatus = (typeof STORE_DOMAIN_STATUSES)[number];

export interface DomainRecordInstruction {
  type: string;
  name: string;
  value: string;
  purpose: "verification" | "routing" | "redirect";
}

export interface NormalizedDomainInput {
  hostname: string;
  apexDomain: string;
  subdomainLabel: string | null;
  isApexDomain: boolean;
  isWwwDomain: boolean;
}

const RESERVED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeHost(value?: string | null) {
  if (!value) return null;

  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.replace(/\.$/, "") || null;
}

function getConfiguredPlatformDomains() {
  return [
    getCmsRootDomain(),
    getStoreSubdomainBaseDomain(),
    getPlatformSiteUrl(),
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
  ]
    .map(normalizeHost)
    .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);
}

function isIpAddress(hostname: string) {
  const parsed = parse(hostname);
  return parsed.isIp ?? false;
}

export function isPlatformHostname(hostname: string) {
  return getConfiguredPlatformDomains().some(
    (platformDomain) => hostname === platformDomain || hostname.endsWith(`.${platformDomain}`),
  );
}

export function normalizeDomainInput(input: string): NormalizedDomainInput {
  const raw = input.trim();
  if (!raw) {
    throw new Error("Enter a domain to connect.");
  }

  if (raw.includes("*")) {
    throw new Error("Wildcard domains are not supported.");
  }

  const withProtocol = raw.includes("://") ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Enter a valid domain.");
  }

  if (url.username || url.password) {
    throw new Error("Enter a valid domain.");
  }

  if (url.port) {
    throw new Error("Ports are not allowed in custom domains.");
  }

  const hostname = normalizeHost(url.hostname);
  if (!hostname) {
    throw new Error("Enter a valid domain.");
  }

  if (RESERVED_HOSTS.has(hostname) || hostname.endsWith(".localhost")) {
    throw new Error("Localhost domains cannot be connected.");
  }

  if (hostname.endsWith(".vercel.app")) {
    throw new Error("Vercel preview domains cannot be connected.");
  }

  if (isIpAddress(hostname)) {
    throw new Error("IP addresses cannot be connected as custom domains.");
  }

  if (isPlatformHostname(hostname)) {
    throw new Error("Platform domains cannot be claimed as custom domains.");
  }

  const parsed = parse(hostname);
  if (!parsed.isIcann || !parsed.hostname || !parsed.domain) {
    throw new Error("Enter a valid domain.");
  }

  const apexDomain = getDomain(hostname);
  if (!apexDomain) {
    throw new Error("Enter a valid domain.");
  }

  const subdomainLabel = parsed.subdomain || null;

  return {
    hostname,
    apexDomain,
    subdomainLabel,
    isApexDomain: hostname === apexDomain,
    isWwwDomain: subdomainLabel === "www",
  };
}

export function getRoutingDnsRecordName(input: string | NormalizedDomainInput) {
  const normalized = typeof input === "string" ? normalizeDomainInput(input) : input;
  if (normalized.isApexDomain) return "@";

  const apexSuffix = `.${normalized.apexDomain}`;
  if (!normalized.hostname.endsWith(apexSuffix)) return normalized.subdomainLabel ?? "@";

  return normalized.hostname.slice(0, -apexSuffix.length);
}

export function getDomainPair(input: string | NormalizedDomainInput) {
  const normalized = typeof input === "string" ? normalizeDomainInput(input) : input;
  const apexHostname = normalized.apexDomain;
  const wwwHostname = normalized.isApexDomain ? `www.${normalized.apexDomain}` : normalized.hostname;

  return {
    apexHostname,
    wwwHostname,
    // EZComo provisions exactly one hostname by default. The hostname the merchant
    // entered is canonical; www is a compatibility fallback, not an automatic pair.
    defaultPrimaryHostname: normalized.hostname,
    redirectHostname: null,
  };
}

export function deriveStoreDomainStatus(verified: boolean, misconfigured: boolean): StoreDomainStatus {
  if (!verified) {
    return "pending_verification";
  }

  if (misconfigured) {
    return "pending_dns";
  }

  return "active";
}

export function buildRedirectInstruction(sourceHostname: string, destinationHostname: string): DomainRecordInstruction {
  return {
    type: "HTTP",
    name: sourceHostname,
    value: `${sourceHostname} -> ${destinationHostname} (308)`,
    purpose: "redirect",
  };
}
