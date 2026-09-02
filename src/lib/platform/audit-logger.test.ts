import { describe, expect, it } from "@/test/test-utils";
import { buildAuditLogPayload, sanitizeAuditDetails } from "./audit-logger";

describe("platform audit sanitization", () => {
  it("recursively redacts secret-like keys while preserving safe context", () => {
    expect(sanitizeAuditDetails({
      store_id: "store-1",
      nested: {
        accessToken: "should-not-survive",
        authorization: "Bearer secret",
        safe: "visible",
      },
      list: [{ client_secret: "hidden", provider: "bkash" }],
    })).toEqual({
      store_id: "store-1",
      nested: {
        accessToken: "[redacted]",
        authorization: "[redacted]",
        safe: "visible",
      },
      list: [{ client_secret: "[redacted]", provider: "bkash" }],
    });
  });

  it("bounds oversized strings and depth", () => {
    const safe = sanitizeAuditDetails({
      long: "x".repeat(700),
      a: { b: { c: { d: { e: { f: "too-deep" } } } } },
    });

    expect(String(safe.long)).toHaveLength(500);
    expect(safe.a).toBeTruthy();
    expect(JSON.stringify(safe)).toContain("[truncated]");
  });

  it("normalizes the existing platform role contract and records source role safely", () => {
    const payload = buildAuditLogPayload({
      actorId: "user-1",
      actorEmail: "operator@example.com",
      actorRole: "billing_admin",
      action: "approve_invoice",
      targetType: "invoice",
      targetId: "invoice-1",
      details: { api_key: "secret", reason: "manual review" },
    }, "2026-08-29T09:30:00.000Z");

    expect(payload.actor_id).toBe("user-1");
    expect(payload.actor_role).toBe("co_admin");
    expect(payload.details).toMatchObject({
      api_key: "[redacted]",
      reason: "manual review",
      actor_role_source: "billing_admin",
    });
    expect(payload.created_at).toBe("2026-08-29T09:30:00.000Z");
  });
});
