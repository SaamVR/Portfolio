import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  recordCaughtIncident,
  recordPlatformIncident,
  sanitizeIncidentMetadata,
  sanitizeIncidentText,
} from "./incident-logger";

test("incident sanitizer recursively redacts secret keys and credential-bearing strings", () => {
  const sanitized = sanitizeIncidentMetadata({
    store_id: "store-1",
    authorization: "Bearer header-secret-value",
    nested: {
      client_secret: "client-secret-value",
      safe: "visible",
      database_url: "postgresql://postgres:db-password@db.example.test/postgres?access_token=query-secret",
      jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlMTIzNDU2",
    },
    list: [{ api_key: "api-secret-value", provider: "bkash" }],
    error: new Error("Authorization: Bearer nested-error-secret"),
  });

  const serialized = JSON.stringify(sanitized);
  assert.equal(sanitized.authorization, "[redacted]");
  assert.match(serialized, /\[redacted\]/);
  assert.doesNotMatch(serialized, /header-secret-value|client-secret-value|db-password|query-secret|api-secret-value|nested-error-secret/);
  assert.doesNotMatch(serialized, /eyJhbGciOiJIUzI1NiJ9/);
  assert.doesNotMatch(serialized, /\"stack\"/);
  assert.match(serialized, /visible/);
});

test("incident sanitizer bounds depth, breadth, strings, and final metadata bytes", () => {
  const oversized: Record<string, unknown> = Object.fromEntries(
    Array.from({ length: 80 }, (_, index) => [`key_${index}`, "x".repeat(2_000)]),
  );
  oversized.deep = { a: { b: { c: { d: { e: "too-deep" } } } } };

  const sanitized = sanitizeIncidentMetadata(oversized);
  const serialized = JSON.stringify(sanitized);
  assert.ok(new TextEncoder().encode(serialized).byteLength <= 8 * 1_024);
  assert.match(serialized, /\[truncated\]/);
  assert.ok(Object.keys(sanitized).length <= 31);
});

test("incident text scrubber removes bearer, jwt, credential-url, query-token, and plain error-object values", () => {
  const safe = sanitizeIncidentText(
    "Bearer bearer-secret-123456 postgresql://user:db-secret@db.example.test/postgres?token=url-secret eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlMTIzNDU2",
    4_000,
  );
  const objectMessage = sanitizeIncidentText({ message: "Authorization: Bearer object-secret-value" });

  assert.doesNotMatch(safe, /bearer-secret-123456|db-secret|url-secret|eyJhbGciOiJIUzI1NiJ9/);
  assert.match(safe, /\[redacted/);
  assert.doesNotMatch(objectMessage, /object-secret-value/);
});

test("incident persistence receives only sanitized bounded payloads", async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { data: "incident-1", error: null };
    },
  } as unknown as SupabaseClient;

  const recorded = await recordPlatformIncident(client, {
    fingerprint: "provider-terminal-failure",
    severity: "warning",
    source: "provider",
    title: "Provider failed",
    message: "Authorization: Bearer top-secret-token-value",
    route: "/api/provider?access_token=query-secret",
    storeId: "store-1",
    requestId: "request-1",
    metadata: { secret_payload: { password: "hidden" }, safe: "visible" },
  });

  assert.equal(recorded, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.fn, "record_platform_incident");
  assert.equal(calls[0]?.args.p_fingerprint, "provider-terminal-failure:store-1");
  const serialized = JSON.stringify(calls[0]?.args);
  assert.doesNotMatch(serialized, /top-secret-token-value|query-secret|hidden/);
  assert.match(serialized, /visible/);
});

test("hostile metadata cannot escape the best-effort incident boundary", async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { data: "incident-2", error: null };
    },
  } as unknown as SupabaseClient;
  const hostile = new Proxy({}, {
    ownKeys() {
      throw new Error("authorization=hostile-secret-value");
    },
  }) as Record<string, unknown>;

  const recorded = await recordPlatformIncident(client, {
    fingerprint: "hostile-metadata",
    severity: "warning",
    source: "test",
    title: "Hostile metadata",
    message: "safe",
    metadata: hostile,
  });

  assert.equal(recorded, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.args.p_metadata, { _sanitization_error: "[truncated]" });
  assert.doesNotMatch(JSON.stringify(calls[0]?.args), /hostile-secret-value/);
});

test("incident persistence failure never escapes or logs raw secrets", async () => {
  const client = {
    rpc: async () => ({ data: null, error: new Error("Bearer persistence-secret-value") }),
  } as unknown as SupabaseClient;

  const originalError = console.error;
  const logs: string[] = [];
  console.error = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    const recorded = await recordCaughtIncident(client, {
      fingerprint: "test-failure",
      severity: "warning",
      source: "test",
      title: "Test failure",
      error: new Error("password=route-secret-value"),
      metadata: { authorization: "Bearer metadata-secret-value" },
    });
    assert.equal(recorded, false);
  } finally {
    console.error = originalError;
  }

  const serializedLogs = logs.join("\n");
  assert.doesNotMatch(serializedLogs, /persistence-secret-value|route-secret-value|metadata-secret-value/);
});
