const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

type CloudflareError = {
  message?: string;
};

type CloudflareResponse<T> = {
  success?: boolean;
  errors?: CloudflareError[];
  result?: T;
};

export type CloudflareCustomHostname = {
  id: string;
  hostname: string;
  status: string;
  ssl?: {
    status?: string;
    validation_errors?: Array<{
      message?: string;
    }>;
  };
  ownership_verification?: {
    type?: string;
    name?: string;
    value?: string;
  };
  verification_errors?: string[];
};

function requireCloudflareConfig() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !token) {
    throw new Error("Cloudflare configuration is missing.");
  }

  return { zoneId, token };
}

async function parseCloudflareResponse<T>(response: Response): Promise<CloudflareResponse<T>> {
  return (await response.json().catch(() => ({}))) as CloudflareResponse<T>;
}

export function getCloudflareConfigDebug() {
  return {
    zoneId: process.env.CLOUDFLARE_ZONE_ID ?? null,
    hasToken: Boolean(process.env.CLOUDFLARE_API_TOKEN),
    cnameTarget: process.env.CUSTOM_DOMAIN_CNAME_TARGET ?? null,
  };
}

async function cloudflareRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { zoneId, token } = requireCloudflareConfig();

  const response = await fetch(`${CLOUDFLARE_API_BASE}/zones/${zoneId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const data = await parseCloudflareResponse<T>(response);

  if (!response.ok || !data.success) {
    const message = data.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join(", ") || "Cloudflare request failed.";
    const error = new Error(message) as Error & { status?: number; body?: CloudflareResponse<T> };
    error.status = response.status;
    error.body = data;
    throw error;
  }

  return data.result as T;
}

export async function createCloudflareCustomHostname(hostname: string) {
  return cloudflareRequest<CloudflareCustomHostname>("/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "http",
        type: "dv",
        bundle_method: "ubiquitous",
        wildcard: false,
        settings: {
          http2: "on",
          min_tls_version: "1.2",
          tls_1_3: "on",
        },
      },
    }),
  });
}

export async function getCloudflareCustomHostname(cloudflareHostnameId: string) {
  return cloudflareRequest<CloudflareCustomHostname>(
    `/custom_hostnames/${encodeURIComponent(cloudflareHostnameId)}`,
  );
}

export async function deleteCloudflareCustomHostname(cloudflareHostnameId: string) {
  return cloudflareRequest(`/custom_hostnames/${encodeURIComponent(cloudflareHostnameId)}`, {
    method: "DELETE",
  });
}

export function getCustomDomainCnameTarget() {
  return process.env.CUSTOM_DOMAIN_CNAME_TARGET || "customers.ezcomo.shop";
}
