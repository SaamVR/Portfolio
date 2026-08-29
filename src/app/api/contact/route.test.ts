import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildContactRateLimitKeys,
  buildContactRateLimitResponse,
  getContactRequestIp,
} from "./route";

const cleanupMigration = readFileSync(
  new URL("../../../../supabase/migrations/20260829115500_contact_server_boundary_175.sql", import.meta.url),
  "utf8",
);

const contactSource = readFileSync(
  new URL("../../../views/Contact.tsx", import.meta.url),
  "utf8",
);

describe("contact server boundary", () => {
  it("trusts only Vercel-managed forwarding metadata", () => {
    expect(getContactRequestIp(new Request("https://example.test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-forwarded-for": "198.51.100.20",
      },
    }))).toBe("203.0.113.10");

    expect(getContactRequestIp(new Request("https://example.test", {
      headers: { "x-forwarded-for": "198.51.100.20" },
    }))).toBeNull();
  });

  it("stores only hashed requester/email material in limiter identifiers", () => {
    const keys = buildContactRateLimitKeys("11111111-1111-4111-8111-111111111111", "USER@Example.com", "203.0.113.10");
    expect(keys.requester).not.toContain("203.0.113.10");
    expect(keys.email).not.toContain("user@example.com");
    expect(keys.requester).toContain("contact:requester:");
    expect(keys.email).toContain("contact:email:");
  });

  it("returns deterministic retry metadata from the latest blocked limiter", () => {
    const now = Date.now();
    const response = buildContactRateLimitResponse([
      { success: false, reset: now + 30_000 },
      { success: false, reset: now + 60_000 },
    ]);
    expect(response?.resetAt).toBe(now + 60_000);
    expect(response?.retryAfter).toBeGreaterThanOrEqual(59);
  });

  it("removes the direct browser insert boundary and transitional trigger", () => {
    expect(cleanupMigration).toContain('drop policy if exists "Anyone can create store contact messages"');
    expect(cleanupMigration).toContain("revoke insert on table public.contact_messages from anon, authenticated");
    expect(cleanupMigration).toContain("drop trigger if exists enforce_contact_message_rate_limit_trigger");
    expect(cleanupMigration).toContain("revoke execute on function public.check_contact_rate_limit(text)");
  });

  it("migrates the storefront client away from direct Supabase contact writes", () => {
    expect(contactSource).toContain('fetch("/api/contact"');
    expect(contactSource).not.toContain("check_contact_rate_limit");
    expect(contactSource).not.toContain('.from("contact_messages")');
  });
});
