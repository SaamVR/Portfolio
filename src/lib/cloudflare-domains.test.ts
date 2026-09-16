import assert from "node:assert/strict";
import test from "node:test";
import { restartCloudflareCustomHostnameValidation } from "@/lib/cloudflare-domains";

test("restarts Cloudflare real-time validation with the existing HTTP DCV configuration", async () => {
  const originalFetch = globalThis.fetch;
  const originalZoneId = process.env.CLOUDFLARE_ZONE_ID;
  const originalToken = process.env.CLOUDFLARE_API_TOKEN;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  process.env.CLOUDFLARE_ZONE_ID = "zone_123";
  process.env.CLOUDFLARE_API_TOKEN = "token_123";
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json({
      success: true,
      result: {
        id: "cfh_123",
        hostname: "example.com",
        status: "pending",
        ssl: { status: "pending_validation" },
      },
    });
  };

  try {
    const result = await restartCloudflareCustomHostnameValidation("cfh_123");
    assert.equal(result.id, "cfh_123");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://api.cloudflare.com/client/v4/zones/zone_123/custom_hostnames/cfh_123");
    assert.equal(calls[0]?.init?.method, "PATCH");
    const headers = new Headers(calls[0]?.init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer token_123");
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
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
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalZoneId === undefined) delete process.env.CLOUDFLARE_ZONE_ID;
    else process.env.CLOUDFLARE_ZONE_ID = originalZoneId;
    if (originalToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = originalToken;
  }
});
