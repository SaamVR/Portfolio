export type DomainRoutingRecord = {
  storeSlug: string;
  updatedAt?: string | null;
};

export type DomainRoutingKvSyncPayload = {
  hostname: string;
  storeSlug: string;
  isActive: boolean;
  isPrimary: boolean;
  source: "domain-created" | "domain-checked" | "domain-primary" | "domain-deleted";
};

export interface DomainRoutingKvAdapter {
  get(hostname: string): Promise<DomainRoutingRecord | null>;
  set(payload: DomainRoutingKvSyncPayload): Promise<void>;
  delete(hostname: string): Promise<void>;
}

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function buildRoutingKey(hostname: string) {
  return `domain:${normalizeHostname(hostname)}`;
}

function getCloudflareKvConfigState() {
  const values = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || null,
    namespaceId: process.env.CLOUDFLARE_DOMAIN_ROUTING_KV_NAMESPACE_ID?.trim() || null,
    token: process.env.CLOUDFLARE_API_TOKEN?.trim() || null,
  };

  const missing = [
    !values.accountId ? "CLOUDFLARE_ACCOUNT_ID" : null,
    !values.namespaceId ? "CLOUDFLARE_DOMAIN_ROUTING_KV_NAMESPACE_ID" : null,
    !values.token ? "CLOUDFLARE_API_TOKEN" : null,
  ].filter((value): value is string => Boolean(value));

  if (missing.length === 3) {
    return { state: "disabled" as const };
  }

  if (missing.length > 0) {
    return { state: "misconfigured" as const, missing };
  }

  return {
    state: "configured" as const,
    config: {
      accountId: values.accountId as string,
      namespaceId: values.namespaceId as string,
      token: values.token as string,
    },
  };
}

async function cloudflareKvRequest(
  config: { accountId: string; namespaceId: string; token: string },
  key: string,
  init?: RequestInit,
) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}/values/${encodeURIComponent(key)}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      ...init?.headers,
    },
    cache: "no-store",
  });
}

class CloudflareDomainRoutingKvAdapter implements DomainRoutingKvAdapter {
  constructor(private readonly config: { accountId: string; namespaceId: string; token: string }) {}

  async get(hostname: string) {
    const response = await cloudflareKvRequest(this.config, buildRoutingKey(hostname), {
      method: "GET",
    });

    if (!response) {
      return null;
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Cloudflare KV read failed with status ${response.status}.`);
    }

    const raw = await response.text();
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as DomainRoutingRecord;
    if (!parsed?.storeSlug) {
      return null;
    }

    return parsed;
  }

  async set(payload: DomainRoutingKvSyncPayload) {
    const response = await cloudflareKvRequest(this.config, buildRoutingKey(payload.hostname), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storeSlug: payload.storeSlug,
        isActive: payload.isActive,
        isPrimary: payload.isPrimary,
        source: payload.source,
        updatedAt: new Date().toISOString(),
      }),
    });

    if (!response || !response.ok) {
      throw new Error(`Cloudflare KV write failed${response ? ` with status ${response.status}` : ""}.`);
    }
  }

  async delete(hostname: string) {
    const response = await cloudflareKvRequest(this.config, buildRoutingKey(hostname), {
      method: "DELETE",
    });

    if (!response || response.status === 404) {
      return;
    }

    if (!response.ok) {
      throw new Error(`Cloudflare KV delete failed with status ${response.status}.`);
    }
  }
}

class NoopDomainRoutingKvAdapter implements DomainRoutingKvAdapter {
  async get(_hostname: string) {
    return null;
  }

  async set(_payload: DomainRoutingKvSyncPayload) {
    // Local/test deployments may intentionally run without Cloudflare KV.
  }

  async delete(_hostname: string) {
    // Local/test deployments may intentionally run without Cloudflare KV.
  }
}

class MisconfiguredDomainRoutingKvAdapter implements DomainRoutingKvAdapter {
  constructor(private readonly missing: string[]) {}

  private configurationError() {
    return new Error(`Cloudflare domain routing KV is misconfigured. Missing: ${this.missing.join(", ")}.`);
  }

  async get(_hostname: string): Promise<DomainRoutingRecord | null> {
    throw this.configurationError();
  }

  async set(_payload: DomainRoutingKvSyncPayload) {
    throw this.configurationError();
  }

  async delete(_hostname: string) {
    throw this.configurationError();
  }
}

function createDefaultDomainRoutingKvAdapter(): DomainRoutingKvAdapter {
  const state = getCloudflareKvConfigState();
  if (state.state === "configured") {
    return new CloudflareDomainRoutingKvAdapter(state.config);
  }
  if (state.state === "misconfigured") {
    return new MisconfiguredDomainRoutingKvAdapter(state.missing);
  }
  return new NoopDomainRoutingKvAdapter();
}

let adapter: DomainRoutingKvAdapter = createDefaultDomainRoutingKvAdapter();

export function getDomainRoutingKvAdapter() {
  return adapter;
}

export function setDomainRoutingKvAdapter(nextAdapter: DomainRoutingKvAdapter) {
  adapter = nextAdapter;
}
