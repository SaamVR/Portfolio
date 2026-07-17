import type { DomainRecordInstruction } from "@/lib/domains";

const VERCEL_API = "https://api.vercel.com";

function getServerEnv(name: "VERCEL_TOKEN" | "VERCEL_TEAM_ID" | "VERCEL_PROJECT_ID") {
  const fallbackName = name === "VERCEL_TOKEN" ? "VERCEL_API_TOKEN" : null;
  return process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
}

function getRequiredServerEnv(name: "VERCEL_TOKEN" | "VERCEL_PROJECT_ID") {
  const value = getServerEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface VercelVerificationChallenge {
  type: string;
  domain: string;
  value: string;
  reason?: string;
}

export interface VercelProjectDomain {
  name: string;
  apexName?: string | null;
  projectId?: string | null;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  verified: boolean;
  verification?: VercelVerificationChallenge[];
}

export interface VercelRecommendedRecord {
  rank: number;
  value: string;
}

export interface VercelDomainConfiguration {
  configuredBy: "A" | "CNAME" | "http" | "dns-01" | null;
  acceptedChallenges?: string[];
  recommendedIPv4: VercelRecommendedRecord[];
  recommendedCNAME: VercelRecommendedRecord[];
  misconfigured: boolean;
}

export interface VercelDomainErrorShape {
  error?: { message?: string; code?: string };
  message?: string;
}

export function getVercelConfigDebug() {
  const projectId = getServerEnv("VERCEL_PROJECT_ID") ?? null;
  const teamId = getServerEnv("VERCEL_TEAM_ID") ?? null;
  const token = getServerEnv("VERCEL_TOKEN");

  return {
    projectId,
    teamId,
    hasToken: Boolean(token),
  };
}

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as VercelDomainErrorShape | null;
}

function buildHeaders(initHeaders?: HeadersInit) {
  return {
    Authorization: `Bearer ${getRequiredServerEnv("VERCEL_TOKEN")}`,
    "Content-Type": "application/json",
    ...initHeaders,
  };
}

async function vercelRequest<T>(pathname: string, init: RequestInit = {}) {
  const url = new URL(pathname, VERCEL_API);
  const teamId = getServerEnv("VERCEL_TEAM_ID");

  if (teamId && !url.searchParams.has("teamId")) {
    url.searchParams.set("teamId", teamId);
  }

  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: buildHeaders(init.headers),
  });

  const body = await parseJson(response);

  if (!response.ok) {
    const message = body?.error?.message || body?.message || `Vercel API request failed with ${response.status}`;
    const debug = getVercelConfigDebug();
    const enrichedMessage = response.status === 404
      ? `${message}. Vercel project lookup used projectId=${debug.projectId ?? "missing"}, teamId=${debug.teamId ?? "none"}, hasToken=${debug.hasToken}. If you changed env vars recently, restart the Next.js server.`
      : message;

    const error = new Error(enrichedMessage) as Error & { status?: number; body?: VercelDomainErrorShape | null };
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body as T;
}

export async function addProjectDomain(hostname: string) {
  const projectId = getRequiredServerEnv("VERCEL_PROJECT_ID");
  return vercelRequest<VercelProjectDomain>(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });
}

export async function getProjectDomain(hostname: string) {
  const projectId = getRequiredServerEnv("VERCEL_PROJECT_ID");
  return vercelRequest<VercelProjectDomain>(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(hostname)}`);
}

export async function verifyProjectDomain(hostname: string) {
  const projectId = getRequiredServerEnv("VERCEL_PROJECT_ID");
  return vercelRequest<VercelProjectDomain>(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(hostname)}/verify`, {
    method: "POST",
  });
}

export async function updateProjectDomain(hostname: string, payload: { redirect?: string | null; redirectStatusCode?: number | null }) {
  const projectId = getRequiredServerEnv("VERCEL_PROJECT_ID");
  return vercelRequest<VercelProjectDomain>(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(hostname)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeProjectDomain(hostname: string) {
  const projectId = getRequiredServerEnv("VERCEL_PROJECT_ID");
  await vercelRequest(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(hostname)}`, {
    method: "DELETE",
    body: JSON.stringify({ removeRedirects: true }),
  });
}

export async function getDomainConfiguration(hostname: string) {
  const projectId = getRequiredServerEnv("VERCEL_PROJECT_ID");
  return vercelRequest<VercelDomainConfiguration>(
    `/v6/domains/${encodeURIComponent(hostname)}/config?projectIdOrName=${encodeURIComponent(projectId)}`,
  );
}

function pickRankOneValue(records: VercelRecommendedRecord[]) {
  return [...records].sort((left, right) => left.rank - right.rank)[0]?.value ?? null;
}

function getRecordLabel(hostname: string, apexDomain: string) {
  if (hostname === apexDomain) return "@";
  return hostname.slice(0, -(apexDomain.length + 1));
}

export function buildVercelDnsInstructions(
  hostname: string,
  apexDomain: string,
  configuration: VercelDomainConfiguration,
  verification: VercelVerificationChallenge[] = [],
): DomainRecordInstruction[] {
  const instructions: DomainRecordInstruction[] = verification.map((record) => ({
    type: record.type.toUpperCase(),
    name: record.domain,
    value: record.value,
    purpose: "verification",
  }));

  const label = getRecordLabel(hostname, apexDomain);
  const aValue = pickRankOneValue(configuration.recommendedIPv4);
  const cnameValue = pickRankOneValue(configuration.recommendedCNAME);

  if (hostname === apexDomain && aValue) {
    instructions.push({
      type: "A",
      name: label,
      value: aValue,
      purpose: "routing",
    });
  } else if (cnameValue) {
    instructions.push({
      type: "CNAME",
      name: label,
      value: cnameValue,
      purpose: "routing",
    });
  } else if (aValue) {
    instructions.push({
      type: "A",
      name: label,
      value: aValue,
      purpose: "routing",
    });
  }

  return instructions;
}
