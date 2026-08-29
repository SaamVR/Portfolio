import { describe, expect, it } from "vitest";
import {
  getTrustedAuditIp,
  parseClientAuditPayload,
  resolvePlatformAuditRole,
} from "./route";

describe("platform audit route contract", () => {
  it("accepts only the governed browser audit event shape", () => {
    expect(parseClientAuditPayload({
      action: "exit_impersonate_merchant",
      targetType: "store",
      targetId: "store-1",
      actorId: "forged-user",
      actorRole: "super_admin",
      details: { store_name: "Demo", password: "nope" },
    })).toEqual({
      action: "exit_impersonate_merchant",
      targetType: "store",
      targetId: "store-1",
      details: { store_name: "Demo", password: "[redacted]" },
    });
  });

  it("rejects unknown actions, wrong target types and missing durable targets", () => {
    expect(parseClientAuditPayload({ action: "anything", targetType: "store", targetId: "1" })).toBeNull();
    expect(parseClientAuditPayload({ action: "exit_impersonate_merchant", targetType: "user", targetId: "1" })).toBeNull();
    expect(parseClientAuditPayload({ action: "exit_impersonate_merchant", targetType: "store" })).toBeNull();
  });

  it("resolves only current platform audit roles with deterministic priority", () => {
    expect(resolvePlatformAuditRole([{ role: "support_agent" }, { role: "admin" }])).toBe("admin");
    expect(resolvePlatformAuditRole([{ role: "merchant" }])).toBeNull();
  });

  it("uses only Vercel-managed forwarding metadata for request IP", () => {
    expect(getTrustedAuditIp(new Request("https://example.test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-forwarded-for": "198.51.100.20",
      },
    }))).toBe("203.0.113.10");

    expect(getTrustedAuditIp(new Request("https://example.test", {
      headers: { "x-forwarded-for": "198.51.100.20" },
    }))).toBeNull();
  });
});
